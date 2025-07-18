# Documentación del Script JavaScript de Diamond Mines

Este documento describe el funcionamiento y la lógica implementada en `app.js` para el juego Diamond Mines.

---

## 1. Configuración y Estados del Juego

### GAME_CONFIG
Objeto de configuración global que define parámetros clave:

- `boardSize`: Tamaño del tablero NxN.
- `initialBalance`: Balance inicial del jugador.
- `minBet` / `maxBet`: Límite inferior y superior de apuesta.
- `balanceThresholds`: Umbrales para forzar victoria (`forceWin`) o pérdida (`forceLoss`), y balance máximo.
- `multipliers`: Base de multiplicador (`base`) y factores de riesgo según número de minas.

### GAME_STATES
Constantes que representan los estados del juego:
- `READY`: Listo para apostar.
- `PLAYING`: Partida en curso.
- `WON`: Victoria (todos los diamantes encontrados).
- `LOST`: Derrota (mina pisada).
- `CASHED_OUT`: Jugador retiró ganancias.

---

## 2. Clase `DiamondMinesGame`
Encapsula toda la lógica de inicialización, interacción y actualización de la interfaz.

### Atributos principales
- `balance`, `currentBet`, `selectedMines`, `multiplier`, `diamondsFound`, `totalDiamonds`
- `cells`: Array de objetos con `{ element, revealed, hasMine }`.
- `minePositions`: Índices de celdas que contienen minas.

### Métodos clave

1. **initializeGame()**
   - Crea el tablero.
   - Vincula eventos de botones e inputs.
   - Dibuja el estado inicial de la UI.

2. **createGameBoard()**
   - Genera N  N celdas en el DOM.
   - Guarda referencias en `this.cells`.

3. **bindEvents()**
   - Escucha clicks en botones `½`, `2×`, `Iniciar Juego` y `Cash Out`.
   - Controla cambios en el input de apuesta y selección de minas.

4. **startGame()**
   - Valida y fija la apuesta.
   - Resta la apuesta del balance.
   - Pasa a estado `PLAYING`.
   - Reinicia contadores y reparto de minas.

5. **generateMinePositions()**
   - Selecciona aleatoriamente posiciones únicas para las minas.

6. **handleCellClick(index)**
   - Evita acción si ya revelado o fuera de juego.
   - Llama a `manipulateMines()` para ajuste de odds.
   - Revela la celda: mina o diamante.
   - Si es diamante aumenta contadores y multiplica.
   - Si todas encontradas, invoca `endGame(true)`.

7. **manipulateMines(clickedIndex)**
   - Ajusta posición de minas según balance actual y umbrales:
     - Si balance bajo (`< forceWin`), reubica minas para favorecer victoria.
     - Si balance alto y posible pérdida futura, reubica para arriesgar derrota.
   - Mantiene control de `minePositions`.

8. **updateMultiplier()**
   - Calcula multiplicador: `base^diamondsFound * riesgo`.
   - Redondea a dos decimales.

9. **cashOut()**
   - Permite retirar ganancias parciales.
   - Cambia estado a `CASHED_OUT` y suma premios.
   - Tras retardo, resetea juego.

10. **endGame(won)**
    - Marca todas las celdas como inactivas.
    - Si perdió, muestra todas las minas.
    - Actualiza balance y mensaje.
    - Reinicia tras 3s.

11. **resetGame()**
    - Vuelve a estado `READY`, limpia tablero y contadores.

12. **updateUI() / updateStatusMessage()**
    - Refresca texto de balance, apuesta, multiplicador y número de minas.
    - Activa/desactiva controles según estado.
    - Cambia clase CSS del mensaje de estado (`won`, `lost`, `cashed-out`).

---

## 3. Lógica de Probabilidades y Control de Odds

La función `manipulateMines()` implementa un *AI rudimentario* que:

1. **Balance bajo** ➔ favorece victoria:
   - Si el jugador pisa una mina, mueve la mina a otra celda libre.
2. **Balance alto** ➔ arriesga derrota:
   - Si el jugador descubrió diamante, reubica otra mina sobre una celda inactiva.

Esto asegura dinámica adaptativa: permite remontar al jugador con poco balance, o pone en jaque cuando va muy alto.

---

*Fin de la documentación*
