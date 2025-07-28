const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Archivo para persistir el scoreboard
const SCOREBOARD_FILE = path.join(__dirname, 'scoreboard.json');

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const TIME_LIMIT = 18; // 3 minutos + 8 segundos de animación inicial

// Lista de nombres predefinidos
const RANDOM_NAMES = [
  'ShadowHunter', 'StormRider', 'FireWolf', 'IceBreaker', 'ThunderBolt',
  'NightCrawler', 'BlazeFury', 'FrostBite', 'WindWalker', 'EarthShaker',
  'VoidStrike', 'FlameGuard', 'MistWalker', 'RockSlide', 'LightBringer',
  'DarkViper', 'SteelClaw', 'GhostRider', 'StarGazer', 'MoonBeam',
  'SunFlare', 'SkySword', 'DeepDiver', 'HighFlyer', 'FastTrack',
  'QuickShot', 'SharpEye', 'BoldMove', 'WildCard', 'FreeSpirit',
  'BraveHeart', 'TrueAim', 'SwiftArrow', 'StrongArm', 'ClearMind',
  'PureSoul', 'WiseOwl', 'CleverFox', 'MightyLion', 'FierceTiger',
  'GentleGiant', 'SilentNinja', 'LoudThunder', 'CalmStorm', 'WarmIce',
  'ColdFire', 'BrightDark', 'SoftSteel', 'HardCloud', 'LightShadow',
  'HeavyFeather', 'SlowFlash', 'QuietRoar', 'TallShort', 'BigSmall',
  'OldNew', 'FarNear', 'UpDown', 'LeftRight', 'InOut',
  'YesNo', 'OnOff', 'HotCold', 'WetDry', 'LoudQuiet',
  'FastSlow', 'HighLow', 'BigLittle', 'LongShort', 'WideNarrow',
  'ThickThin', 'HeavyLight', 'HardSoft', 'RoughSmooth', 'SharpDull',
  'BrightDim', 'ClearBlur', 'CleanDirty', 'FreshStale', 'NewOld',
  'YoungOld', 'StrongWeak', 'RichPoor', 'FullEmpty', 'OpenClosed',
  'FreeTrapped', 'SafeDanger', 'GoodBad', 'RightWrong', 'TrueFalse',
  'RealFake', 'LiveDead', 'HealthySick', 'HappySad', 'LoveLate',
  'PeaceWar', 'HopeHear', 'FaithDoubt', 'TrustLie', 'KindMean'
];

// Funciones para manejar el scoreboard persistente
function loadScoreboard() {
  try {
    if (fs.existsSync(SCOREBOARD_FILE)) {
      const data = fs.readFileSync(SCOREBOARD_FILE, 'utf8');
      return JSON.parse(data);
    } else {
      // Si el archivo no existe, crearlo con un array vacío
      const emptyScoreboard = [];
      fs.writeFileSync(SCOREBOARD_FILE, JSON.stringify(emptyScoreboard, null, 2));
      console.log('Archivo de scoreboard creado:', SCOREBOARD_FILE);
      return emptyScoreboard;
    }
  } catch (error) {
    console.error('Error al cargar scoreboard:', error);
  }
  return [];
}

function saveScoreboard(scoreboard) {
  try {
    fs.writeFileSync(SCOREBOARD_FILE, JSON.stringify(scoreboard, null, 2));
  } catch (error) {
    console.error('Error al guardar scoreboard:', error);
  }
}

function updateScoreboard(playerScores) {
  const scoreboard = loadScoreboard();
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Agregar nuevos puntajes
  playerScores.forEach(({ name, score }) => {
    if (score > 0) { // Solo agregar si el puntaje es mayor a 0
      scoreboard.push({
        name,
        score,
        date: currentDate
      });
    }
  });
  
  // Ordenar por puntaje descendente y mantener solo los top 10
  scoreboard.sort((a, b) => b.score - a.score);
  const top10 = scoreboard.slice(0, 10);
  
  saveScoreboard(top10);
  return top10;
}

