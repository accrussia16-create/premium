import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../database/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/wallet - Get wallet details
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const wallet = await queryOne('SELECT * FROM wallets WHERE user_id = ?', [userId]);

    // Summary statistics
    const stats = await queryOne(
      `SELECT 
        COALESCE(SUM(CASE WHEN type = 'TOP_UP' AND status = 'COMPLETED' THEN amount ELSE 0 END), 0) as total_deposited,
        COALESCE(SUM(CASE WHEN type = 'PURCHASE' AND status = 'COMPLETED' THEN ABS(amount) ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN type = 'BONUS' AND status = 'COMPLETED' THEN amount ELSE 0 END), 0) as total_bonus
       FROM wallet_transactions 
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      wallet: wallet || { balance: 0, currency: 'CREDITS' },
      stats: {
        total_deposited: stats?.total_deposited || 0,
        total_spent: stats?.total_spent || 0,
        total_bonus: stats?.total_bonus || 0
      }
    });
  } catch (err: any) {
    console.error('[Wallet] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/wallet/transactions - List wallet transactions
router.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const transactions = await queryAll(
      `SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      transactions
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/wallet/topup/manual - Submit manual topup (EasyPaisa, JazzCash, USDT)
router.post('/topup/manual', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { method, credits, reference_id, sender_info, notes, network, proof_url } = req.body;

    const creditAmount = Number(credits);
    if (!method || !creditAmount || creditAmount <= 0 || !reference_id) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Payment method, credit amount, and reference/transaction ID are required.'
      });
      return;
    }

    // Check duplicate reference ID
    const existing = await queryOne('SELECT id FROM topups WHERE reference_id = ?', [reference_id.trim()]);
    if (existing) {
      res.status(409).json({
        success: false,
        error: 'DUPLICATE_REFERENCE',
        message: 'A top-up request with this Reference ID has already been submitted.'
      });
      return;
    }

    // Calculate fiat equivalent (e.g. 1 Credit = 100 PKR or 1 USDT)
    let fiatAmount = creditAmount;
    let currency = 'PKR';
    if (method === 'USDT') {
      fiatAmount = creditAmount;
      currency = 'USDT';
    } else {
      fiatAmount = creditAmount * 100; // 1 Credit = 100 PKR
      currency = 'PKR';
    }

    const nowIso = new Date().toISOString();

    const topupRes = await execute(
      `INSERT INTO topups (
        user_id, method, amount_credits, amount_fiat, currency,
        sender_info, reference_id, proof_image_url, status, network, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [
        userId,
        method.toUpperCase(),
        creditAmount,
        fiatAmount,
        currency,
        sender_info?.trim() || null,
        reference_id.trim(),
        proof_url?.trim() || null,
        network || null,
        notes?.trim() || null,
        nowIso
      ]
    );

    // Audit notification
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Top-up Request Submitted', ?, 'TOPUP', 0, '/wallet', ?)`,
      [
        userId,
        `Your manual top-up request for ${creditAmount} credits via ${method} (Ref: ${reference_id}) is under review by admin.`,
        nowIso
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Top-up request submitted successfully! An administrator will review your payment.',
      topup_id: topupRes.lastInsertRowid,
      status: 'PENDING',
      reference_id
    });
  } catch (err: any) {
    console.error('[TopUp Manual] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/wallet/topup/simulate-auto - DEMO MODE INSTANT PAYMENT SIMULATOR
router.post('/topup/simulate-auto', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { method = 'EASYPAISA', credits = 50, outcome = 'SUCCESS' } = req.body;

    const creditAmount = Number(credits);
    if (!creditAmount || creditAmount <= 0) {
      res.status(400).json({ success: false, error: 'INVALID_AMOUNT' });
      return;
    }

    if (outcome === 'FAIL') {
      res.status(400).json({
        success: false,
        error: 'PAYMENT_FAILED_SIMULATION',
        message: '[DEMO MODE] Simulated payment declined by simulated gateway provider.'
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const simRef = `SIM-${method.substring(0, 3)}-${Date.now()}`;

    // 1. Fetch current wallet
    const wallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [userId]);
    const balanceBefore = wallet ? wallet.balance : 0;
    const balanceAfter = balanceBefore + creditAmount;

    // 2. Update wallet
    if (wallet) {
      await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, nowIso, wallet.id]);
    } else {
      await execute('INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, "CREDITS", ?)', [userId, creditAmount, nowIso]);
    }

    // 3. Record transaction
    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'TOP_UP', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [userId, creditAmount, balanceBefore, balanceAfter, simRef, `[DEMO MODE] Instant top-up via ${method} Simulator`, nowIso]
    );

    // 4. Record topup record as APPROVED
    await execute(
      `INSERT INTO topups (user_id, method, amount_credits, amount_fiat, currency, sender_info, reference_id, status, notes, created_at, reviewed_at)
       VALUES (?, ?, ?, ?, ?, 'Instant Demo Simulator', ?, 'APPROVED', 'Simulated instant automatic confirmation', ?, ?)`,
      [userId, method.toUpperCase(), creditAmount, method === 'USDT' ? creditAmount : creditAmount * 100, method === 'USDT' ? 'USDT' : 'PKR', simRef, nowIso, nowIso]
    );

    // 5. In-app notification
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Credits Added Successfully!', ?, 'TOPUP', 0, '/wallet', ?)`,
      [userId, `[DEMO MODE] ${creditAmount} credits have been added to your wallet via ${method}.`, nowIso]
    );

    res.json({
      success: true,
      message: `[DEMO MODE] Simulated instant payment verified! ${creditAmount} credits credited.`,
      balance: balanceAfter,
      credits_added: creditAmount,
      reference: simRef
    });
  } catch (err: any) {
    console.error('[Simulate Topup] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/wallet/gift - Send credits to another user
router.post('/gift', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.user!.id;
    const { recipient, amount, note } = req.body;

    const giftAmount = Number(amount);
    if (!recipient || !giftAmount || giftAmount <= 0) {
      res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Recipient username or email and positive amount are required.' });
      return;
    }

    // Find recipient
    const recipientUser = await queryOne(
      'SELECT id, username, email FROM users WHERE (LOWER(email) = ? OR LOWER(username) = ?) AND status = "ACTIVE"',
      [recipient.toLowerCase().trim(), recipient.toLowerCase().trim()]
    );

    if (!recipientUser) {
      res.status(404).json({ success: false, error: 'RECIPIENT_NOT_FOUND', message: 'Recipient user not found or inactive.' });
      return;
    }

    if (recipientUser.id === senderId) {
      res.status(400).json({ success: false, error: 'SELF_GIFT', message: 'You cannot send credits to yourself.' });
      return;
    }

    // Check sender wallet
    const senderWallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [senderId]);
    if (!senderWallet || senderWallet.balance < giftAmount) {
      res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Insufficient balance. You have ${senderWallet?.balance || 0} credits.`
      });
      return;
    }

    // Recipient wallet
    let recipientWallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [recipientUser.id]);

    const nowIso = new Date().toISOString();
    const refCode = `GIFT-${Date.now().toString(36).toUpperCase()}`;

    // 1. Deduct from sender
    const senderBefore = senderWallet.balance;
    const senderAfter = senderBefore - giftAmount;
    await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [senderAfter, nowIso, senderWallet.id]);

    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'GIFT', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [senderId, -giftAmount, senderBefore, senderAfter, refCode, `Gift sent to @${recipientUser.username}${note ? `: "${note}"` : ''}`, nowIso]
    );

    // 2. Add to recipient
    const recBefore = recipientWallet ? recipientWallet.balance : 0;
    const recAfter = recBefore + giftAmount;

    if (recipientWallet) {
      await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [recAfter, nowIso, recipientWallet.id]);
    } else {
      await execute('INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, "CREDITS", ?)', [recipientUser.id, recAfter, nowIso]);
    }

    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'GIFT', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [recipientUser.id, giftAmount, recBefore, recAfter, refCode, `Gift received from @${req.user!.username}${note ? `: "${note}"` : ''}`, nowIso]
    );

    // 3. Notification for recipient
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'You Received a Gift of Credits!', ?, 'TOPUP', 0, '/wallet', ?)`,
      [recipientUser.id, `@${req.user!.username} sent you ${giftAmount} credits! ${note ? `Note: "${note}"` : ''}`, nowIso]
    );

    res.json({
      success: true,
      message: `Successfully transferred ${giftAmount} credits to @${recipientUser.username}!`,
      new_balance: senderAfter,
      reference: refCode
    });
  } catch (err: any) {
    console.error('[Gift] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/wallet/coupon/validate - Validate a coupon
router.post('/coupon/validate', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, amount } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'MISSING_CODE' });
      return;
    }

    const coupon = await queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.trim().toUpperCase()]);
    if (!coupon) {
      res.status(404).json({ success: false, error: 'INVALID_COUPON', message: 'Coupon code not found or inactive.' });
      return;
    }

    if (coupon.times_used >= coupon.usage_limit) {
      res.status(400).json({ success: false, error: 'EXPIRED_COUPON', message: 'This coupon usage limit has been reached.' });
      return;
    }

    const purchaseAmount = Number(amount) || 0;
    if (purchaseAmount < coupon.min_purchase) {
      res.status(400).json({
        success: false,
        error: 'MIN_PURCHASE_NOT_MET',
        message: `This coupon requires a minimum purchase of ${coupon.min_purchase} credits.`
      });
      return;
    }

    let discountCredits = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discountCredits = (purchaseAmount * coupon.discount_value) / 100;
    } else {
      discountCredits = coupon.discount_value;
    }

    res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_credits: Math.min(purchaseAmount, discountCredits)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
