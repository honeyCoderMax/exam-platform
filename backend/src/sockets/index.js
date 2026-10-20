const { Server } = require('socket.io');
const { clientUrl } = require('../config/env');
const { verifyAccessToken } = require('../utils/generateTokens');

let io = null;

const initSockets = (server) => {
  io = new Server(server, {
    cors: {
      origin: clientUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Auth required'));
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);
    if (socket.user.centerId) {
      socket.join(`center:${socket.user.centerId}`);
    }

    socket.on('disconnect', () => {});
  });

  console.log('Socket.io initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${userId}`).emit(event, data);
};

const emitToCenter = (centerId, event, data) => {
  if (io) io.to(`center:${centerId}`).emit(event, data);
};

module.exports = { initSockets, getIO, emitToUser, emitToCenter };
