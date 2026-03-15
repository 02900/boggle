  4. Limpiar as any en tests (~29 instancias) — crear interfaces de mock tipadas para MockSocket, MockIO, MockGame compartidas entre todos los
  test files de socket.
  5. UI para asignar letra a ficha blanca — ScrabbleTile.assignedLetter existe en el tipo pero no hay modal/UI para que el jugador elija qué
  letra representará.
  6. Visor de historial de jugadas — moveHistory se guarda en el backend pero no hay UI para ver las jugadas pasadas.
  7. Grace period de desconexión — el plan menciona 30s de gracia cuando un jugador se desconecta durante su turno, pero la implementación
  actual usa el timeout normal del turno.
  8. Intercambio selectivo de fichas — el botón "Cambiar" actualmente intercambia TODAS las fichas. La UI debería permitir seleccionar cuáles
  intercambiar.

  ---
  Polish y calidad

  9. Testing mobile real — componentes diseñados para mobile (sin drag-and-drop) pero sin pruebas en dispositivos reales.
  10. Accesibilidad (WCAG) — tablero 15x15 con celdas pequeñas, necesita keyboard navigation y screen reader support.
  11. Navegación de vuelta — no hay botón "Volver al menú" desde dentro de un juego.
  12. Scoreboard por juego — actualmente Boggle y Scrabble comparten el mismo scoreboard.json. Deberían tener scoreboards separados.
