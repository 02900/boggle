const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Boggle game logic
class BoggleGame {
  constructor() {
    this.board = [];
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, playing, finished
    this.timeLeft = 180; // 3 minutes
    this.timer = null;
    this.words = new Set(); // Valid dictionary words (simplified for demo)
    this.initializeDictionary();
  }

  initializeDictionary() {
    // Simplified word list for demo - in production, use a proper dictionary
    const commonWords = [
      'cat', 'dog', 'run', 'jump', 'play', 'game', 'word', 'find', 'look', 'see',
      'big', 'small', 'fast', 'slow', 'good', 'bad', 'new', 'old', 'hot', 'cold',
      'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink',
      'house', 'tree', 'book', 'car', 'bike', 'phone', 'computer', 'table',
      'chair', 'door', 'window', 'light', 'water', 'fire', 'earth', 'air',
      'love', 'hate', 'happy', 'sad', 'angry', 'calm', 'peace', 'war',
      'time', 'space', 'place', 'thing', 'person', 'animal', 'plant', 'food'
    ];
    this.words = new Set(commonWords);
  }

  generateBoard() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const vowels = 'AEIOU';
    this.board = [];
    
    for (let i = 0; i < 4; i++) {
      const row = [];
      for (let j = 0; j < 4; j++) {
        // Ensure some vowels for better word formation
        if (Math.random() < 0.3) {
          row.push(vowels[Math.floor(Math.random() * vowels.length)]);
        } else {
          row.push(letters[Math.floor(Math.random() * letters.length)]);
        }
      }
      this.board.push(row);
    }
  }

  addPlayer(playerId, playerName) {
    this.players.set(playerId, {
      id: playerId,
      name: playerName,
      score: 0,
      wordsFound: []
    });
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  startGame() {
    if (this.players.size < 1) return false;
    
    this.generateBoard();
    this.gameState = 'playing';
    this.timeLeft = 180;
    
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
    
    return true;
  }

  endGame() {
    this.gameState = 'finished';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  submitWord(playerId, word, path) {
    if (this.gameState !== 'playing') return { valid: false, reason: 'Game not active' };
    
    const player = this.players.get(playerId);
    if (!player) return { valid: false, reason: 'Player not found' };
    
    word = word.toLowerCase();
    
    // Check if word already found by this player
    if (player.wordsFound.includes(word)) {
      return { valid: false, reason: 'Word already found' };
    }
    
    // Check minimum length
    if (word.length < 3) {
      return { valid: false, reason: 'Word too short' };
    }
    
    // Check if word is in dictionary
    if (!this.words.has(word)) {
      return { valid: false, reason: 'Word not in dictionary' };
    }
    
    // Validate path on board
    if (!this.isValidPath(path, word)) {
      return { valid: false, reason: 'Invalid path on board' };
    }
    
    // Add word and calculate score
    player.wordsFound.push(word);
    const points = this.calculatePoints(word);
    player.score += points;
    
    return { valid: true, points, word };
  }

  isValidPath(path, word) {
    if (path.length !== word.length) return false;
    
    // Check if path is valid (adjacent cells, no repeats)
    const used = new Set();
    
    for (let i = 0; i < path.length; i++) {
      const [row, col] = path[i];
      
      // Check bounds
      if (row < 0 || row >= 4 || col < 0 || col >= 4) return false;
      
      // Check if cell already used
      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) return false;
      used.add(cellKey);
      
      // Check if letter matches
      if (this.board[row][col].toLowerCase() !== word[i].toLowerCase()) return false;
      
      // Check adjacency (except for first cell)
      if (i > 0) {
        const [prevRow, prevCol] = path[i - 1];
        const rowDiff = Math.abs(row - prevRow);
        const colDiff = Math.abs(col - prevCol);
        
        if (rowDiff > 1 || colDiff > 1 || (rowDiff === 0 && colDiff === 0)) {
          return false;
        }
      }
    }
    
    return true;
  }

  calculatePoints(word) {
    const length = word.length;
    if (length <= 4) return 1;
    if (length === 5) return 2;
    if (length === 6) return 3;
    if (length === 7) return 5;
    return 11; // 8+ letters
  }

  getGameState() {
    return {
      board: this.board,
      players: Array.from(this.players.values()),
      gameState: this.gameState,
      timeLeft: this.timeLeft
    };
  }

  resetGame() {
    this.board = [];
    this.gameState = 'waiting';
    this.timeLeft = 180;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    // Reset player scores but keep players
    for (const player of this.players.values()) {
      player.score = 0;
      player.wordsFound = [];
    }
  }
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);
  
  const game = new BoggleGame();

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('join-game', (playerName) => {
      game.addPlayer(socket.id, playerName || `Player ${socket.id.slice(0, 6)}`);
      socket.emit('game-state', game.getGameState());
      socket.broadcast.emit('player-joined', {
        playerId: socket.id,
        playerName: playerName || `Player ${socket.id.slice(0, 6)}`
      });
    });

    socket.on('start-game', () => {
      if (game.startGame()) {
        io.emit('game-started', game.getGameState());
        
        // Send timer updates
        const timerInterval = setInterval(() => {
          if (game.gameState === 'playing') {
            io.emit('timer-update', game.timeLeft);
          } else {
            clearInterval(timerInterval);
            if (game.gameState === 'finished') {
              io.emit('game-ended', game.getGameState());
            }
          }
        }, 1000);
      }
    });

    socket.on('submit-word', ({ word, path }) => {
      const result = game.submitWord(socket.id, word, path);
      socket.emit('word-result', result);
      
      if (result.valid) {
        socket.broadcast.emit('player-scored', {
          playerId: socket.id,
          word: result.word,
          points: result.points
        });
        io.emit('game-state', game.getGameState());
      }
    });

    socket.on('reset-game', () => {
      game.resetGame();
      io.emit('game-reset', game.getGameState());
    });

    socket.on('disconnect', () => {
      console.log('Player disconnected:', socket.id);
      game.removePlayer(socket.id);
      socket.broadcast.emit('player-left', socket.id);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
