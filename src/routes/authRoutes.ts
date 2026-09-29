import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../database/db';
import { generateToken, AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Email, username, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters.' });
      return;
    }

    // Check existing
    const existing = await queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email.toLowerCase().trim(), username.trim()]);
    if (existing) {
      res.status(409).json({ success: false, error: 'USER_EXISTS', message: 'An account with that email or username already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nowIso = new Date().toISOString();

    const userRes = await execute(
      `INSERT INTO users (email, username, password_hash, role, avatar_url, status, created_at)
       VALUES (?, ?, ?, 'USER', ?, 'ACTIVE', ?)`,
      [email.toLowerCase().trim(), username.trim(), passwordHash, `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`, nowIso]
    );

    const userId = userRes.lastInsertRowid!;

    // Create user wallet with 20 welcome bonus credits
    const welcomeCredits = 20;
    await execute(
      `INSERT INTO wallets (user_id, balance, currency, updated_at) VALUES (?, ?, 'CREDITS', ?)`,
      [userId, welcomeCredits, nowIso]
    );

    // Record welcome bonus transaction
    await execute(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference, status, description, created_at)
       VALUES (?, 'BONUS', ?, 0, ?, 'WB-INIT', 'COMPLETED', 'Welcome bonus credits', ?)`,
      [userId, welcomeCredits, welcomeCredits, nowIso]
    );

    // Welcome notification
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, 'Welcome to UPI-Pay!', 'You received 20 welcome credits to start exploring.', 'INFO', 0, '/marketplace', ?)`,
      [userId, nowIso]
    );

    const authUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      username: username.trim(),
      role: 'USER' as const,
      avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`
    };

    const token = generateToken(authUser);

    res.cookie('upipay_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.status(201).json({
      success: true,
      token,
      user: authUser,
      wallet: { balance: welcomeCredits, currency: 'CREDITS' }
    });
  } catch (error: any) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Failed to create account.' });
  }
});

// Login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'Email and password are required.' });
      return;
    }

    const user = await queryOne(
      'SELECT id, email, username, password_hash, role, avatar_url, status FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (!user) {
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, error: 'ACCOUNT_SUSPENDED', message: 'This account has been deactivated.' });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
      return;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as 'USER' | 'ADMIN',
      avatar_url: user.avatar_url
    };

    const token = generateToken(authUser);

    // Fetch wallet
    const wallet = await queryOne('SELECT balance, currency FROM wallets WHERE user_id = ?', [user.id]) || { balance: 0, currency: 'CREDITS' };

    res.cookie('upipay_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.json({
      success: true,
      token,
      user: authUser,
      wallet
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Login failed.' });
  }
});

// Current User Me
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.json({ success: true, user: null, wallet: null });
    return;
  }

  try {
    const user = await queryOne(
      'SELECT id, email, username, role, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      res.json({ success: true, user: null, wallet: null });
      return;
    }

    const wallet = await queryOne(
      'SELECT balance, currency, updated_at FROM wallets WHERE user_id = ?',
      [req.user.id]
    ) || { balance: 0, currency: 'CREDITS' };

    // Count unread notifications
    const unreadCountRow = await queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    // Count active purchases
    const activePurchasesRow = await queryOne(
      `SELECT COUNT(*) as count FROM purchases 
       WHERE user_id = ? AND status = 'ACTIVE' 
       AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))`,
      [req.user.id]
    );

    res.json({
      success: true,
      user,
      wallet,
      stats: {
        unreadNotifications: unreadCountRow?.count || 0,
        activePurchases: activePurchasesRow?.count || 0
      }
    });
  } catch (error: any) {
    console.error('[Auth] Me error:', error);
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

// Logout
router.post('/logout', (req, res: Response): void => {
  res.clearCookie('upipay_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Fast Account Switcher for Demo / Testing (Admin vs Alex)
router.post('/switch-demo', async (req, res: Response): Promise<void> => {
  try {
    const { target } = req.body; // 'admin' | 'alex'
    const email = target === 'admin' ? 'admin@upipay.io' : 'alex@upipay.io';

    const user = await queryOne(
      'SELECT id, email, username, role, avatar_url FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'Demo account not found.' });
      return;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as 'USER' | 'ADMIN',
      avatar_url: user.avatar_url
    };

    const token = generateToken(authUser);
    const wallet = await queryOne('SELECT balance, currency FROM wallets WHERE user_id = ?', [user.id]) || { balance: 0, currency: 'CREDITS' };

    res.cookie('upipay_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.json({
      success: true,
      token,
      user: authUser,
      wallet
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
