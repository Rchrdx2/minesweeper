/**
 * DIAMOND MINES GAME - JUEGO DE MINAS DE DIAMANTES
 * ================================================
 *
 * Este archivo contiene toda la lógica del juego Diamond Mines.
 * Es un juego de casino donde los jugadores deben encontrar diamantes
 * evitando las minas ocultas en un tablero de 5x5.
 *
 * Características principales:
 * - Sistema de balance en pesos colombianos
 * - Manipulación de minas basada en el balance del jugador
 * - Sistema de rangos dinámicos INVISIBLE con aumento paulatino de espacios
 * - Sistema de control de rachas en rango aleatorio
 * - Sistema de probabilidades dinámicas según balance
 * - Sistema de normalización por tiradas (20 tiradas aprox)
 * - Modal de límite máximo cuando se alcanzan $100.000
 * - Multiplicadores dinámicos basados en riesgo
 * - Protección contra balance cero (mínimo 5k)
 */

// Configuración principal del juego
const GAME_CONFIG = {
  boardSize: 5, // Tamaño del tablero (5x5 = 25 casillas)
  initialBalance: 50000, // Balance inicial: 50,000 pesos
  minBet: 1000, // Apuesta mínima: 1,000 pesos
  maxBet: 5000, // Apuesta máxima: 5,000 pesos
  // Umbrales de balance que controlan el comportamiento del juego
  balanceThresholds: {
    forceWin: 40000, // Por debajo de 40k: activar sistema
    maxBalance: 100000, // Límite máximo absoluto: 100,000 pesos
    minBalance: 5000, // Balance mínimo absoluto (no llegar a 0)
  },
  // ✅ Sistema de rangos dinámicos (INVISIBLE para el usuario)
  manipulation: {
    // Configuración de espacios destapables según balance
    balanceRanges: {
      35000: { maxSpaces: 3, description: "Balance alto - 3 espacios" },
      30000: { maxSpaces: 4, description: "Balance medio-alto - 4 espacios" },
      25000: { maxSpaces: 5, description: "Balance medio - 5 espacios" },
      20000: { maxSpaces: 6, description: "Balance medio-bajo - 6 espacios" },
      15000: { maxSpaces: 7, description: "Balance bajo - 7 espacios" },
      10000: { maxSpaces: 8, description: "Balance muy bajo - 8 espacios" },
      5000: { maxSpaces: 10, description: "Balance crítico - 10 espacios" },
    },
    defaultMaxSpaces: 3, // Valor por defecto
  },
  // ✅ Control de rachas en rango aleatorio
  streakControl: {
    maxConsecutiveCashouts: 2, // Máximo 3 cashouts seguidos
    forceEarlyLoss: true, // Forzar pérdida temprana cuando se active
    resetOnLoss: true, // Resetear contador al perder
  },
  // ✅ Rangos dinámicos para rango aleatorio (balance > 40k)
  randomRangeControl: {
    probabilityRanges: {
      // Rangos de balance y sus probabilidades de pérdida
      90000: {
        lossChance: 0.75,
        description: "Balance muy alto - 75% prob. pérdida",
      },
      80000: {
        lossChance: 0.65,
        description: "Balance alto - 65% prob. pérdida",
      },
      70000: {
        lossChance: 0.55,
        description: "Balance medio-alto - 55% prob. pérdida",
      },
      60000: {
        lossChance: 0.45,
        description: "Balance medio - 45% prob. pérdida",
      },
      50000: {
        lossChance: 0.35,
        description: "Balance bajo - 35% prob. pérdida",
      },
      40000: {
        lossChance: 0.25,
        description: "Balance mínimo - 25% prob. pérdida",
      },
    },
    defaultLossChance: 0.25, // Probabilidad por defecto
    enableDynamicLoss: true, // Activar sistema dinámico
  },
  // ✅ NUEVO: Sistema de normalización por tiradas
  normalization: {
    gameThreshold: 20, // Número de tiradas para normalizar
    resetProbabilities: true, // Resetear probabilidades al normalizar
    maintainOtherSystems: true, // Mantener otros sistemas activos
    enableNormalization: true, // Activar sistema de normalización
  },
  // Sistema de multiplicadores
  multipliers: {
    base: 1.1, // Multiplicador base que crece exponencialmente
    riskFactors: {
      // Factor de riesgo según cantidad de minas
      3: 1.3, // 3 minas = multiplicador x1.3
      4: 1.8, // 4 minas = multiplicador x1.8
      5: 2.3, // 5 minas = multiplicador x2.3
    },
  },
};

/**
 * Formatea un número como moneda en pesos colombianos
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como "$12.345"
 */
function formatCurrency(amount) {
  return `$${amount.toLocaleString("es-CO")}`;
}

/**
 * Estados posibles del juego
 * Controla qué acciones están disponibles en cada momento
 */
const GAME_STATES = {
  READY: "ready", // Listo para empezar una nueva ronda
  PLAYING: "playing", // Jugando activamente
  WON: "won", // Victoria (encontró todos los diamantes)
  LOST: "lost", // Derrota (tocó una mina)
  CASHED_OUT: "cashed_out", // Retiró ganancias antes de terminar
};

/**
 * Clase principal del juego Diamond Mines
 *
 * Maneja toda la lógica del juego incluyendo:
 * - Estado del tablero y las celdas
 * - Balance del jugador y apuestas
 * - Sistema de rangos dinámicos de manipulación (INVISIBLE)
 * - Sistema de control de rachas en rango aleatorio
 * - Sistema de probabilidades dinámicas
 * - Sistema de normalización por tiradas
 * - Sistema de victoria asegurada con límite variable
 * - Interfaz de usuario y eventos
 * - Sistema modal de límites
 */
