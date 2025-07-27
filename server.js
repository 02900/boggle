const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Lógica del juego de Boggle
class BoggleGame {
  constructor() {
    this.board = [];
    this.players = new Map();
    this.gameState = 'waiting'; // esperando, jugando, terminado
    this.timeLeft = 180; // 3 minutos
    this.timer = null;
    this.words = new Set(); // Palabras válidas del diccionario (simplificado para demo)
    this.initializeDictionary();
  }

  initializeDictionary() {
    try {
      // Leer el archivo de palabras completo en español
      const dictionaryPath = path.join(__dirname, 'file-2017.txt');
      const fileContent = fs.readFileSync(dictionaryPath, 'utf8');
      
      // Dividir por líneas y filtrar palabras válidas
      const allWords = fileContent
        .split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => {
          // Filtrar palabras de 3 o más caracteres para Boggle
          return word.length >= 3 && word.length <= 16 && /^[a-záéíóúñü]+$/.test(word);
        });
      
      this.words = new Set(allWords);
      console.log(`Diccionario cargado: ${this.words.size} palabras válidas`);
    } catch (error) {
      console.error('Error al cargar el diccionario:', error);
      // Fallback a diccionario básico si hay error
      const basicWords = [
        'gato', 'perro', 'casa', 'mesa', 'silla', 'agua', 'fuego', 'tierra', 'aire',
        'amor', 'tiempo', 'lugar', 'cosa', 'persona', 'animal', 'planta', 'comida'
      ];
      this.words = new Set(basicWords);
    }
  }

  // Configuración de los 16 dados de Boggle
  getDiceConfiguration() {
    return [
      ['A', 'E', 'O', 'S', 'N', 'R'],
      ['A', 'E', 'I', 'O', 'U', 'L'],
      ['D', 'E', 'R', 'L', 'A', 'S'],
      ['N', 'C', 'I', 'O', 'E', 'T'],
      ['B', 'U', 'M', 'A', 'R', 'O'],
      ['QU', 'E', 'I', 'T', 'A', 'S'],
      ['G', 'L', 'E', 'A', 'N', 'O'],
      ['CH', 'A', 'R', 'E', 'I', 'S'],
      ['P', 'O', 'L', 'A', 'S', 'U'],
      ['V', 'E', 'R', 'A', 'I', 'D'],
      ['M', 'E', 'N', 'T', 'O', 'A'],
      ['Z', 'A', 'QU', 'U', 'E', 'N'],
      ['H', 'O', 'S', 'T', 'I', 'A'],
      ['F', 'A', 'L', 'D', 'E', 'I'],
      ['LL', 'A', 'O', 'R', 'I', 'S'],
      ['Ñ', 'C', 'E', 'A', 'N', 'O']
    ];
  }

  // Lanzar los dados y generar el tablero
  generateBoard() {
    const dice = this.getDiceConfiguration();
    const diceRolls = [];
    
    // Mezclar los dados para posiciones aleatorias
    const shuffledDice = [...dice].sort(() => Math.random() - 0.5);
    
    this.board = [];
    let diceIndex = 0;
    
    for (let i = 0; i < 4; i++) {
      const row = [];
      for (let j = 0; j < 4; j++) {
        const currentDie = shuffledDice[diceIndex];
        const rolledFace = Math.floor(Math.random() * 6);
        const letter = currentDie[rolledFace];
        
        row.push(letter);
        diceRolls.push({
          diceNumber: diceIndex + 1,
          position: { row: i, col: j },
          faces: currentDie,
          rolledFace: rolledFace,
          letter: letter
        });
        
        diceIndex++;
      }
      this.board.push(row);
    }
    
    // Guardar información del lanzamiento para enviar a los clientes
    this.lastDiceRolls = diceRolls;
    return diceRolls;
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
    
    const diceRolls = this.generateBoard();
    this.gameState = 'playing';
    this.timeLeft = 180;
    
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
    
    return { success: true, diceRolls };
  }

  endGame() {
    this.gameState = 'finished';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  submitWord(playerId, word, path) {
    if (this.gameState !== 'playing') return { valid: false, reason: 'Juego no activo' };
    
    const player = this.players.get(playerId);
    if (!player) return { valid: false, reason: 'Jugador no encontrado' };
    
    word = word.toLowerCase();
    
    // Verificar si la palabra ya fue encontrada por este jugador
    if (player.wordsFound.includes(word)) {
      return { valid: false, reason: 'Palabra ya encontrada' };
    }
    
    // Verificar longitud mínima
    if (word.length < 3) {
      return { valid: false, reason: 'Palabra muy corta' };
    }
    
    // Verificar si la palabra está en el diccionario
    if (!this.words.has(word)) {
      return { valid: false, reason: 'Palabra no está en el diccionario' };
    }
    
    // Validar ruta en el tablero
    if (!this.isValidPath(path, word)) {
      return { valid: false, reason: 'Ruta inválida en el tablero' };
    }
    
    // Agregar palabra y calcular puntuación
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
      timeLeft: this.timeLeft,
      diceRolls: this.lastDiceRolls || []
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
      const result = game.startGame();
      if (result.success) {
        // Primero enviar la información de los dados para la animación
        io.emit('dice-rolling', result.diceRolls);
        
        // Después de un breve delay, enviar el estado del juego iniciado
        setTimeout(() => {
          io.emit('game-started', game.getGameState());
        }, 3000); // 3 segundos para la animación de dados
        
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
