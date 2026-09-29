import { Router, Response } from 'express';
import { execute, queryAll } from '../database/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await queryAll(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30',
      [userId]
    );

    const unreadCount = notifications.filter((n: any) => n.is_read === 0).length;

    res.json({
      success: true,
      notifications,
      unread_count: unreadCount
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    await execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

router.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
});

export default router;
