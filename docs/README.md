# Boggle - Documentation

Technical documentation for the real-time multiplayer Boggle game.

## Table of Contents

### General

- [Architecture](./architecture.md) - General diagram, tech stack, and data flow

### Backend

- [Game Engine](./backend/game-engine.md) - BoggleGame class: lifecycle, validation, rotation, DFS
- [Socket Events](./backend/socket-handlers.md) - Client-server communication protocol
- [Configuration](./backend/configuration.md) - Constants, dice, scoring

### Frontend

- [Stores](./frontend/stores.md) - Zustand stores: global application state
- [Hooks](./frontend/hooks.md) - Custom hooks: game logic, sockets, validation
- [Services](./frontend/services.md) - DictionaryService: dictionary loading with cache and retry
- [Utilities](./frontend/utils.md) - Helper functions: scoring, validation, path checking
- [Components](./frontend/components.md) - React components: structure and responsibilities

### Scrabble

- [Estado actual y plan de mejora](./scrabble/estado-actual-y-plan.md) - Auditoría de lógica, UI/UX, estados intermedios y plan por fases
- [Protocolo de eventos socket](./scrabble/socket-events.md) - Eventos cliente↔server, ciclo de turno, presencia y reconexión

### Types

- [TypeScript Interfaces](./types.md) - Player, GameState, DiceRoll, WordResult, and events