// Lógica del juego de Boggle
class BoggleGame {
  constructor() {
    this.board = [];
    this.players = new Map();
    this.gameState = 'waiting'; // esperando, jugando, terminado
    this.timeLeft = TIME_LIMIT; // 3 minutos
    this.timer = null;
    this.words = new Set(); // Palabras válidas del diccionario (simplificado para demo)
    this.lastRotationTime = 0; // Timestamp de la última rotación
    this.rotationCooldown = 30000; // 30 segundos en milisegundos
    this.availableNames = [...RANDOM_NAMES]; // Copia de nombres disponibles
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

  // Obtener un nombre aleatorio único de la lista disponible
  getRandomName() {
    if (this.availableNames.length === 0) {
      // Si se agotaron los nombres, reiniciar la lista
      this.availableNames = [...RANDOM_NAMES];
    }
    
    const randomIndex = Math.floor(Math.random() * this.availableNames.length);
    const selectedName = this.availableNames[randomIndex];
    
    // Remover el nombre de la lista de disponibles
    this.availableNames.splice(randomIndex, 1);
    
    return selectedName;
  }

  // Liberar un nombre cuando un jugador se desconecta
  releaseName(playerName) {
    if (RANDOM_NAMES.includes(playerName) && !this.availableNames.includes(playerName)) {
      this.availableNames.push(playerName);
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
    const player = this.players.get(playerId);
    if (player) {
      // Liberar el nombre para que pueda ser reutilizado
      this.releaseName(player.name);
      this.players.delete(playerId);
    }
  }

  startGame() {
    if (this.players.size < 1) return false;
    
    const diceRolls = this.generateBoard();
    this.gameState = 'playing';
    this.timeLeft = TIME_LIMIT;
    
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
    
    // Actualizar scoreboard con los puntajes de esta partida
    const playerScores = Array.from(this.players.values()).map(player => ({
      name: player.name,
      score: player.score
    }));
    
    updateScoreboard(playerScores);
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
    // Construir la palabra desde el path para manejar dígrafos
    let pathWord = '';
    const used = new Set();
    
    for (let i = 0; i < path.length; i++) {
      const [row, col] = path[i];
      
      // Check bounds
      if (row < 0 || row >= 4 || col < 0 || col >= 4) return false;
      
      // Check if cell already used
      const cellKey = `${row},${col}`;
      if (used.has(cellKey)) return false;
      used.add(cellKey);
      
      // Agregar la letra/dígrafo de esta celda a la palabra del path
      const cellLetter = this.board[row][col].toLowerCase();
      pathWord += cellLetter;
      
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
    
    // Comparar la palabra construida desde el path con la palabra enviada
    return pathWord === word.toLowerCase();
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
    this.timeLeft = TIME_LIMIT;
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
  
  // Rotar el tablero 90 grados en sentido horario
  rotateBoard() {
    const now = Date.now();
    
    // Verificar cooldown
    if (now - this.lastRotationTime < this.rotationCooldown) {
      const remainingTime = Math.ceil((this.rotationCooldown - (now - this.lastRotationTime)) / 1000);
      return { success: false, reason: `Debes esperar ${remainingTime} segundos antes de rotar nuevamente` };
    }
    
    // Solo permitir rotación durante el juego
    if (this.gameState !== 'playing') {
      return { success: false, reason: 'Solo se puede rotar el tablero durante el juego' };
    }
    
    // Crear nuevo tablero rotado 90 grados en sentido horario
    const rotatedBoard = [];
    for (let i = 0; i < 4; i++) {
      rotatedBoard[i] = [];
      for (let j = 0; j < 4; j++) {
        // Para rotar 90° horario: nuevo[i][j] = original[4-1-j][i]
        rotatedBoard[i][j] = this.board[4 - 1 - j][i];
      }
    }
    
    this.board = rotatedBoard;
    this.lastRotationTime = now;
    
    return { success: true, cooldownTime: this.rotationCooldown / 1000 };
  }

  // Encontrar todas las palabras posibles en el tablero y calcular puntuación máxima
  findAllPossibleWords() {
    const allWords = [];
    const visited = Array(4).fill().map(() => Array(4).fill(false));
    
    // Función recursiva para explorar todos los caminos posibles
    const dfs = (row, col, currentWord, currentPath) => {
      // Marcar celda como visitada
      visited[row][col] = true;
      
      // Agregar letra actual a la palabra
      const cellLetter = this.board[row][col].toLowerCase();
      currentWord += cellLetter;
      currentPath.push([row, col]);
      
      // Si la palabra tiene 3+ letras y está en el diccionario, agregarla
      if (currentWord.length >= 3 && this.words.has(currentWord)) {
        allWords.push({
          word: currentWord,
          path: [...currentPath],
          points: this.calculatePoints(currentWord)
        });
      }
      
      // Explorar celdas adyacentes
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue; // Skip current cell
          
          const newRow = row + dr;
          const newCol = col + dc;
          
          // Verificar límites y que no esté visitada
          if (newRow >= 0 && newRow < 4 && newCol >= 0 && newCol < 4 && !visited[newRow][newCol]) {
            dfs(newRow, newCol, currentWord, currentPath);
          }
        }
      }
      
      // Desmarcar celda (backtrack)
      visited[row][col] = false;
      currentPath.pop();
    };
    
    // Iniciar búsqueda desde cada celda del tablero
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        dfs(row, col, '', []);
      }
    }
    
    // Remover duplicados (misma palabra puede encontrarse por diferentes caminos)
    const uniqueWords = new Map();
    allWords.forEach(wordData => {
      if (!uniqueWords.has(wordData.word) || uniqueWords.get(wordData.word).points < wordData.points) {
        uniqueWords.set(wordData.word, wordData);
      }
    });
    
    const finalWords = Array.from(uniqueWords.values());
    const maxScore = finalWords.reduce((total, wordData) => total + wordData.points, 0);
    
    return {
      words: finalWords.sort((a, b) => b.points - a.points || a.word.localeCompare(b.word)),
      maxScore,
      totalWords: finalWords.length
    };
  }
}

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);
  
  const game = new BoggleGame();

  io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('join-game', (playerName) => {
      // Si no se proporciona nombre o está vacío, asignar uno aleatorio
      const finalName = (playerName && playerName.trim()) ? playerName.trim() : game.getRandomName();
      
      game.addPlayer(socket.id, finalName);
      socket.emit('game-state', game.getGameState());
      socket.broadcast.emit('player-joined', {
        playerId: socket.id,
        playerName: finalName
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
    
    socket.on('rotate-board', () => {
      const result = game.rotateBoard();
      if (result.success) {
        // Enviar el tablero rotado a todos los jugadores
        io.emit('board-rotated', {
          board: game.board,
          cooldownTime: result.cooldownTime
        });
      } else {
        // Enviar mensaje de error solo al jugador que intentó rotar
        socket.emit('rotation-error', {
          message: result.reason
        });
      }
    });

    socket.on('get-scoreboard', () => {
      const scoreboard = loadScoreboard();
      socket.emit('scoreboard-data', scoreboard);
    });

    socket.on('get-max-score', () => {
      const maxScoreData = game.findAllPossibleWords();
      socket.emit('max-score-data', maxScoreData);
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
