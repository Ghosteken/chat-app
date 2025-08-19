import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { prisma } from '../prisma';
import { SlidingWindowLimiter } from '../services/rateLimiter';
import { config } from '../config/env';
import jwt from 'jsonwebtoken';
import * as presence from '../services/presence';

interface ServerToClientEvents {
  receive_message: (msg: { id: number; roomId: number; senderId: number; content: string; createdAt: string }) => void;
  user_status: (p: { userId: number; status: 'online' | 'offline'; lastSeen?: string }) => void;
  typing: (p: { roomId: number; userId: number; isTyping: boolean }) => void;
}

interface ClientToServerEvents {
  join_room: (p: { roomId: number }) => void;
  send_message: (p: { roomId: number; content: string }) => void;
  typing: (p: { roomId: number; isTyping: boolean }) => void;
}

interface InterServerEvents {}
interface SocketData { userId: number }

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: config.CORS_ORIGIN, credentials: true },
  });

  const limiter = new SlidingWindowLimiter(config.MESSAGE_RATE_LIMIT, config.MESSAGE_RATE_WINDOW_MS);

  // Presence via shared service

  io.use((socket, next) => {
    // Expect token in query or header
    const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers['authorization']?.toString().replace('Bearer ', ''));
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as { userId: number };
      socket.data.userId = payload.userId;
      return next();
    } catch (e) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    // presence online via service
    const becameOnline = presence.connect(userId);
    if (becameOnline) {
      const payload = { userId, status: 'online' as const };
      console.log('user_status:', JSON.stringify(payload));
      io.emit('user_status', payload);
    }

    socket.on('join_room', async ({ roomId }) => {
      if (!Number.isInteger(roomId)) return;
      const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
      if (!member) return; // ignore
      socket.join(`room:${roomId}`);
    });

    socket.on('send_message', async ({ roomId, content }) => {
      if (!content || typeof content !== 'string' || !content.trim()) return;
      const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
      if (!member) return;
      if (!limiter.allow(userId, roomId)) return; // rate limited silently
      try {
        const msg = await prisma.message.create({ data: { roomId, senderId: userId, content: content.trim() } });
        const payload = { id: msg.id, roomId: msg.roomId, senderId: msg.senderId, content: msg.content, createdAt: msg.createdAt.toISOString() };
        io.to(`room:${roomId}`).emit('receive_message', payload);
      } catch (e) {
        console.error('send_message error', e);
      }
    });

    socket.on('typing', async ({ roomId, isTyping }) => {
      const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });
      if (!member) return;
      socket.to(`room:${roomId}`).emit('typing', { roomId, userId, isTyping: !!isTyping });
      // server log for typing start/stop can be noisy; keep minimal
    });

    socket.on('disconnect', async () => {
      const wentOffline = presence.disconnect(userId);
      if (wentOffline) {
        await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } });
        const payload = { userId, status: 'offline' as const };
        console.log('user_status:', JSON.stringify(payload));
        io.emit('user_status', payload);
      }
    });
  });

  return io;
}

