const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

const gameState = {
  players: {}
};

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinGame', () => {
    const playerId = socket.id;
    gameState.players[playerId] = {
      x: Math.floor(Math.random() * 10),
      y: Math.floor(Math.random() * 10),
      symbol: 'P'
    };
    io.emit('gameState', gameState);
  });

  socket.on('movePlayer', (direction) => {
    const player = gameState.players[socket.id];
    if (player) {
      switch (direction) {
        case 'up':
          player.y = Math.max(0, player.y - 1);
          break;
        case 'down':
          player.y = Math.min(9, player.y + 1);
          break;
        case 'left':
          player.x = Math.max(0, player.x - 1);
          break;
        case 'right':
          player.x = Math.min(9, player.x + 1);
          break;
      }
      io.emit('gameState', gameState);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    delete gameState.players[socket.id];
    io.emit('gameState', gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
