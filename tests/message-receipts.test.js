const http = require('http');
const ioClient = require('socket.io-client');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { prisma } = require('../dist/prisma');

// Integration test: verify delivered/read receipts and message_status broadcasts

describe('message receipts', () => {
  let app, httpServer; const port = 4002;

  beforeAll(async () => {
    app = express();
    httpServer = http.createServer(app);
    const { createSocketServer } = require('../dist/socket');
    createSocketServer(httpServer);
    await new Promise((res) => httpServer.listen(port, res));
  });

  afterAll(async () => {
    await new Promise((res) => httpServer.close(res));
    await prisma.$disconnect();
  });

  const makeToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);
  const connect = (token) => ioClient(`http://localhost:${port}`, { auth: { token } });

  test('delivered and read status are persisted and broadcast', async () => {
    const rnd = Math.random().toString(36).slice(2);
    // Setup users + room
    const u1 = await prisma.user.create({ data: { name: 'U1', email: `u1_${rnd}@example.com`, passwordHash: 'x' } });
    const u2 = await prisma.user.create({ data: { name: 'U2', email: `u2_${rnd}@example.com`, passwordHash: 'y' } });
    const room = await prisma.room.create({ data: { name: 'R2', createdById: u1.id, members: { create: [{ userId: u1.id }, { userId: u2.id }] } } });

    const s1 = connect(makeToken(u1.id));
    const s2 = connect(makeToken(u2.id));

    await new Promise((r) => s1.on('connect', r));
    await new Promise((r) => s2.on('connect', r));
    s1.emit('join_room', { roomId: room.id });
    s2.emit('join_room', { roomId: room.id });

    // Wait for message, capture id
    const got = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout receive')), 5000);
      s2.on('receive_message', (p) => { clearTimeout(t); resolve(p); });
    });

    s1.emit('send_message', { roomId: room.id, content: 'ping' });
    const msg = await got;

    // Simulate client-delivered/read
    const deliveredAck = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout delivered')), 5000);
      s1.on('message_status', (p) => { if (p.messageId === msg.id && p.userId === u2.id && p.deliveredAt) { clearTimeout(t); resolve(p); } });
    });
    s2.emit('message_delivered', { messageId: msg.id });
    const del = await deliveredAck;

    const readAck = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout read')), 5000);
      s1.on('message_status', (p) => { if (p.messageId === msg.id && p.userId === u2.id && p.readAt) { clearTimeout(t); resolve(p); } });
    });
    s2.emit('message_read', { messageId: msg.id });
    const read = await readAck;

    // Verify persisted
    const rec = await prisma.messageReceipt.findUnique({ where: { messageId_userId: { messageId: msg.id, userId: u2.id } } });
    expect(rec.deliveredAt).toBeTruthy();
    expect(rec.readAt).toBeTruthy();

    s1.disconnect(); s2.disconnect();
  });
});

