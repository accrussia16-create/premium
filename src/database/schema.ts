import { executeRaw } from './db';

export async function initializeSchema(): Promise<void> {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CREDITS',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'TOP_UP', 'PURCHASE', 'REFUND', 'BONUS', 'ADJUSTMENT', 'GIFT'
      amount REAL NOT NULL,
      balance_before REAL NOT NULL,
      balance_after REAL NOT NULL,
      reference TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      description TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT,
      thumbnail TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      access_duration_type TEXT NOT NULL DEFAULT '30_DAYS', -- '24_HOURS', '7_DAYS', '30_DAYS', '90_DAYS', 'LIFETIME', 'CUSTOM'
      custom_duration_days INTEGER,
      demo_type TEXT NOT NULL DEFAULT 'VIDEO', -- 'VIDEO', 'PHOTOS', 'LINK', 'EMBED'
      demo_url TEXT,
      demo_description TEXT,
      premium_type TEXT NOT NULL DEFAULT 'COURSE', -- 'VIDEO', 'COURSE', 'IMAGE_GALLERY', 'DIGITAL_RESOURCE', 'COMMUNITY', 'EXTERNAL_RESOURCE'
      premium_resource_url TEXT,
      premium_resource_meta TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'
      views INTEGER DEFAULT 0,
      demo_views INTEGER DEFAULT 0,
      purchases_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 600,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_free_preview INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      media_type TEXT NOT NULL, -- 'DEMO_PHOTO', 'DEMO_VIDEO', 'ATTACHMENT'
      url TEXT NOT NULL,
      caption TEXT,
      sort_order INTEGER DEFAULT 1,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      price_paid REAL NOT NULL,
      starts_at TEXT NOT NULL,
      expires_at TEXT, -- NULL represents Lifetime Access
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'REFUNDED', 'CANCELLED'
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      review_text TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      lesson_id INTEGER,
      position_seconds REAL DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      completion_percent REAL DEFAULT 0,
      last_watched_at TEXT NOT NULL,
      UNIQUE(user_id, product_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      method TEXT NOT NULL, -- 'EASYPAISA', 'JAZZCASH', 'USDT'
      amount_credits REAL NOT NULL,
      amount_fiat REAL NOT NULL,
      currency TEXT NOT NULL,
      sender_info TEXT,
      reference_id TEXT UNIQUE,
      proof_image_url TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
      network TEXT, -- 'TRC20', 'ERC20', 'BEP20' for USDT
      notes TEXT,
      reviewed_by INTEGER,
      reviewed_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL, -- 'PERCENTAGE', 'FIXED_CREDITS'
      discount_value REAL NOT NULL,
      start_date TEXT,
      end_date TEXT,
      usage_limit INTEGER DEFAULT 100,
      times_used INTEGER DEFAULT 0,
      min_purchase REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coupon_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      purchase_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO', -- 'PURCHASE', 'TOPUP', 'EXPIRING', 'EXPIRED', 'SYSTEM'
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      purchase_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `;

  await executeRaw(schemaSql);
  console.log('[DB] Schema initialized successfully.');
}