class DiamondMinesGame {
  /**
   * Constructor - Inicializa una nueva instancia del juego
   */
  constructor() {
    // Estado actual del juego
    this.gameState = GAME_STATES.READY;

    // Variables financieras
    this.balance = GAME_CONFIG.initialBalance; // Balance del jugador
    this.currentBet = 0; // Apuesta actual

    // Variables de configuración de partida
    this.selectedMines = 3; // Cantidad de minas seleccionada (3, 4 o 5)
    this.multiplier = 1.0; // Multiplicador actual de ganancias

    // Variables de progreso de partida
    this.diamondsFound = 0; // Diamantes encontrados en la partida actual
    this.totalDiamonds = 0; // Total de diamantes en el tablero

    // Variables del tablero
    this.gameBoard = null; // Referencia al elemento del tablero
    this.cells = []; // Array con información de cada celda
    this.minePositions = []; // Posiciones donde están las minas

    // Variables del sistema de manipulación
    this.manipulationActive = false; // Si el sistema está activo
    this.consecutiveWins = 0; // Victorias consecutivas en el sistema

    // Variables para control de rachas en rango aleatorio
    this.consecutiveCashouts = 0; // Contador de cashouts seguidos
    this.forceNextLoss = false; // Bandera para forzar pérdida en próxima partida
    this.maxConsecutiveCashouts = 3; // Límite máximo de cashouts seguidos (3-4)

    // ✅ NUEVAS VARIABLES para control de tiradas y normalización
    this.totalGames = 0; // Contador total de tiradas/partidas
    this.normalizationThreshold = 20; // Umbral para normalizar (20 tiradas aprox)
    this.systemNormalized = false; // Si el sistema está normalizado

    // Inicializar el juego
    this.initializeGame();
  }

  /**
   * Inicializa el juego completo
   * Configura el tablero, eventos y interfaz inicial
   */
  initializeGame() {
    this.createGameBoard(); // Crear las celdas del tablero
    this.bindEvents(); // Configurar eventos de botones y controles
    this.updateUI(); // Actualizar la interfaz
    this.updateStatusMessage("Configura tu apuesta y comienza");
  }

  /**
   * Crea el tablero de juego con 25 celdas (5x5)
   * Cada celda es un div clickeable con sus propiedades
   */
  createGameBoard() {
    const boardElement = document.getElementById("gameBoard");
    boardElement.innerHTML = ""; // Limpiar contenido previo
    this.cells = [];

    // Crear 25 celdas (5x5)
    for (let i = 0; i < GAME_CONFIG.boardSize * GAME_CONFIG.boardSize; i++) {
      const cell = document.createElement("div");
      cell.className = "game-cell";
      cell.dataset.index = i; // Guardar índice para identificación

      // Agregar evento click a cada celda
      cell.addEventListener("click", () => this.handleCellClick(i));
      boardElement.appendChild(cell);

      // Guardar información de la celda
      this.cells.push({
        element: cell, // Elemento DOM
        revealed: false, // Si fue revelada o no
        hasMine: false, // Si contiene una mina
      });
    }
  }

