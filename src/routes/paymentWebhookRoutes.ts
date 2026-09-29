import { Router, Request, Response } from 'express';
import { execute, queryOne } from '../database/db';
import { paymentProviders } from '../payments/providers';

const router = Router();

// Handle generic webhook for providers with idempotency
async function handleWebhook(providerName: string, req: Request, res: Response) {
  try {
    const provider = paymentProviders[providerName];
    if (!provider) {
      res.status(404).json({ success: false, error: 'UNKNOWN_PROVIDER' });
      return;
    }

    const isValid = provider.verifyWebhook(req.headers, req.body);
    if (!isValid) {
      res.status(401).json({ success: false, error: 'INVALID_WEBHOOK_SIGNATURE' });
      return;
    }

    const parsed = await provider.processWebhook(req.body);
    const { orderId, transactionId, amount, status } = parsed;

    if (!transactionId) {
      res.status(400).json({ success: false, error: 'MISSING_TRANSACTION_ID' });
      return;
    }

    // IDEMPOTENCY CHECK: Check if transaction has already been credited
    const existingTx = await queryOne('SELECT id, status FROM wallet_transactions WHERE reference = ?', [transactionId]);
    if (existingTx) {
      // Already processed! Return success 200 without duplicate credit
      res.status(200).json({ success: true, message: 'Webhook already processed (Idempotent OK).' });
      return;
    }

    // Check matching topup
    const topup = await queryOne('SELECT * FROM topups WHERE reference_id = ? OR id = ?', [transactionId, orderId]);
    if (topup && topup.status === 'PENDING' && status === 'PAID') {
      const nowIso = new Date().toISOString();
      const creditsToAdd = topup.amount_credits;

      // Fetch user wallet
      const wallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [topup.user_id]);
      const balanceBefore = wallet ? wallet.balance : 0;
      const balanceAfter = balanceBefore + creditsToAdd;

      // Update wallet
      await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, nowIso, wallet.id]);

      // Record transaction
      await execute(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
         VALUES (?, 'TOP_UP', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
        [topup.user_id, creditsToAdd, balanceBefore, balanceAfter, transactionId, `Automatic ${providerName} verified top-up`, nowIso]
      );

      // Update topup
      await execute('UPDATE topups SET status = "APPROVED", reviewed_at = ? WHERE id = ?', [nowIso, topup.id]);

      // Notification
      await execute(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, 'Payment Confirmed!', ?, 'TOPUP', 0, '/wallet', ?)`,
        [topup.user_id, `${creditsToAdd} credits added via automatic ${providerName} confirmation.`, nowIso]
      );
    }

    res.status(200).json({ success: true, processed: true });
  } catch (err: any) {
    console.error(`[Webhook] ${providerName} error:`, err);
    res.status(500).json({ success: false, error: 'WEBHOOK_PROCESSING_FAILED' });
  }
}

router.post('/easypaisa/webhook', (req, res) => handleWebhook('EASYPAISA', req, res));
router.post('/jazzcash/webhook', (req, res) => handleWebhook('JAZZCASH', req, res));
router.post('/usdt/webhook', (req, res) => handleWebhook('USDT', req, res));

export default router;
