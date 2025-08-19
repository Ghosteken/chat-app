import { Server } from 'socket.io';
import { prisma } from '../prisma';

export function setupReceipts(io: Server) {
  io.on('connection', (socket) => {
    const userId = (socket.data as any).userId as number;

    socket.on('message_delivered', async ({ messageId }: { messageId: number }) => {
      try {
        const rec = await prisma.messageReceipt.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId, deliveredAt: new Date() },
          update: { deliveredAt: new Date() },
        });
        const msg = await prisma.message.findUnique({ where: { id: messageId } });
        if (msg) io.to(`room:${msg.roomId}`).emit('message_status', { messageId, userId, deliveredAt: rec.deliveredAt?.toISOString() });
      } catch (e) {
        console.error('message_delivered error', e);
      }
    });

    socket.on('message_read', async ({ messageId }: { messageId: number }) => {
      try {
        const rec = await prisma.messageReceipt.upsert({
          where: { messageId_userId: { messageId, userId } },
          create: { messageId, userId, readAt: new Date() },
          update: { readAt: new Date() },
        });
        const msg = await prisma.message.findUnique({ where: { id: messageId } });
        if (msg) io.to(`room:${msg.roomId}`).emit('message_status', { messageId, userId, readAt: rec.readAt?.toISOString() });
      } catch (e) {
        console.error('message_read error', e);
      }
    });
  });
}

