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

// Add these constants at the top of the file
const numRockClusters = 5;
const rocksPerCluster = 4;
const numTrees = 30;

const gameState = {
  players: {},
  enemies: {},
  obstacles: [],
  gameOver: false,
  score: 0
};

const mapSize = { width: 50, height: 50 };
const maxEnemies = 10;

// Generate a permanent map of obstacles
function generatePermanentObstacles() {
  const obstacles = [];
  const occupiedSpaces = new Set();

  function addObstacle(x, y, type) {
    if (x >= 0 && x < mapSize.width && y >= 0 && y < mapSize.height && !occupiedSpaces.has(`${x},${y}`)) {
      occupiedSpaces.add(`${x},${y}`);
      obstacles.push({ x, y, type });
      return true;
    }
    return false;
  }

  // Generate rock clusters
  for (let i = 0; i < numRockClusters; i++) {
    let clusterX = Math.floor(Math.random() * mapSize.width);
    let clusterY = Math.floor(Math.random() * mapSize.height);
    
    addObstacle(clusterX, clusterY, 'rock');
    
    for (let j = 0; j < rocksPerCluster - 1; j++) {
      let attempts = 0;
      while (attempts < 10) {
        let offsetX = Math.floor(Math.random() * 3) - 1;
        let offsetY = Math.floor(Math.random() * 3) - 1;
        if (addObstacle(clusterX + offsetX, clusterY + offsetY, 'rock')) {
          break;
        }
        attempts++;
      }
    }
  }

  // Generate trees
  for (let i = 0; i < numTrees; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * mapSize.width);
      y = Math.floor(Math.random() * mapSize.height);
    } while (occupiedSpaces.has(`${x},${y}`));

    addObstacle(x, y, 'tree');
  }

  return obstacles;
}

// Generate the permanent obstacles when the server starts
gameState.obstacles = generatePermanentObstacles();

function generateEnemy() {
  let x, y;
  do {
    x = Math.floor(Math.random() * mapSize.width);
    y = Math.floor(Math.random() * mapSize.height);
  } while (gameState.obstacles.some(obstacle => obstacle.x === x && obstacle.y === y));

  return { x, y, symbol: 'E' };
}

function moveEnemies() {
  Object.values(gameState.enemies).forEach(enemy => {
    const direction = Math.floor(Math.random() * 4);
    let newX = enemy.x;
    let newY = enemy.y;

    switch (direction) {
      case 0: newY = Math.max(0, enemy.y - 1); break; // Up
      case 1: newY = Math.min(mapSize.height - 1, enemy.y + 1); break; // Down
      case 2: newX = Math.max(0, enemy.x - 1); break; // Left
      case 3: newX = Math.min(mapSize.width - 1, enemy.x + 1); break; // Right
    }

    // Check if the new position is not occupied by an obstacle
    if (!gameState.obstacles.some(obstacle => obstacle.x === newX && obstacle.y === newY)) {
      enemy.x = newX;
      enemy.y = newY;
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
    let x, y;
    do {
      x = Math.floor(Math.random() * mapSize.width);
      y = Math.floor(Math.random() * mapSize.height);
    } while (gameState.obstacles.some(obstacle => obstacle.x === x && obstacle.y === y));

    gameState.players[socket.id] = { x, y, symbol: 'P' };
    
    // Send the full game state, including obstacles
    socket.emit('gameState', gameState);
  });

  socket.on('movePlayer', (direction) => {
    console.log('Move player:', socket.id, direction);
    const player = gameState.players[socket.id];
    if (player) {
      const newX = Math.max(0, Math.min(direction.x, mapSize.width - 1));
      const newY = Math.max(0, Math.min(direction.y, mapSize.height - 1));
      
      // Check for collisions with obstacles
      const obstacleCollision = gameState.obstacles.some(obstacle => 
        obstacle.x === newX && obstacle.y === newY
      );
      
      if (!obstacleCollision) {
        player.x = newX;
        player.y = newY;
        
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
    }
  });

  socket.on('restartGame', () => {
    console.log('Restarting game for player:', socket.id);
    gameState.gameOver = false;
    gameState.score = 0;
    let x, y;
    do {
      x = Math.floor(Math.random() * mapSize.width);
      y = Math.floor(Math.random() * mapSize.height);
    } while (gameState.obstacles.some(obstacle => obstacle.x === x && obstacle.y === y));

    gameState.players[socket.id] = { x, y, symbol: 'P' };
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
  // Send the full game state, including obstacles
  io.emit('gameState', gameState);
}, 1000); // Update every second

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
