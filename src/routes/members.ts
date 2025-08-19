import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import { prisma } from '../prisma';
import * as presence from '../services/presence';

const router = Router();
router.use(authRequired);

router.get('/rooms/:roomId/members', async (req, res) => {
  const userId = req.user!.userId;
  const roomId = parseInt(req.params.roomId, 10);
  const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!member) return res.status(403).json({ error: 'Not a room member' });

  const members = await prisma.roomMember.findMany({ where: { roomId }, include: { user: true } });
  res.json(
    members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      online: presence.isOnline(m.userId),
      lastSeen: m.user.lastSeen,
    }))
  );
});

export default router;

