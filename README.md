# Boggle Game - Multiplayer Real-time Word Game

A real-time multiplayer Boggle word game built with Next.js and Socket.IO. Players compete to find words on a 4x4 letter grid with Spanish dictionary validation and persistent scoring.

## 🎮 Game Features

- **Real-time Multiplayer**: Multiple players can join and play simultaneously
- **Animated Dice Rolling**: Realistic dice animation when starting games
- **Spanish Dictionary**: Word validation against a comprehensive Spanish word list
- **Persistent Scoreboard**: Top 10 scores saved permanently
- **Board Rotation**: Players can rotate the board 90° with cooldown mechanics
- **Random Names**: Automatic assignment of creative player names
- **Live Updates**: Real-time game state synchronization across all players

## 🏗️ System Architecture

### Backend Architecture (`server.js`)

The backend is built on Node.js with the following key components:

#### **BoggleGame Class**
- **Game State Management**: Handles `waiting`, `playing`, and `finished` states
- **Board Generation**: Uses authentic Boggle dice configuration for 4x4 grid
- **Word Validation**: Validates words against Spanish dictionary and board paths
- **Player Management**: Tracks connected players with unique random names
- **Scoring System**: Points based on word length (3+ letters)
- **Board Rotation**: 90° clockwise rotation with 30-second cooldown

#### **Real-time Communication (Socket.IO)**
- **Player Events**: `join-game`, `start-game`, `submit-word`, `rotate-board`
- **Game Events**: `game-started`, `timer-update`, `game-ended`, `board-rotated`
- **Scoreboard Events**: `get-scoreboard`, `scoreboard-data`

#### **Persistent Storage**
- **Scoreboard**: JSON file storage (`scoreboard.json`) for top 10 scores
- **Dictionary**: Large Spanish word list loaded from `file-2017.txt`

### Frontend Architecture (Next.js + React)

#### **Core Components**
- **`BoggleGameMain.tsx`**: Main game orchestrator and state management
- **`GameBoard.tsx`**: Interactive 4x4 letter grid with path selection
- **`DiceRollingAnimation.tsx`**: Animated dice rolling sequence
- **`Scoreboard.tsx`**: Persistent leaderboard display
- **`GameControls.tsx`**: Game actions (start, reset, rotate)
- **`PlayersList.tsx`**: Connected players display
- **`FoundWords.tsx`**: Player's discovered words list

#### **State Management**
- **Socket.IO Client**: Real-time communication with backend
- **React Hooks**: Custom hooks in `src/hooks/` for game state
- **TypeScript Interfaces**: Type definitions in `src/interfaces/`

#### **Styling & UI**
- **Tailwind CSS 4**: Modern utility-first styling
- **Responsive Design**: Mobile and desktop optimized
- **Animations**: Smooth transitions and dice rolling effects

### Project Structure

```
boggle-game/
├── server.js                 # Node.js + Socket.IO backend
├── src/
│   ├── app/                  # Next.js app router
│   │   ├── page.tsx         # Landing page
│   │   ├── lobby/           # Game lobby
│   │   └── game/            # Main game page
│   ├── components/          # React components
│   │   ├── BoggleGameMain.tsx
│   │   ├── GameBoard.tsx
│   │   ├── DiceRollingAnimation.tsx
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   ├── interfaces/          # TypeScript definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
├── scoreboard.json          # Persistent scores
├── file-2017.txt           # Spanish dictionary
└── package.json            # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd boggle-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

```bash
npm run build
npm start
```

## 🎯 How to Play

1. **Join Game**: Enter your name or get a random one assigned
2. **Start Game**: Any player can start a new round
3. **Find Words**: Click letters to form words (minimum 3 letters)
4. **Submit Words**: Valid words add to your score
5. **Rotate Board**: Use the rotate button (30s cooldown)
6. **Win**: Highest score when time runs out wins!

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.4.4, React 19.1.0, TypeScript
- **Backend**: Node.js, Socket.IO 4.7.5
- **Styling**: Tailwind CSS 4
- **Real-time**: WebSocket communication
- **Storage**: JSON file-based persistence
- **Dictionary**: Spanish word validation

## 📊 Game Mechanics

- **Timer**: 3 minutes + 8 seconds for dice animation
- **Scoring**: 3-letter words = 1 point, 4-letter = 1 point, 5-letter = 2 points, etc.
- **Board**: Authentic Boggle dice configuration
- **Validation**: Words must exist in Spanish dictionary and follow valid board paths
- **Multiplayer**: Unlimited concurrent players

## 🔧 Development

### Key Files to Modify
- `server.js`: Backend game logic and Socket.IO events
- `src/components/BoggleGameMain.tsx`: Main game component
- `src/components/GameBoard.tsx`: Board interaction logic
- `src/app/globals.css`: Global styles

### Adding Features
- New Socket.IO events in `server.js`
- React components in `src/components/`
- Game logic in `BoggleGame` class
- UI styling with Tailwind classes
