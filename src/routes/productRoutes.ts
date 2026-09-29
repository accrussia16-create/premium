import { Router, Response } from 'express';
import { execute, queryAll, queryOne } from '../database/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

// Helper to compute remaining access time
export function calculateAccessStatus(purchase: any) {
  if (!purchase) {
    return { has_access: false, is_expired: false, is_lifetime: false, remaining_seconds: 0, expires_at: null };
  }

  if (purchase.status !== 'ACTIVE') {
    return { has_access: false, is_expired: true, is_lifetime: false, remaining_seconds: 0, expires_at: purchase.expires_at };
  }

  if (!purchase.expires_at) {
    return { has_access: true, is_expired: false, is_lifetime: true, remaining_seconds: null, expires_at: null };
  }

  const nowMs = Date.now();
  const expireMs = new Date(purchase.expires_at).getTime();
  const diffSec = Math.floor((expireMs - nowMs) / 1000);

  if (diffSec <= 0) {
    return { has_access: false, is_expired: true, is_lifetime: false, remaining_seconds: 0, expires_at: purchase.expires_at };
  }

  return { has_access: true, is_expired: false, is_lifetime: false, remaining_seconds: diffSec, expires_at: purchase.expires_at };
}

// GET all products with filtering, search, sorting
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, search, sort = 'popular', demo_type, duration } = req.query;

    let sql = `SELECT * FROM products WHERE status = 'PUBLISHED'`;
    const params: any[] = [];

    if (category && category !== 'All') {
      sql += ` AND category = ?`;
      params.push(category);
    }

    if (demo_type && demo_type !== 'All') {
      sql += ` AND demo_type = ?`;
      params.push(demo_type);
    }

    if (duration && duration !== 'All') {
      sql += ` AND access_duration_type = ?`;
      params.push(duration);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ?)`;
      params.push(term, term, term);
    }

    // Sorting
    switch (sort) {
      case 'newest':
        sql += ` ORDER BY created_at DESC`;
        break;
      case 'price_asc':
        sql += ` ORDER BY price ASC`;
        break;
      case 'price_desc':
        sql += ` ORDER BY price DESC`;
        break;
      case 'rating':
        sql += ` ORDER BY rating DESC, rating_count DESC`;
        break;
      case 'popular':
      default:
        sql += ` ORDER BY purchases_count DESC, views DESC`;
        break;
    }

    const products = await queryAll(sql, params);

    // If user is logged in, attach favorite and purchase access status
    let userFavorites: Set<number> = new Set();
    let userPurchases: Record<number, any> = {};

    if (req.user) {
      const favs = await queryAll('SELECT product_id FROM favorites WHERE user_id = ?', [req.user.id]);
      favs.forEach((f: any) => userFavorites.add(f.product_id));

      const purchases = await queryAll('SELECT * FROM purchases WHERE user_id = ?', [req.user.id]);
      purchases.forEach((p: any) => {
        userPurchases[p.product_id] = p;
      });
    }

    const enriched = products.map((p: any) => {
      const userPurchase = userPurchases[p.id];
      const access = calculateAccessStatus(userPurchase);

      return {
        ...p,
        is_favorite: userFavorites.has(p.id),
        user_access: access
      };
    });

    res.json({
      success: true,
      products: enriched,
      total: enriched.length
    });
  } catch (err: any) {
    console.error('[Products] Fetch error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// GET single product by ID or Slug
router.get('/:idOrSlug', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { idOrSlug } = req.params;
    let product: any;

    if (!isNaN(Number(idOrSlug))) {
      product = await queryOne('SELECT * FROM products WHERE id = ?', [Number(idOrSlug)]);
    } else {
      product = await queryOne('SELECT * FROM products WHERE slug = ?', [idOrSlug]);
    }

    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found.' });
      return;
    }

    // Increment view count
    execute('UPDATE products SET views = views + 1 WHERE id = ?', [product.id]);

    // Fetch lessons (only showing video_url if is_free_preview OR if user has active purchase)
    const lessons = await queryAll(
      'SELECT id, title, description, duration_seconds, sort_order, is_free_preview, video_url FROM product_lessons WHERE product_id = ? ORDER BY sort_order ASC',
      [product.id]
    );

    // Fetch media (photos for demo)
    const media = await queryAll(
      'SELECT id, media_type, url, caption, sort_order FROM product_media WHERE product_id = ? ORDER BY sort_order ASC',
      [product.id]
    );

    // Fetch reviews with author usernames
    const reviews = await queryAll(
      `SELECT r.id, r.rating, r.review_text, r.created_at, u.username, u.avatar_url
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC`,
      [product.id]
    );

    // Related products (same category)
    const related = await queryAll(
      `SELECT id, slug, title, category, thumbnail, price, access_duration_type, rating, rating_count, purchases_count
       FROM products 
       WHERE category = ? AND id != ? AND status = 'PUBLISHED'
       ORDER BY rating DESC LIMIT 4`,
      [product.category, product.id]
    );

    // Check user purchase & access status
    let userAccess: { has_access: boolean; is_expired: boolean; is_lifetime: boolean; remaining_seconds: number | null; expires_at: string | null } = { has_access: false, is_expired: false, is_lifetime: false, remaining_seconds: 0, expires_at: null };
    let isFavorite = false;
    let videoProgress: any = null;

    if (req.user) {
      const fav = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', [req.user.id, product.id]);
      isFavorite = !!fav;

      const purchase = await queryOne(
        `SELECT * FROM purchases WHERE user_id = ? AND product_id = ? ORDER BY id DESC LIMIT 1`,
        [req.user.id, product.id]
      );
      userAccess = calculateAccessStatus(purchase);

      // Fetch progress
      videoProgress = await queryOne(
        `SELECT lesson_id, position_seconds, duration_seconds, completion_percent, last_watched_at
         FROM video_progress 
         WHERE user_id = ? AND product_id = ?`,
        [req.user.id, product.id]
      );
    }

    // Mask lesson video URLs if user does NOT have active access and lesson is NOT free preview
    const sanitizedLessons = lessons.map((l: any) => {
      const canView = userAccess.has_access || l.is_free_preview === 1;
      return {
        id: l.id,
        title: l.title,
        description: l.description,
        duration_seconds: l.duration_seconds,
        sort_order: l.sort_order,
        is_free_preview: l.is_free_preview === 1,
        video_url: canView ? l.video_url : null // Never reveal protected link to unauthorized users!
      };
    });

    res.json({
      success: true,
      product: {
        ...product,
        is_favorite: isFavorite,
        user_access: userAccess,
        progress: videoProgress
      },
      lessons: sanitizedLessons,
      media,
      reviews,
      related
    });
  } catch (err: any) {
    console.error('[Products] Single fetch error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// POST purchase product using wallet credits
router.post('/:id/purchase', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);
    const userId = req.user!.id;
    const { coupon_code } = req.body;

    const product = await queryOne('SELECT * FROM products WHERE id = ? AND status = ?', [productId, 'PUBLISHED']);
    if (!product) {
      res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND', message: 'Product not found or unavailable.' });
      return;
    }

    // Check existing active purchase
    const existingPurchase = await queryOne(
      `SELECT * FROM purchases WHERE user_id = ? AND product_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`,
      [userId, productId]
    );

    const currentAccess = calculateAccessStatus(existingPurchase);
    if (currentAccess.has_access) {
      res.status(400).json({
        success: false,
        error: 'ALREADY_ACTIVE',
        message: 'You already have active access to this content. Renewal will be available once access expires.'
      });
      return;
    }

    // Calculate price & discount
    let finalPrice = product.price;
    let couponRecord: any = null;

    if (coupon_code) {
      const code = coupon_code.trim().toUpperCase();
      couponRecord = await queryOne('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code]);
      if (couponRecord) {
        if (couponRecord.times_used >= couponRecord.usage_limit) {
          res.status(400).json({ success: false, error: 'COUPON_LIMIT_REACHED', message: 'This coupon usage limit has been reached.' });
          return;
        }

        if (finalPrice < couponRecord.min_purchase) {
          res.status(400).json({ success: false, error: 'COUPON_MIN_PURCHASE', message: `Minimum purchase of ${couponRecord.min_purchase} credits required for this coupon.` });
          return;
        }

        if (couponRecord.discount_type === 'PERCENTAGE') {
          const discount = (finalPrice * couponRecord.discount_value) / 100;
          finalPrice = Math.max(0, finalPrice - discount);
        } else if (couponRecord.discount_type === 'FIXED_CREDITS') {
          finalPrice = Math.max(0, finalPrice - couponRecord.discount_value);
        }
      }
    }

    // Check wallet balance
    const wallet = await queryOne('SELECT id, balance, currency FROM wallets WHERE user_id = ?', [userId]);
    if (!wallet || wallet.balance < finalPrice) {
      res.status(400).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Insufficient wallet balance. You need ${finalPrice} credits, but your current balance is ${wallet?.balance || 0} credits.`,
        required_credits: finalPrice,
        current_balance: wallet?.balance || 0
      });
      return;
    }

    const now = new Date();
    const startsAt = now.toISOString();
    let expiresAt: string | null = null;

    // Calculate expiration based on access_duration_type
    switch (product.access_duration_type) {
      case '24_HOURS':
        expiresAt = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();
        break;
      case '7_DAYS':
        expiresAt = new Date(now.getTime() + 7 * 86400 * 1000).toISOString();
        break;
      case '30_DAYS':
        expiresAt = new Date(now.getTime() + 30 * 86400 * 1000).toISOString();
        break;
      case '90_DAYS':
        expiresAt = new Date(now.getTime() + 90 * 86400 * 1000).toISOString();
        break;
      case 'CUSTOM':
        const days = product.custom_duration_days || 30;
        expiresAt = new Date(now.getTime() + days * 86400 * 1000).toISOString();
        break;
      case 'LIFETIME':
      default:
        expiresAt = null;
        break;
    }

    // Atomically execute transaction
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - finalPrice;

    // 1. Update Wallet
    await execute('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?', [balanceAfter, startsAt, wallet.id]);

    // 2. Record Wallet Transaction
    const refCode = `PUR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'PURCHASE', ?, ?, ?, ?, 'COMPLETED', ?, ?)`,
      [userId, -finalPrice, balanceBefore, balanceAfter, refCode, `Purchase of "${product.title}" (${product.access_duration_type.replace('_', ' ')})`, startsAt]
    );

    // 3. Create or Refresh Purchase
    const purchaseRes = await execute(
      `INSERT INTO purchases (user_id, product_id, price_paid, starts_at, expires_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [userId, productId, finalPrice, startsAt, expiresAt, startsAt]
    );

    const purchaseId = purchaseRes.lastInsertRowid!;

    // 4. Update product purchases count
    await execute('UPDATE products SET purchases_count = purchases_count + 1 WHERE id = ?', [productId]);

    // 5. Coupon redemption if applied
    if (couponRecord) {
      await execute('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [couponRecord.id]);
      await execute(
        'INSERT INTO coupon_redemptions (coupon_id, user_id, purchase_id, created_at) VALUES (?, ?, ?, ?)',
        [couponRecord.id, userId, purchaseId, startsAt]
      );
    }

    // 6. In-app Notification
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Purchase Confirmed!', ?, 'PURCHASE', 0, ?, ?)`,
      [
        userId,
        `You have successfully unlocked "${product.title}". ${expiresAt ? `Access valid until ${new Date(expiresAt).toLocaleDateString()}.` : 'Lifetime access unlocked!'}`,
        `/products/${product.id}`,
        startsAt
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Purchase completed successfully! Access granted.',
      receipt: {
        purchase_id: purchaseId,
        product_title: product.title,
        price_paid: finalPrice,
        currency: 'CREDITS',
        balance_remaining: balanceAfter,
        starts_at: startsAt,
        expires_at: expiresAt,
        is_lifetime: expiresAt === null,
        access_duration_type: product.access_duration_type,
        reference: refCode
      }
    });
  } catch (err: any) {
    console.error('[Purchase] Error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to complete purchase.' });
  }
});

