const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"]
  }
});

const gameState = {
  players: {},
  enemies: {},
  gameOver: false,
  score: 0
};

const mapSize = { width: 50, height: 50 };
const maxEnemies = 10;

function generateEnemy() {
  return {
    x: Math.floor(Math.random() * mapSize.width),
    y: Math.floor(Math.random() * mapSize.height),
    symbol: 'E'
  };
}

function moveEnemies() {
  Object.values(gameState.enemies).forEach(enemy => {
    const direction = Math.floor(Math.random() * 4);
    switch (direction) {
      case 0: enemy.y = Math.max(0, enemy.y - 1); break; // Up
      case 1: enemy.y = Math.min(mapSize.height - 1, enemy.y + 1); break; // Down
      case 2: enemy.x = Math.max(0, enemy.x - 1); break; // Left
      case 3: enemy.x = Math.min(mapSize.width - 1, enemy.x + 1); break; // Right
    }
  });
}

function spawnEnemies() {
  const currentEnemyCount = Object.keys(gameState.enemies).length;
  const enemiesToSpawn = maxEnemies - currentEnemyCount;
  
  for (let i = 0; i < enemiesToSpawn; i++) {
    const enemyId = `enemy_${Date.now()}_${i}`;
    gameState.enemies[enemyId] = generateEnemy();
  }
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinGame', () => {
    console.log('Player joined:', socket.id);
    gameState.players[socket.id] = {
      x: Math.floor(Math.random() * mapSize.width),
      y: Math.floor(Math.random() * mapSize.height),
      symbol: 'P'
    };
    io.emit('gameState', gameState);
  });

  socket.on('movePlayer', (direction) => {
    console.log('Move player:', socket.id, direction);
    const player = gameState.players[socket.id];
    if (player) {
      player.x = Math.max(0, Math.min(direction.x, mapSize.width - 1));
      player.y = Math.max(0, Math.min(direction.y, mapSize.height - 1));
      
      // Check for collisions with enemies
      Object.entries(gameState.enemies).forEach(([enemyId, enemy]) => {
        if (enemy.x === player.x && enemy.y === player.y) {
          console.log('Player hit enemy:', socket.id, enemyId);
          gameState.gameOver = true;
          gameState.score = calculateScore(gameState.players[socket.id]);
          io.emit('gameState', gameState);
        }
      });
      
      if (!gameState.gameOver) {
        io.emit('gameState', gameState);
      }
    }
  });

  socket.on('restartGame', () => {
    console.log('Restarting game for player:', socket.id);
    gameState.gameOver = false;
    gameState.score = 0;
    gameState.players[socket.id] = {
      x: Math.floor(Math.random() * mapSize.width),
      y: Math.floor(Math.random() * mapSize.height),
      symbol: 'P'
    };
    io.emit('gameState', gameState);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    delete gameState.players[socket.id];
    io.emit('gameState', gameState);
  });
});

function calculateScore(player) {
  // Implement your scoring logic here
  // For example, you could base it on survival time or enemies avoided
  return Math.floor(Math.random() * 1000); // Placeholder random score
}

// Game loop
setInterval(() => {
  moveEnemies();
  spawnEnemies();
  io.emit('gameState', gameState);
}, 1000); // Update every second

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
