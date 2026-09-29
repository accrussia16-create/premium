import { Router, Response } from 'express';
import { queryAll } from '../database/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { calculateAccessStatus } from './productRoutes';

const router = Router();

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Fetch all purchases with product details
    const purchases = await queryAll(
      `SELECT p.id as purchase_id, p.price_paid, p.starts_at, p.expires_at, p.status as purchase_status, p.created_at as purchased_at,
              prod.id as product_id, prod.title, prod.slug, prod.category, prod.thumbnail, prod.price,
              prod.access_duration_type, prod.premium_type
       FROM purchases p
       JOIN products prod ON p.product_id = prod.id
       WHERE p.user_id = ?
       ORDER BY p.id DESC`,
      [userId]
    );

    // Group by product (taking latest purchase per product)
    const latestPurchasesMap: Record<number, any> = {};
    for (const item of purchases) {
      if (!latestPurchasesMap[item.product_id]) {
        latestPurchasesMap[item.product_id] = item;
      }
    }

    // 2. Fetch all video progress records for this user
    const progressList = await queryAll(
      `SELECT vp.*, pl.title as lesson_title
       FROM video_progress vp
       LEFT JOIN product_lessons pl ON vp.lesson_id = pl.id
       WHERE vp.user_id = ?`,
      [userId]
    );
    const progressMap: Record<number, any> = {};
    for (const pr of progressList) {
      progressMap[pr.product_id] = pr;
    }

    // Categorize
    const activePurchased: any[] = [];
    const continueWatching: any[] = [];
    const completed: any[] = [];
    const expired: any[] = [];

    for (const prodId in latestPurchasesMap) {
      const p = latestPurchasesMap[prodId];
      const access = calculateAccessStatus({
        status: p.purchase_status,
        expires_at: p.expires_at
      });

      const prog = progressMap[p.product_id] || {
        completion_percent: 0,
        position_seconds: 0,
        duration_seconds: 0,
        lesson_title: null
      };

      const entry = {
        ...p,
        access,
        progress: prog
      };

      if (access.has_access) {
        activePurchased.push(entry);

        if (prog.completion_percent > 0 && prog.completion_percent < 90) {
          continueWatching.push(entry);
        } else if (prog.completion_percent >= 90) {
          completed.push(entry);
        }
      } else {
        expired.push(entry);
      }
    }

    // 3. Fetch Favorites
    const favorites = await queryAll(
      `SELECT prod.id as product_id, prod.title, prod.slug, prod.category, prod.thumbnail, prod.price,
              prod.access_duration_type, prod.rating, prod.rating_count, f.created_at as favorited_at
       FROM favorites f
       JOIN products prod ON f.product_id = prod.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      library: {
        continue_watching: continueWatching,
        purchased: activePurchased,
        completed,
        expired,
        favorites
      },
      counts: {
        active: activePurchased.length,
        continue_watching: continueWatching.length,
        completed: completed.length,
        expired: expired.length,
        favorites: favorites.length
      }
    });
  } catch (err: any) {
    console.error('[Library] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