// Toggle Favorite
router.post('/:id/favorite', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);
    const userId = req.user!.id;

    const existing = await queryOne('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
    if (existing) {
      await execute('DELETE FROM favorites WHERE id = ?', [existing.id]);
      res.json({ success: true, is_favorite: false, message: 'Removed from favorites.' });
    } else {
      await execute('INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)', [userId, productId, new Date().toISOString()]);
      res.json({ success: true, is_favorite: true, message: 'Added to favorites.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// Post Verified Review
router.post('/:id/reviews', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params.id);
    const userId = req.user!.id;
    const { rating, review_text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'INVALID_RATING', message: 'Rating must be between 1 and 5.' });
      return;
    }

    // Verify user purchased the product
    const purchase = await queryOne('SELECT id FROM purchases WHERE user_id = ? AND product_id = ?', [userId, productId]);
    if (!purchase) {
      res.status(403).json({ success: false, error: 'VERIFIED_PURCHASE_REQUIRED', message: 'Only verified purchasers can submit a review.' });
      return;
    }

    // Check existing review
    const existing = await queryOne('SELECT id FROM reviews WHERE user_id = ? AND product_id = ?', [userId, productId]);
    const nowIso = new Date().toISOString();

    if (existing) {
      await execute('UPDATE reviews SET rating = ?, review_text = ?, created_at = ? WHERE id = ?', [rating, review_text?.trim() || '', nowIso, existing.id]);
    } else {
      await execute(
        'INSERT INTO reviews (user_id, product_id, rating, review_text, created_at) VALUES (?, ?, ?, ?, ?)',
        [userId, productId, rating, review_text?.trim() || '', nowIso]
      );
    }

    // Recalculate average rating on product
    const stats = await queryOne('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?', [productId]);
    if (stats) {
      await execute('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?', [
        Math.round((stats.avg_rating || 5) * 10) / 10,
        stats.cnt || 1,
        productId
      ]);
    }

    res.json({ success: true, message: 'Review submitted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
