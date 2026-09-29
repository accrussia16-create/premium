import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../database/db';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

// Helper for audit logs
async function logAdminAction(actor: any, action: string, targetType: string, targetId: string, details: string, ip?: string) {
  await execute(
    `INSERT INTO admin_audit_logs (actor_id, actor_name, action, target_type, target_id, details, ip_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [actor.id, actor.username, action, targetType, targetId, details, ip || '127.0.0.1', new Date().toISOString()]
  );
}

// GET /api/admin/stats - Overview metrics
router.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await queryOne('SELECT COUNT(*) as count FROM users');
    const activeUsers = await queryOne('SELECT COUNT(*) as count FROM users WHERE status = "ACTIVE"');
    const totalProducts = await queryOne('SELECT COUNT(*) as count FROM products');
    const publishedProducts = await queryOne('SELECT COUNT(*) as count FROM products WHERE status = "PUBLISHED"');
    const totalPurchases = await queryOne('SELECT COUNT(*) as count, COALESCE(SUM(price_paid), 0) as revenue FROM purchases');
    const pendingTopups = await queryOne('SELECT COUNT(*) as count FROM topups WHERE status = "PENDING"');
    
    const expiredPurchases = await queryOne(
      `SELECT COUNT(*) as count FROM purchases 
       WHERE expires_at IS NOT NULL AND datetime(expires_at) <= datetime('now')`
    );

    const todayPurchases = await queryOne(
      `SELECT COUNT(*) as count, COALESCE(SUM(price_paid), 0) as revenue 
       FROM purchases 
       WHERE date(created_at) = date('now')`
    );

    res.json({
      success: true,
      stats: {
        total_users: totalUsers?.count || 0,
        active_users: activeUsers?.count || 0,
        total_products: totalProducts?.count || 0,
        published_products: publishedProducts?.count || 0,
        total_purchases: totalPurchases?.count || 0,
        total_revenue_credits: totalPurchases?.revenue || 0,
        pending_topups: pendingTopups?.count || 0,
        expired_access_count: expiredPurchases?.count || 0,
        today_purchases_count: todayPurchases?.count || 0,
        today_revenue: todayPurchases?.revenue || 0
      }
    });
  } catch (err: any) {
    console.error('[Admin Stats] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/topups - List topups
router.get('/topups', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const topups = await queryAll(
      `SELECT t.*, u.username, u.email
       FROM topups t
       JOIN users u ON t.user_id = u.id
       ORDER BY 
         CASE WHEN t.status = 'PENDING' THEN 0 ELSE 1 END,
         t.id DESC`
    );

    res.json({ success: true, topups });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/admin/topups/:id/approve - Approve topup
router.post('/topups/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const topupId = Number(req.params.id);
    const topup = await queryOne('SELECT * FROM topups WHERE id = ?', [topupId]);

    if (!topup) {
      res.status(404).json({ success: false, error: 'TOPUP_NOT_FOUND' });
      return;
    }

    if (topup.status !== 'PENDING') {
      res.status(400).json({ success: false, error: 'ALREADY_PROCESSED', message: `Top-up is already ${topup.status}.` });
      return;
    }

    const nowIso = new Date().toISOString();
    const creditsToAdd = topup.amount_credits;

    // Credit user's wallet
    const wallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [topup.user_id]);
    const balanceBefore = wallet ? wallet.balance : 0;
    const balanceAfter = balanceBefore + creditsToAdd;

    if (wallet) {
      await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, nowIso, wallet.id]);
    } else {
      await execute('INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, "CREDITS", ?)', [topup.user_id, creditsToAdd, nowIso]);
    }

    // Record wallet transaction
    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'TOP_UP', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [
        topup.user_id,
        creditsToAdd,
        balanceBefore,
        balanceAfter,
        topup.reference_id || `ADMIN-TOP-${topup.id}`,
        `Approved ${topup.method} manual top-up (Ref: ${topup.reference_id || 'N/A'})`,
        nowIso
      ]
    );

    // Update topup status
    await execute(
      'UPDATE topups SET status = "APPROVED", reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      [req.user!.id, nowIso, topup.id]
    );

    // Notification to user
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Top-up Approved!', ?, 'TOPUP', 0, '/wallet', ?)`,
      [topup.user_id, `Your ${topup.method} top-up of ${creditsToAdd} credits has been approved by administration.`, nowIso]
    );

    // Audit log
    await logAdminAction(
      req.user,
      'APPROVE_TOPUP',
      'TOPUP',
      String(topup.id),
      `Approved ${creditsToAdd} credits for User #${topup.user_id} via ${topup.method}. Ref: ${topup.reference_id}`
    );

    res.json({
      success: true,
      message: `Top-up #${topup.id} approved. ${creditsToAdd} credits added to User #${topup.user_id}.`
    });
  } catch (err: any) {
    console.error('[Admin Approve Topup] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/admin/topups/:id/reject - Reject topup
router.post('/topups/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const topupId = Number(req.params.id);
    const { reason = 'Invalid payment proof or reference' } = req.body;

    const topup = await queryOne('SELECT * FROM topups WHERE id = ?', [topupId]);
    if (!topup || topup.status !== 'PENDING') {
      res.status(400).json({ success: false, error: 'INVALID_TOPUP' });
      return;
    }

    const nowIso = new Date().toISOString();
    await execute(
      'UPDATE topups SET status = "REJECTED", notes = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?',
      [reason, req.user!.id, nowIso, topup.id]
    );

    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Top-up Declined', ?, 'TOPUP', 0, '/wallet', ?)`,
      [topup.user_id, `Your top-up request was declined. Reason: ${reason}`, nowIso]
    );

    await logAdminAction(
      req.user,
      'REJECT_TOPUP',
      'TOPUP',
      String(topup.id),
      `Rejected top-up #${topup.id} for User #${topup.user_id}. Reason: ${reason}`
    );

    res.json({ success: true, message: `Top-up #${topup.id} rejected.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/products - List all products
router.get('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const products = await queryAll('SELECT * FROM products ORDER BY id DESC');
    res.json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/admin/products - Create product
router.post('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      category,
      thumbnail,
      description,
      price,
      access_duration_type = '30_DAYS',
      custom_duration_days,
      demo_type = 'VIDEO',
      demo_url,
      demo_description,
      premium_type = 'COURSE',
      premium_resource_url,
      tags = '',
      status = 'PUBLISHED',
      rights_confirmed = true,
      lessons = []
    } = req.body;

    if (!title || !description || price === undefined) {
      res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Title, description, and price are required.' });
      return;
    }

    if (!rights_confirmed) {
      res.status(400).json({
        success: false,
        error: 'RIGHTS_CONFIRMATION_REQUIRED',
        message: 'You must confirm that you own or are authorized to distribute this content.'
      });
      return;
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString(36)}`;

    const nowIso = new Date().toISOString();

    const insertRes = await execute(
      `INSERT INTO products (
        slug, title, category, thumbnail, description, price,
        access_duration_type, custom_duration_days, demo_type, demo_url, demo_description,
        premium_type, premium_resource_url, tags, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        title.trim(),
        category || 'Courses',
        thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        description.trim(),
        Number(price),
        access_duration_type,
        custom_duration_days ? Number(custom_duration_days) : null,
        demo_type,
        demo_url || null,
        demo_description || null,
        premium_type,
        premium_resource_url || null,
        tags,
        status,
        nowIso,
        nowIso
      ]
    );

    const newProductId = insertRes.lastInsertRowid!;

    // Insert lessons if provided
    if (Array.isArray(lessons)) {
      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        if (l.title && l.video_url) {
          await execute(
            `INSERT INTO product_lessons (product_id, title, description, video_url, duration_seconds, sort_order, is_free_preview, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [newProductId, l.title, l.description || '', l.video_url, Number(l.duration_seconds) || 600, i + 1, l.is_free_preview ? 1 : 0, nowIso]
          );
        }
      }
    }

    await logAdminAction(req.user, 'CREATE_PRODUCT', 'PRODUCT', String(newProductId), `Created product "${title}" at ${price} credits.`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      product_id: newProductId,
      slug
    });
  } catch (err: any) {
    console.error('[Admin Create Product] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// PUT /api/admin/products/:id - Update product
router.put('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ success: false, error: 'NOT_FOUND' });
      return;
    }

    const {
      title,
      category,
      thumbnail,
      description,
      price,
      access_duration_type,
      custom_duration_days,
      demo_type,
      demo_url,
      demo_description,
      premium_type,
      premium_resource_url,
      tags,
      status
    } = req.body;

    const nowIso = new Date().toISOString();

    await execute(
      `UPDATE products SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        thumbnail = COALESCE(?, thumbnail),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        access_duration_type = COALESCE(?, access_duration_type),
        custom_duration_days = ?,
        demo_type = COALESCE(?, demo_type),
        demo_url = COALESCE(?, demo_url),
        demo_description = COALESCE(?, demo_description),
        premium_type = COALESCE(?, premium_type),
        premium_resource_url = COALESCE(?, premium_resource_url),
        tags = COALESCE(?, tags),
        status = COALESCE(?, status),
        updated_at = ?
       WHERE id = ?`,
      [
        title?.trim(),
        category,
        thumbnail,
        description?.trim(),
        price !== undefined ? Number(price) : null,
        access_duration_type,
        custom_duration_days !== undefined ? Number(custom_duration_days) : null,
        demo_type,
        demo_url,
        demo_description,
        premium_type,
        premium_resource_url,
        tags,
        status,
        nowIso,
        id
      ]
    );

    await logAdminAction(req.user, 'UPDATE_PRODUCT', 'PRODUCT', String(id), `Updated product "${title || existing.title}"`);

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// DELETE /api/admin/products/:id - Delete product
router.delete('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const prod = await queryOne('SELECT title FROM products WHERE id = ?', [id]);
    await execute('DELETE FROM products WHERE id = ?', [id]);
    await logAdminAction(req.user, 'DELETE_PRODUCT', 'PRODUCT', String(id), `Deleted product: ${prod?.title || id}`);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/users - User management
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await queryAll(
      `SELECT u.id, u.email, u.username, u.role, u.avatar_url, u.status, u.created_at,
              w.balance as wallet_balance,
              (SELECT COUNT(*) FROM purchases WHERE user_id = u.id) as purchases_count
       FROM users u
       LEFT JOIN wallets w ON u.id = w.user_id
       ORDER BY u.id ASC`
    );

    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST /api/admin/users/:id/adjust-balance - Section 90 Admin Balance Adjustment with mandatory reason
router.post('/users/:id/adjust-balance', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = Number(req.params.id);
    const { amount, reason } = req.body;

    const adjustmentAmount = Number(amount);
    if (!adjustmentAmount || !reason || reason.trim().length < 3) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Valid non-zero amount and explanatory reason (min 3 chars) are required.'
      });
      return;
    }

    const targetUser = await queryOne('SELECT id, username, email FROM users WHERE id = ?', [targetUserId]);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    const wallet = await queryOne('SELECT id, balance FROM wallets WHERE user_id = ?', [targetUserId]);
    const balanceBefore = wallet ? wallet.balance : 0;
    const balanceAfter = balanceBefore + adjustmentAmount;

    if (balanceAfter < 0) {
      res.status(400).json({ success: false, error: 'NEGATIVE_BALANCE', message: 'Balance cannot be adjusted below zero.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (wallet) {
      await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, nowIso, wallet.id]);
    } else {
      await execute('INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, "CREDITS", ?)', [targetUserId, balanceAfter, nowIso]);
    }

    // Record transaction
    const ref = `ADJ-${Date.now().toString(36).toUpperCase()}`;
    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'ADJUSTMENT', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [targetUserId, adjustmentAmount, balanceBefore, balanceAfter, ref, `Admin Adjustment: ${reason.trim()}`, nowIso]
    );

    // Audit log
    await logAdminAction(
      req.user,
      'BALANCE_ADJUSTMENT',
      'USER',
      String(targetUserId),
      `Adjusted user @${targetUser.username} balance by ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} credits. Reason: ${reason.trim()}`
    );

    // User notification
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Wallet Adjustment', ?, 'INFO', 0, '/wallet', ?)`,
      [
        targetUserId,
        `Your wallet was adjusted by ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} credits. Note: ${reason.trim()}`,
        nowIso
      ]
    );

    res.json({
      success: true,
      message: `Successfully adjusted balance for @${targetUser.username}. New balance: ${balanceAfter} credits.`,
      new_balance: balanceAfter
    });
  } catch (err: any) {
    console.error('[Admin Balance Adjustment] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/audit-logs - Section 55 Audit Log
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await queryAll('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100');
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