  /**
   * Configura todos los eventos de la interfaz
   * Botones, radio buttons, inputs, etc.
   */
  bindEvents() {
    // Eventos de botones de apuesta
    document
      .getElementById("halveBet")
      .addEventListener("click", () => this.halveBet());
    document
      .getElementById("doubleBet")
      .addEventListener("click", () => this.doubleBet());

    // Eventos de botones de juego
    document
      .getElementById("startGame")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("cashOut")
      .addEventListener("click", () => this.cashOut());

    // Evento para cambio de cantidad de minas
    document.querySelectorAll('input[name="mines"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.selectedMines = parseInt(e.target.value, 10);
        this.updateUI(); // Actualizar interfaz cuando cambie la selección
      });
    });

    // Configurar validación del input de apuesta
    const betInput = document.getElementById("betAmount");

    /**
     * Valida que la cantidad de apuesta esté dentro de los límites
     * Se ejecuta en tiempo real mientras el usuario escribe
     */
    const validateBetAmount = () => {
      let value = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
      const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
      value = Math.max(GAME_CONFIG.minBet, Math.min(value, maxAllowedBet));
      betInput.value = value;
    };

    // Aplicar validación en tiempo real y al perder el foco
    betInput.addEventListener("input", validateBetAmount);
    betInput.addEventListener("blur", validateBetAmount);
  }

  /**
   * Reduce la apuesta a la mitad
   * Respeta el límite mínimo de apuesta
   */
  halveBet() {
    const betInput = document.getElementById("betAmount");
    let currentBet = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
    let newBet = Math.floor(currentBet / 2);
    betInput.value = Math.max(newBet, GAME_CONFIG.minBet);
  }

  /**
   * Duplica la apuesta actual
   * Respeta los límites máximos (5k o balance disponible)
   */
  doubleBet() {
    const betInput = document.getElementById("betAmount");
    let currentBet = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
    let newBet = currentBet * 2;
    const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
    betInput.value = Math.min(newBet, maxAllowedBet);
  }

  /**
   * ✅ ACTUALIZADO: Inicia una nueva partida
   * Ahora incluye el contador de tiradas y normalización
   */
  startGame() {
    const betInput = document.getElementById("betAmount");
    // Re-validar la apuesta justo antes de empezar
    let betAmount = parseInt(betInput.value, 10);
    const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
    betAmount = Math.max(
      GAME_CONFIG.minBet,
      Math.min(betAmount, maxAllowedBet),
    );
    betInput.value = betAmount;

    // Verificar que el jugador tenga suficiente balance
    if (betAmount > this.balance) {
      this.updateStatusMessage(
        "No tienes suficiente balance para esta apuesta.",
      );
      return;
    }

    // ✅ NUEVO: Incrementar contador de tiradas y verificar normalización
    this.incrementGameCounter();

    // Configurar estado de la nueva partida
    this.currentBet = betAmount;
    this.balance -= betAmount; // Descontar la apuesta del balance
    this.gameState = GAME_STATES.PLAYING;
    this.diamondsFound = 0;
    this.multiplier = 1.0;

    // Verificar si el sistema de manipulación debe activarse
    this.checkManipulationSystem();

    // Configurar el tablero con minas y diamantes
    this.setupBoard();
    this.updateUI();
    this.updateStatusMessage("Busca diamantes, evita las minas.");

    // Mostrar advertencia si el balance está bajo
    this.showBalanceWarning();
  }

  /**
   * Verifica si el sistema de manipulación debe activarse
   * Se activa cuando el balance está por debajo de 40k
   */
  checkManipulationSystem() {
    this.manipulationActive =
      this.balance < GAME_CONFIG.balanceThresholds.forceWin;
  }

  /**
   * ✅ NUEVO: Controla la normalización del sistema basada en tiradas
   * Desactiva las probabilidades dinámicas después de ~20 tiradas
   * Mantiene otros sistemas activos (rangos dinámicos y control de rachas)
   */
  checkSystemNormalization() {
    // Solo verificar si el sistema de normalización está habilitado
    if (!GAME_CONFIG.normalization.enableNormalization) {
      return;
    }

    // Verificar si se alcanzó el umbral de tiradas
    if (
      this.totalGames >= GAME_CONFIG.normalization.gameThreshold &&
      !this.systemNormalized
    ) {
      this.systemNormalized = true;

      // Deshabilitar probabilidades dinámicas
      if (GAME_CONFIG.normalization.resetProbabilities) {
        GAME_CONFIG.randomRangeControl.enableDynamicLoss = false;
      }

      // Log interno para debugging (invisible para el usuario)
      console.log(`Sistema normalizado después de ${this.totalGames} tiradas`);
    }
  }

  /**
   * ✅ NUEVO: Incrementa el contador de tiradas
   * Se llama al inicio de cada nueva partida
   */
  incrementGameCounter() {
    this.totalGames++;
    this.checkSystemNormalization();
  }

  /**
   * ✅ NUEVO: Obtiene información del estado del sistema
   * Útil para debugging y monitoreo interno
   *
   * @returns {Object} Información del estado actual del sistema
   */
  getSystemStatus() {
    return {
      totalGames: this.totalGames,
      systemNormalized: this.systemNormalized,
      probabilitiesActive: GAME_CONFIG.randomRangeControl.enableDynamicLoss,
      manipulationActive: this.manipulationActive,
      streakControlActive:
        this.balance >= GAME_CONFIG.balanceThresholds.forceWin,
      gamesUntilNormalization: Math.max(
        0,
        GAME_CONFIG.normalization.gameThreshold - this.totalGames,
      ),
    };
  }

  /**
   * ✅ Controla las rachas de cashouts en el rango aleatorio
   * Solo se activa cuando el balance > 40k (rango completamente aleatorio)
   *
   * @param {boolean} playerCashedOut - Si el jugador hizo cashout
   * @param {boolean} playerWon - Si el jugador ganó la partida
   */
  handleStreakControl(playerCashedOut, playerWon) {
    // Solo aplicar control de rachas en el rango aleatorio (balance > 40k)
    if (this.balance >= GAME_CONFIG.balanceThresholds.forceWin) {
      if (playerCashedOut || playerWon) {
        // Incrementar contador de cashouts/victorias seguidos
        this.consecutiveCashouts++;

        // Verificar si se alcanzó el límite (3-4 cashouts seguidos)
        if (
          this.consecutiveCashouts >=
          GAME_CONFIG.streakControl.maxConsecutiveCashouts
        ) {
          // Activar bandera para forzar pérdida en la siguiente partida
          this.forceNextLoss = true;

          // Resetear contador después de activar el sistema
          this.consecutiveCashouts = 0;
        }
      } else {
        // Si perdió, resetear contador y bandera
        this.consecutiveCashouts = 0;
        this.forceNextLoss = false;
      }
    } else {
      // Si está en rango de manipulación, no aplicar control de rachas
      this.consecutiveCashouts = 0;
      this.forceNextLoss = false;
    }
  }

  /**
   * ✅ Calcula la probabilidad de pérdida según el balance en rango aleatorio
   * Sistema dinámico que aumenta la probabilidad de pérdida a medida que sube el balance
   * FUNCIÓN INVISIBLE - No genera logs ni mensajes
   *
   * @returns {number} Probabilidad de pérdida (0.0 - 1.0)
   */
  calculateLossProbability() {
    // Solo aplicar en rango aleatorio (balance > 40k)
    if (this.balance < GAME_CONFIG.balanceThresholds.forceWin) {
      return 0; // Sin probabilidad especial en rango de manipulación
    }

    // Buscar el rango apropiado según el balance actual
    const ranges = GAME_CONFIG.randomRangeControl.probabilityRanges;
    const balanceRangeKeys = Object.keys(ranges)
      .map(Number)
      .sort((a, b) => b - a); // Ordenar de mayor a menor

    // Encontrar el rango que corresponde al balance actual
    for (const threshold of balanceRangeKeys) {
      if (this.balance >= threshold) {
        return ranges[threshold].lossChance;
      }
    }

    // Si está por debajo del rango más bajo, usar valor por defecto
    return GAME_CONFIG.randomRangeControl.defaultLossChance;
  }

  /**
   * ✅ Obtiene información del rango de probabilidad actual
   * FUNCIÓN INVISIBLE - Solo para uso interno del sistema
   *
   * @returns {Object} Información del rango de probabilidad actual
   */
  getCurrentProbabilityRangeInfo() {
    if (this.balance < GAME_CONFIG.balanceThresholds.forceWin) {
      return { lossChance: 0, description: "Sistema de manipulación activo" };
    }

    const ranges = GAME_CONFIG.randomRangeControl.probabilityRanges;
    const balanceRangeKeys = Object.keys(ranges)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of balanceRangeKeys) {
      if (this.balance >= threshold) {
        return {
          threshold: threshold,
          lossChance: ranges[threshold].lossChance,
          description: ranges[threshold].description,
        };
      }
    }

    return {
      threshold: 40000,
      lossChance: GAME_CONFIG.randomRangeControl.defaultLossChance,
      description: "Rango base",
    };
  }

  /**
   * Calcula cuántos espacios puede destapar el usuario según su balance
   * Sistema dinámico que aumenta los espacios permitidos a medida que baja el balance
   * FUNCIÓN INVISIBLE - No genera logs ni mensajes
   *
   * @returns {number} Número de espacios que puede destapar antes de forzar pérdida
   */
  calculateAllowedSpaces() {
    // Si el sistema no está activo, no hay restricciones
    if (!this.manipulationActive) {
      return Infinity; // Sin límite cuando balance >= 40k
    }

    // Buscar el rango apropiado según el balance actual
    const ranges = GAME_CONFIG.manipulation.balanceRanges;
    const balanceRangeKeys = Object.keys(ranges)
      .map(Number)
      .sort((a, b) => b - a); // Ordenar de mayor a menor

    // Encontrar el rango que corresponde al balance actual
    for (const threshold of balanceRangeKeys) {
      if (this.balance >= threshold) {
        return ranges[threshold].maxSpaces;
      }
    }

    // Si está por debajo del rango más bajo, usar el último valor
    const lowestRange = Math.min(...balanceRangeKeys);
    return ranges[lowestRange].maxSpaces;
  }

  /**
   * Obtiene información detallada del rango actual del balance
   * FUNCIÓN INVISIBLE - Solo para uso interno del sistema
   *
   * @returns {Object} Información del rango actual
   */
  getCurrentBalanceRangeInfo() {
    if (!this.manipulationActive) {
      return { maxSpaces: Infinity, description: "Sistema desactivado" };
    }

    const ranges = GAME_CONFIG.manipulation.balanceRanges;
    const balanceRangeKeys = Object.keys(ranges)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of balanceRangeKeys) {
      if (this.balance >= threshold) {
        return {
          threshold: threshold,
          maxSpaces: ranges[threshold].maxSpaces,
          description: ranges[threshold].description,
        };
      }
    }

    const lowestRange = Math.min(...balanceRangeKeys);
    return {
      threshold: lowestRange,
      maxSpaces: ranges[lowestRange].maxSpaces,
      description: ranges[lowestRange].description,
    };
  }

  /**
   * Manipulación específica para rango aleatorio (balance > 40k)
   * Solo se activa cuando forceNextLoss = true
   * Fuerza pérdida colocando una mina en la primera celda clickeada
   *
   * @param {number} clickedIndex - Índice de la celda clickeada
   * @returns {boolean} true si se aplicó manipulación, false si no
   */
  applyRandomRangeManipulation(clickedIndex) {
    // Solo aplicar si estamos en rango aleatorio y hay bandera activa
    if (
      this.balance >= GAME_CONFIG.balanceThresholds.forceWin &&
      this.forceNextLoss
    ) {
      // Forzar pérdida inmediata colocando mina en la primera celda
      if (this.diamondsFound === 0) {
        // Primera celda de la partida - colocar mina
        if (!this.cells[clickedIndex].hasMine) {
          this.cells[clickedIndex].hasMine = true;

          // Agregar a posiciones de minas si no existe
          if (!this.minePositions.includes(clickedIndex)) {
            this.minePositions.push(clickedIndex);
          }

          // Remover una mina existente para mantener el balance
          if (this.minePositions.length > this.selectedMines) {
            const mineToRemove = this.findMineToRemove(clickedIndex);
            if (mineToRemove !== -1) {
              this.cells[mineToRemove].hasMine = false;
              const indexToRemove = this.minePositions.indexOf(mineToRemove);
              if (indexToRemove > -1) {
                this.minePositions.splice(indexToRemove, 1);
              }
            }
          }
        }

        // Desactivar bandera después de aplicar
        this.forceNextLoss = false;
        return true;
      }
    }

    return false;
  }

  /**
   * ✅ ACTUALIZADO: Aplica manipulación probabilística en rango aleatorio
   * Ahora respeta el estado de normalización del sistema
   *
   * @param {number} clickedIndex - Índice de la celda clickeada
   * @returns {boolean} true si se aplicó manipulación, false si no
   */
  applyProbabilisticManipulation(clickedIndex) {
    // ✅ NUEVO: Verificar si el sistema está normalizado
    if (this.systemNormalized) {
      return false; // No aplicar probabilidades si está normalizado
    }

    // Solo aplicar en rango aleatorio y si el sistema está habilitado
    if (
      this.balance < GAME_CONFIG.balanceThresholds.forceWin ||
      !GAME_CONFIG.randomRangeControl.enableDynamicLoss
    ) {
      return false;
    }

    // Obtener probabilidad de pérdida según balance
    const lossProbability = this.calculateLossProbability();

    // Generar número aleatorio para decidir si aplicar manipulación
    const randomValue = Math.random();

    // Si el número aleatorio es menor que la probabilidad, forzar pérdida
    if (randomValue < lossProbability) {
      // Forzar pérdida colocando mina en la celda clickeada
      if (!this.cells[clickedIndex].hasMine) {
        this.cells[clickedIndex].hasMine = true;

        // Agregar a posiciones de minas si no existe
        if (!this.minePositions.includes(clickedIndex)) {
          this.minePositions.push(clickedIndex);
        }

        // Remover una mina existente para mantener el balance
        if (this.minePositions.length > this.selectedMines) {
          const mineToRemove = this.findMineToRemove(clickedIndex);
          if (mineToRemove !== -1) {
            this.cells[mineToRemove].hasMine = false;
            const indexToRemove = this.minePositions.indexOf(mineToRemove);
            if (indexToRemove > -1) {
              this.minePositions.splice(indexToRemove, 1);
            }
          }
        }

        return true; // Manipulación aplicada
      }
    }

    return false; // No se aplicó manipulación
  }

  /**
   * Configura un nuevo tablero para la partida
   * Resetea todas las celdas y coloca las minas aleatoriamente
   */
  setupBoard() {
    // Resetear todas las celdas
    this.cells.forEach((cell) => {
      cell.revealed = false;
      cell.hasMine = false;
      cell.element.className = "game-cell";
      cell.element.textContent = "";
    });

    // Generar posiciones aleatorias para las minas
    this.minePositions = this.generateMinePositions();
    this.minePositions.forEach((pos) => {
      this.cells[pos].hasMine = true;
    });

    // Calcular cuántos diamantes hay (total de celdas - minas)
    this.totalDiamonds =
      GAME_CONFIG.boardSize * GAME_CONFIG.boardSize - this.selectedMines;
  }

  /**
   * Genera posiciones aleatorias para las minas
   * @returns {Array} Array con las posiciones de las minas
   */
  generateMinePositions() {
    const positions = [];
    const totalCells = GAME_CONFIG.boardSize * GAME_CONFIG.boardSize;

    // Generar posiciones únicas hasta tener la cantidad requerida
    while (positions.length < this.selectedMines) {
      const randomPos = Math.floor(Math.random() * totalCells);
      if (!positions.includes(randomPos)) {
        positions.push(randomPos);
      }
    }

    return positions;
  }

  /**
   * ✅ ACTUALIZADO: Maneja el click en una celda del tablero
   * Ahora incluye manipulación probabilística y control de rachas
   * @param {number} index - Índice de la celda clickeada (0-24)
   */
  handleCellClick(index) {
    // Solo permitir clicks durante el juego y en celdas no reveladas
    if (this.gameState !== GAME_STATES.PLAYING || this.cells[index].revealed) {
      return;
    }

    const cell = this.cells[index];

    // ✅ Aplicar manipulaciones en orden de prioridad
    let manipulationApplied = false;

    // 1. PRIORIDAD ALTA: Control de rachas (fuerza pérdida después de 3 cashouts)
    if (this.applyRandomRangeManipulation(index)) {
      manipulationApplied = true;
    }

    // 2. PRIORIDAD MEDIA: Manipulación probabilística (según balance)
    if (!manipulationApplied && this.applyProbabilisticManipulation(index)) {
      manipulationApplied = true;
    }

    // 3. PRIORIDAD BAJA: Manipulación de rango bajo (balance < 40k)
    if (!manipulationApplied) {
      this.manipulateMines(index);
    }

    // Revelar la celda
    cell.revealed = true;
    cell.element.classList.add("revealed");

    if (cell.hasMine) {
      // El jugador tocó una mina - fin del juego
      cell.element.classList.add("mine");
      cell.element.textContent = "💣";
      this.endGame(false); // Terminar con derrota
    } else {
      // El jugador encontró un diamante
      cell.element.classList.add("diamond");
      cell.element.textContent = "💎";
      this.diamondsFound++;
      this.updateMultiplier(); // Actualizar multiplicador de ganancias

      // Verificar si encontró todos los diamantes
      if (this.diamondsFound === this.totalDiamonds) {
        this.endGame(true); // Terminar con victoria
      }
    }

    this.updateUI(); // Actualizar interfaz después del click
  }

  /**
   * SISTEMA DE MANIPULACIÓN DE MINAS CON RANGOS DINÁMICOS INVISIBLE
   *
   * Sistema completamente invisible que:
   * - Espacios permitidos varían según el balance del usuario
   * - Aumento paulatino y natural de oportunidades
   * - Sistema de rangos que se ajusta automáticamente
   * - Previene llegar a balance cero
   * - NO genera logs ni mensajes visibles
   *
   * @param {number} clickedIndex - Índice de la celda que el jugador clickeó
   */
  manipulateMines(clickedIndex) {
    // Solo aplicar manipulación cuando el sistema está activo
    if (this.manipulationActive) {
      // Obtener la cantidad de espacios permitidos según el balance actual
      const allowedSpaces = this.calculateAllowedSpaces();

      // LÓGICA DINÁMICA: Verificar si puede seguir destapando
      if (this.diamondsFound < allowedSpaces) {
        // VICTORIA SEGURA: Dentro del límite permitido
        if (this.cells[clickedIndex].hasMine) {
          const newMinePosition = this.findSafeSpotForMine(clickedIndex);
          if (newMinePosition !== -1) {
            // Mover la mina a una posición segura
            this.cells[clickedIndex].hasMine = false;
            this.cells[newMinePosition].hasMine = true;

            // Actualizar el array de posiciones de minas
            const mineIndexInArray = this.minePositions.indexOf(clickedIndex);
            if (mineIndexInArray > -1) {
              this.minePositions.splice(mineIndexInArray, 1, newMinePosition);
            }
          }
        }
      } else {
        // FORZAR PÉRDIDA: Excedió el límite permitido
        if (!this.cells[clickedIndex].hasMine) {
          // Si la celda clickeada no tiene mina, colocar una
          this.cells[clickedIndex].hasMine = true;

          // Agregar esta posición al array de minas si no existe
          if (!this.minePositions.includes(clickedIndex)) {
            this.minePositions.push(clickedIndex);
          }

          // Remover una mina existente para mantener el balance
          if (this.minePositions.length > this.selectedMines) {
            const mineToRemove = this.findMineToRemove(clickedIndex);
            if (mineToRemove !== -1) {
              this.cells[mineToRemove].hasMine = false;
              const indexToRemove = this.minePositions.indexOf(mineToRemove);
              if (indexToRemove > -1) {
                this.minePositions.splice(indexToRemove, 1);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Busca una posición segura (sin mina y no revelada) para mover una mina
   * @param {number} avoidIndex - Índice a evitar (donde el jugador clickeó)
   * @returns {number} Índice de posición segura, o -1 si no hay ninguna
   */
  findSafeSpotForMine(avoidIndex) {
    const safeSpots = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (
        i !== avoidIndex && // No es la celda clickeada
        !this.cells[i].hasMine && // No tiene mina
        !this.cells[i].revealed // No está revelada
      ) {
        safeSpots.push(i);
      }
    }

    // Retornar una posición aleatoria de las seguras, o -1 si no hay
    return safeSpots.length > 0
      ? safeSpots[Math.floor(Math.random() * safeSpots.length)]
      : -1;
  }

  /**
   * Busca una mina que se pueda remover (no revelada y diferente a la clickeada)
   * para mantener el balance del juego cuando se fuerza una pérdida
   *
   * @param {number} avoidIndex - Índice a evitar
   * @returns {number} Índice de mina removible, o -1 si no hay ninguna
   */
  findMineToRemove(avoidIndex) {
    const removableMines = this.minePositions.filter(
      (pos) => pos !== avoidIndex && !this.cells[pos].revealed,
    );

    return removableMines.length > 0
      ? removableMines[Math.floor(Math.random() * removableMines.length)]
      : -1;
  }

  /**
   * Actualiza el multiplicador de ganancias
   *
   * Fórmula: (base^diamantesEncontrados) * factorDeRiesgo
   * - Base: 1.1 (crece exponencialmente)
   * - Factor de riesgo: 1.3x (3 minas), 1.8x (4 minas), 2.3x (5 minas)
   */
  updateMultiplier() {
    const riskFactor = GAME_CONFIG.multipliers.riskFactors[this.selectedMines];
    this.multiplier =
      Math.pow(GAME_CONFIG.multipliers.base, this.diamondsFound) * riskFactor;
    // Redondear a 2 decimales para mostrar limpio
    this.multiplier = Math.round(this.multiplier * 100) / 100;
  }

  /**
   * ✅ ACTUALIZADO: Permite al jugador retirar sus ganancias antes de completar el tablero
   * Ahora incluye el control de rachas
   */
  cashOut() {
    // Solo permitir cash out durante el juego y con al menos 1 diamante
    if (this.gameState !== GAME_STATES.PLAYING || this.diamondsFound === 0)
      return;

    // Calcular ganancias: apuesta × multiplicador actual
    let winnings = Math.floor(this.currentBet * this.multiplier);

    // Ajustar ganancias para no exceder el límite máximo de 100k
    if (this.balance + winnings > GAME_CONFIG.balanceThresholds.maxBalance) {
      winnings = GAME_CONFIG.balanceThresholds.maxBalance - this.balance;
    }

    // Aplicar las ganancias al balance
    this.balance += winnings;
    this.gameState = GAME_STATES.CASHED_OUT;

    // Actualizar contador de victorias consecutivas si el sistema está activo
    if (this.manipulationActive) {
      this.consecutiveWins++;
    }

    // Aplicar control de rachas para rango aleatorio
    this.handleStreakControl(true, false); // true = cashout, false = no victoria completa

    this.updateUI();
    this.updateStatusMessage(
      `Retiraste ${formatCurrency(winnings)}. ¡Buen trabajo!`,
    );

    // Verificar límites inmediatamente después de actualizar el balance
    if (this.checkBalanceLimits()) {
      return; // Si se alcanzó el límite máximo, mostrar modal y no resetear
    }

    // Resetear el juego después de 3 segundos
    setTimeout(() => this.resetGame(), 3000);
  }

  /**
   * ✅ ACTUALIZADO: Termina la partida actual (victoria o derrota)
   * Ahora incluye el control de rachas
   * @param {boolean} won - true si el jugador ganó, false si perdió
   */
  endGame(won) {
    // Establecer el estado final del juego
    this.gameState = won ? GAME_STATES.WON : GAME_STATES.LOST;

    // Deshabilitar todas las celdas para prevenir más clicks
    this.cells.forEach((cell) => {
      cell.element.classList.add("disabled");
    });

    if (won) {
      // VICTORIA: Calcular y aplicar ganancias
      let winnings = Math.floor(this.currentBet * this.multiplier);

      // Ajustar ganancias para no exceder el límite máximo de 100k
      if (this.balance + winnings > GAME_CONFIG.balanceThresholds.maxBalance) {
        winnings = GAME_CONFIG.balanceThresholds.maxBalance - this.balance;
      }

      this.balance += winnings;

      // Actualizar contador de victorias consecutivas si el sistema está activo
      if (this.manipulationActive) {
        this.consecutiveWins++;
      }

      // Aplicar control de rachas para rango aleatorio
      this.handleStreakControl(false, true); // false = no cashout, true = victoria completa

      this.updateStatusMessage(`¡Ganaste ${formatCurrency(winnings)}!`);
      // Verificar límites inmediatamente después de ganar
      this.updateUI();
      if (this.checkBalanceLimits()) {
        return; // Si se alcanzó el límite máximo, mostrar modal y no resetear
      }
    } else {
      // DERROTA: Mostrar todas las minas restantes
      this.updateStatusMessage("¡Perdiste! Inténtalo de nuevo.");
      this.minePositions.forEach((pos) => {
        if (!this.cells[pos].revealed) {
          this.cells[pos].element.classList.add("mine");
          this.cells[pos].element.textContent = "💣";
        }
      });

      // Resetear contador de victorias consecutivas en caso de derrota
      if (this.manipulationActive) {
        this.consecutiveWins = 0;
      }

      // Aplicar control de rachas para rango aleatorio
      this.handleStreakControl(false, false); // false = no cashout, false = no victoria
    }

    this.updateUI();

    // Resetear el juego después de 3 segundos (solo si no se alcanzó el límite)
    setTimeout(() => this.resetGame(), 3000);
  }

  /**
   * Resetea el juego a su estado inicial para una nueva partida
   * Limpia el tablero y restaura variables de partida
   */
  resetGame() {
    // Resetear estado del juego
    this.gameState = GAME_STATES.READY;
    this.currentBet = 0;
    this.diamondsFound = 0;
    this.multiplier = 1.0;
    this.minePositions = [];

    // Limpiar todas las celdas del tablero
    this.cells.forEach((cell) => {
      cell.revealed = false;
      cell.hasMine = false;
      cell.element.className = "game-cell";
      cell.element.textContent = "";
    });

    // Verificar si el sistema de manipulación debe continuar activo
    this.checkManipulationSystem();

    this.updateUI();
    this.updateStatusMessage("Configura tu apuesta y comienza de nuevo");
  }

  /**
   * ACTUALIZACIÓN DE LA INTERFAZ DE USUARIO
   *
   * Esta función central actualiza todos los elementos visuales:
   * - Valores monetarios (balance, apuesta, multiplicador)
   * - Estado de botones y controles
   * - Validaciones de límites
   * - Clases CSS para estados visuales
   */
  updateUI() {
    // Actualizar displays de información financiera
    document.getElementById("balance").textContent = formatCurrency(
      this.balance,
    );
    document.getElementById("currentBet").textContent = formatCurrency(
      this.currentBet,
    );
    document.getElementById("multiplier").textContent =
      `${this.multiplier.toFixed(2)}x`;
    document.getElementById("minesLeft").textContent = this.selectedMines;

    // Obtener referencias a elementos de control
    const startButton = document.getElementById("startGame");
    const cashOutButton = document.getElementById("cashOut");
    const betInput = document.getElementById("betAmount");
    const mineRadios = document.querySelectorAll('input[name="mines"]');
    const halveButton = document.getElementById("halveBet");
    const doubleButton = document.getElementById("doubleBet");

    // Determinar estado actual del juego
    const isReady = this.gameState === GAME_STATES.READY;
    const isPlaying = this.gameState === GAME_STATES.PLAYING;

    // Verificar límites de balance solo cuando el juego está en estado READY
    if (isReady) {
      this.checkBalanceLimits();
    }

    // Determinar si el jugador está en los límites de balance
    const atMaxBalance =
      this.balance >= GAME_CONFIG.balanceThresholds.maxBalance;
    const atMinBalance =
      this.balance <= GAME_CONFIG.balanceThresholds.minBalance;

    // Configurar estado de controles principales
    startButton.disabled = !isReady || atMaxBalance || atMinBalance;
    betInput.disabled = !isReady || atMaxBalance || atMinBalance;
    mineRadios.forEach(
      (radio) => (radio.disabled = !isReady || atMaxBalance || atMinBalance),
    );
    halveButton.disabled = !isReady || atMaxBalance || atMinBalance;
    doubleButton.disabled = !isReady || atMaxBalance || atMinBalance;

    // El botón Cash Out solo está disponible durante el juego con diamantes encontrados
    cashOutButton.disabled = !isPlaying || this.diamondsFound === 0;

    // Configurar límites del input de apuesta
    if (isReady && !atMaxBalance && !atMinBalance) {
      betInput.max = Math.min(GAME_CONFIG.maxBet, this.balance);
      // Validar el valor actual del input por si ha quedado desactualizado
      let value = parseInt(betInput.value, 10);
      const maxAllowed = Math.min(GAME_CONFIG.maxBet, this.balance);
      if (value > maxAllowed) {
        betInput.value = maxAllowed;
      }
    }

    // Aplicar clases CSS según el estado del juego
    const statusMessage = document.getElementById("statusMessage");
    statusMessage.className = "status-message";
    if (this.gameState === GAME_STATES.WON) statusMessage.classList.add("won");
    else if (this.gameState === GAME_STATES.LOST)
      statusMessage.classList.add("lost");
    else if (this.gameState === GAME_STATES.CASHED_OUT)
      statusMessage.classList.add("cashed-out");
  }

  /**
   * Actualiza el mensaje de estado mostrado al jugador
   * @param {string} message - Mensaje a mostrar
   */
  updateStatusMessage(message) {
    document.getElementById("statusMessage").textContent = message;
  }

  /**
   * SISTEMA DE VERIFICACIÓN DE LÍMITES DE BALANCE ACTUALIZADO
   *
   * Verifica si el jugador ha alcanzado los límites críticos:
   * - Límite máximo (100k): Muestra modal y bloquea
   * - Límite mínimo (5k): Previene llegar a cero DE FORMA INVISIBLE
   *
   * @returns {boolean} true si se alcanzó algún límite crítico
   */
  checkBalanceLimits() {
    // Verificar límite máximo de 100k
    if (this.balance >= GAME_CONFIG.balanceThresholds.maxBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.maxBalance;
      this.showMaxLimitModal();
      return true;
    }

    // Verificar límite mínimo de 5k (SIN mostrar advertencias)
    if (this.balance < GAME_CONFIG.balanceThresholds.minBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.minBalance;
      return true;
    }

    return false;
  }

  /**
   * FUNCIÓN ELIMINADA - Sistema debe ser invisible
   * Anteriormente mostraba advertencia de balance mínimo
   */
  showMinBalanceWarning() {
    // Función vacía - no mostrar advertencias del sistema
    // El sistema funciona de forma invisible
  }

  /**
   * SISTEMA MODAL DE LÍMITE MÁXIMO
   *
   * Muestra un modal de felicitación cuando el jugador alcanza $100.000
   */
  showMaxLimitModal() {
    // Bloquear toda la interfaz poniendo el juego en estado READY
    this.gameState = GAME_STATES.READY;

    // Obtener referencias a elementos del modal
    const modal = document.getElementById("maxLimitModal");
    const countdownElement = document.getElementById("countdown");
    const restartButton = document.getElementById("restartNowBtn");

    // Verificar que el modal existe en el DOM
    if (!modal) {
      console.error("Modal element not found!");
      return;
    }

    // Mostrar el modal removiendo la clase 'hidden'
    modal.classList.remove("hidden");

    // Inicializar countdown en 5 segundos
    let countdown = 5;
    if (countdownElement) {
      countdownElement.textContent = countdown;
    }

    /**
     * Maneja el click en "Reiniciar Ahora"
     * Cancela el countdown y reinicia inmediatamente
     */
    const handleRestartNow = () => {
      clearInterval(countdownInterval);
      this.hideModalAndRestart();
      if (restartButton) {
        restartButton.removeEventListener("click", handleRestartNow);
      }
    };

    // Agregar evento al botón de reiniciar
    if (restartButton) {
      restartButton.addEventListener("click", handleRestartNow);
    }

    // Iniciar countdown automático
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownElement) {
        countdownElement.textContent = countdown;
      }

      // Cuando llegue a 0, ocultar modal y reiniciar
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.hideModalAndRestart();
        if (restartButton) {
          restartButton.removeEventListener("click", handleRestartNow);
        }
      }
    }, 1000); // Actualizar cada segundo
  }

  /**
   * Oculta el modal y reinicia el juego
   * Se ejecuta cuando termina el countdown o se presiona "Reiniciar Ahora"
   */
  hideModalAndRestart() {
    const modal = document.getElementById("maxLimitModal");
    modal.classList.add("hidden");

    // Reiniciar el juego después de una pequeña pausa para la transición
    setTimeout(() => {
      this.resetToInitialState();
    }, 300);
  }

  /**
   * ✅ ACTUALIZADO: Reinicia el juego completamente al estado inicial
   * Opcionalmente resetea el contador de tiradas
   */
  resetToInitialState() {
    this.balance = GAME_CONFIG.initialBalance; // Volver a $50.000
    this.consecutiveWins = 0; // Resetear contador de victorias consecutivas
    this.manipulationActive = false; // Resetear sistema de manipulación

    // Resetear variables de control de rachas
    this.consecutiveCashouts = 0;
    this.forceNextLoss = false;

    // ✅ NUEVO: Resetear sistema de normalización (opcional)
    this.totalGames = 0;
    this.systemNormalized = false;

    // Reactivar probabilidades dinámicas
    GAME_CONFIG.randomRangeControl.enableDynamicLoss = true;

    this.resetGame(); // Resetear tablero y variables
    this.updateStatusMessage(
      "Juego reiniciado. Configura tu apuesta y comienza",
    );
  }

  /**
   * ACTUALIZADO: Muestra advertencias genéricas sin revelar el sistema
   */
  showBalanceWarning() {
    // Solo advertencia genérica de balance bajo, sin mencionar el sistema
    if (this.balance <= 10000) {
      this.updateStatusMessage("⚠️ Balance bajo. ¡Juega con cuidado!");
    }
  }
}

/**
 * INICIALIZACIÓN DEL JUEGO
 *
 * Se ejecuta cuando el DOM está completamente cargado
 * Crea una instancia del juego y la hace disponible globalmente
 */
document.addEventListener("DOMContentLoaded", () => {
  const game = new DiamondMinesGame();
  // Hacer la instancia disponible globalmente para debugging
  // Útil para poder acceder al juego desde la consola del navegador
  window.DiamondMinesGame = game;
});
