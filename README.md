# Boggle - Multiplayer Word Game

Real-time multiplayer Boggle game with Spanish dictionary validation, authentic dice board, and persistent scoreboard.

## Features

- **Real-time multiplayer** via Socket.IO
- **Authentic Boggle dice** with Spanish digraphs (QU, CH, LL, Ñ)
- **Spanish dictionary** with ~60,000 words
- **Optional client-side validation** for immediate feedback
- **Dice rolling animation** when starting a game
- **Board rotation** 90° with 30-second cooldown
- **Common word elimination** for words found by multiple players
- **Persistent scoreboard** with top 50 scores
- **Win streaks** in 6-hour sessions
- **Responsive design** with desktop and mobile views
- **Sensory feedback** with sounds and haptic vibration

## Tech Stack

| Technology | Version | Usage |
|-----------|---------|-------|
| Next.js | 15.4.4 | Frontend framework |
| React | 19.1.1 | UI |
| TypeScript | 5.8.3 | Static typing |
| Zustand | 5.0.6 | Global state |
| Socket.IO | 4.8.1 | Real-time communication |
| Tailwind CSS | 4.1.11 | Styles |
| Vitest | 4.1.0 | Testing |
| Node.js | 22+ | Server runtime |

## Project Structure

```
boggle/
├── server.js                 # Node.js + Socket.IO server
├── game/                     # Game logic (backend)
│   ├── BoggleGame.js         # Main game engine
│   └── gameConfig.js         # Dice and scoring
├── socket/                   # WebSocket events
│   └── socketHandlers.js     # Event handlers
├── config/                   # Constants
│   └── constants.js          # Timers, cooldowns, flags
├── utils/                    # Backend utilities
├── data/                     # Persistent data (streaks)
├── src/                      # Frontend (Next.js + TypeScript)
│   ├── app/                  # App router
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   ├── stores/               # Zustand stores
│   ├── services/             # Services (dictionary)
│   ├── utils/                # Frontend utilities
│   └── interfaces/           # TypeScript types
├── docs/                     # Technical documentation
├── scoreboard.json           # Persistent leaderboard
└── file-2017.txt             # Spanish dictionary
```

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production

```bash
pnpm build
pnpm start
```

### Tests

```bash
pnpm test        # Watch mode
pnpm test:run    # Single run
```

## How to Play

1. Enter your name or generate a random one
2. Any player can start the game
3. Select adjacent cells to form words (mouse, touch, or keyboard)
4. Words must be at least 3 letters long and exist in the dictionary
5. Use the rotation button to change the board perspective
6. The player with the highest score when the 3 minutes are up wins

## Scoring

| Length | Points |
|--------|--------|
| 3-4 letters | 1 |
| 5 letters | 2 |
| 6 letters | 3 |
| 7 letters | 5 |
| 8+ letters | 11 |

## Documentation

Detailed technical documentation in [`docs/`](./docs/README.md):

- [Architecture](./docs/architecture.md)
- [Game Engine](./docs/backend/game-engine.md)
- [Socket Events](./docs/backend/socket-handlers.md)
- [Stores](./docs/frontend/stores.md)
- [Hooks](./docs/frontend/hooks.md)
- [Components](./docs/frontend/components.md)
- [TypeScript Types](./docs/types.md)

## Scripts

| Script | Description |
|--------|------------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Production server |
| `pnpm lint` | Linting with ESLint |
| `pnpm test` | Tests in watch mode |
| `pnpm test:run` | Single test run |
