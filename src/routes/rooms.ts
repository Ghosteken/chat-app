import { Router } from 'express';
import { authRequired } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

router.use(authRequired);

router.get('/', async (req, res) => {
  const userId = req.user!.userId;
  const rooms = await prisma.roomMember.findMany({
    where: { userId },
    include: { room: true },
  });
  res.json(rooms.map((rm) => rm.room));
});

router.post('/', async (req, res) => {
  const userId = req.user!.userId;
  const { name, isPrivate } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const inviteCode = isPrivate ? Math.random().toString(36).slice(2, 10) : null;
  const room = await prisma.room.create({
    data: {
      name,
      isPrivate: !!isPrivate,
      inviteCode,
      createdById: userId,
      members: { create: { userId } },
    },
  });
  res.status(201).json(room);
});

router.post('/:roomId/join', async (req, res) => {
  const userId = req.user!.userId;
  const roomId = parseInt(req.params.roomId, 10);
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.isPrivate) {
    const { inviteCode } = req.body || {};
    if (!inviteCode || inviteCode !== room.inviteCode)
      return res.status(403).json({ error: 'Invite required' });
  }
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    update: {},
    create: { roomId, userId },
  });
  res.json({ ok: true });
});

router.get('/:roomId/messages', async (req, res) => {
  const userId = req.user!.userId;
  const roomId = parseInt(req.params.roomId, 10);
  const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!member) return res.status(403).json({ error: 'Not a room member' });
  const take = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);
  const cursor = req.query.cursor ? { id: parseInt(req.query.cursor as string, 10) } : undefined;
  const messages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { id: 'desc' },
    take,
    ...(cursor ? { skip: 1, cursor } : {}),
  });
  res.json({ messages, nextCursor: messages.length ? messages[messages.length - 1].id : null });
});

export default router;

