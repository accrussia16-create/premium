import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../database/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { calculateAccessStatus } from './productRoutes';

const router = Router();

// GET /api/content/:id/access - THE AUTHORITATIVE ACCESS VERIFICATION ENDPOINT
router.get('/:id/access', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);
    const userId = req.user!.id;

    // 1. Verify product exists
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product does not exist.' });
      return;
    }

    // 2. Fetch the most recent purchase for this user and product
    const purchase = await queryOne(
      `SELECT * FROM purchases WHERE user_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1`,
      [userId, productId]
    );

    if (!purchase) {
      res.status(403).json({
        success: false,
        error: 'NO_ACTIVE_PURCHASE',
        message: 'You have not purchased access to this content yet.',
        product_id: productId,
        price: product.price
      });
      return;
    }

    // 3. Authoritative access expiration check
    const accessStatus = calculateAccessStatus(purchase);

    if (!accessStatus.has_access) {
      res.status(403).json({
        success: false,
        error: 'ACCESS_EXPIRED',
        message: 'Your access to this premium content has expired. Please renew your access.',
        expired_at: purchase.expires_at,
        product_id: productId,
        product_title: product.title,
        price: product.price
      });
      return;
    }

    // 4. Access is VALID! Retrieve all protected lessons & resources
    const lessons = await queryAll(
      `SELECT id, title, description, video_url, duration_seconds, sort_order, is_free_preview 
       FROM product_lessons 
       WHERE product_id = ? 
       ORDER BY sort_order ASC`,
      [productId]
    );

    // 5. Fetch saved user progress
    const progress = await queryOne(
      `SELECT lesson_id, position_seconds, duration_seconds, completion_percent, last_watched_at
       FROM video_progress 
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    // 6. Generate secure session / watermark payload
    const watermarkText = `${req.user!.email} • ID: ${userId} • UPI-Pay`;

    res.json({
      success: true,
      authorized: true,
      product: {
        id: product.id,
        title: product.title,
        premium_type: product.premium_type,
        premium_resource_url: product.premium_resource_url,
        premium_resource_meta: product.premium_resource_meta ? JSON.parse(product.premium_resource_meta) : null,
      },
      access: accessStatus,
      lessons,
      saved_progress: progress || null,
      security: {
        watermark: watermarkText,
        user_id: userId,
        session_id: `SEC-${Date.now().toString(36)}-${userId}`,
        authorized_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('[Content Access] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to authorize content.' });
  }
});

// POST /api/progress - Save video position & completion
router.post('/progress', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { product_id, lesson_id, position_seconds, duration_seconds } = req.body;

    if (!product_id || position_seconds === undefined) {
      res.status(400).json({ success: false, error: 'INVALID_DATA' });
      return;
    }

    const duration = Number(duration_seconds) || 1;
    const position = Number(position_seconds);
    const completionPercent = Math.min(100, Math.round((position / duration) * 100));
    const nowIso = new Date().toISOString();

    const existing = await queryOne(
      'SELECT id FROM video_progress WHERE user_id = ? AND product_id = ? AND (lesson_id = ? OR (lesson_id IS NULL AND ? IS NULL))',
      [userId, product_id, lesson_id || null, lesson_id || null]
    );

    if (existing) {
      await execute(
        `UPDATE video_progress 
         SET position_seconds = ?, duration_seconds = ?, completion_percent = ?, last_watched_at = ?, lesson_id = ?
         WHERE id = ?`,
        [position, duration, completionPercent, nowIso, lesson_id || null, existing.id]
      );
    } else {
      await execute(
        `INSERT INTO video_progress (user_id, product_id, lesson_id, position_seconds, duration_seconds, completion_percent, last_watched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, product_id, lesson_id || null, position, duration, completionPercent, nowIso]
      );
    }

    res.json({ success: true, completion_percent: completionPercent });
  } catch (err: any) {
    console.error('[Progress] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET /api/progress/:productId - Fetch saved progress
router.get('/progress/:productId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const productId = Number(req.params.productId);

    const progress = await queryOne(
      `SELECT lesson_id, position_seconds, duration_seconds, completion_percent, last_watched_at
       FROM video_progress 
       WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );

    res.json({ success: true, progress: progress || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
