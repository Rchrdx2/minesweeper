/**
 * DIAMOND MINES GAME - JUEGO DE MINAS DE DIAMANTES
 * ================================================
 * 
 * Este archivo contiene toda la lógica del juego Diamond Mines.
 * Es un juego de casino donde los jugadores deben encontrar diamantes
 * evitando las minas ocultas en un tablero de 5x5.
 * 
 * Características principales:
 * - Sistema de balance en pesos argentinos
 * - Manipulación de minas basada en el balance del jugador
 * - Modal de límite máximo cuando se alcanzan $100.000
 * - Multiplicadores dinámicos basados en riesgo
 */

// Configuración principal del juego
const GAME_CONFIG = {
  boardSize: 5, // Tamaño del tablero (5x5 = 25 casillas)
  initialBalance: 50000, // Balance inicial: 50,000 pesos
  minBet: 1000, // Apuesta mínima: 1,000 pesos
  maxBet: 5000, // Apuesta máxima: 5,000 pesos
  
  // Umbrales de balance que controlan el comportamiento del juego
  balanceThresholds: {
    forceWin: 40000, // Por debajo de 40k: ayudar al jugador (mover minas)
    forceLoss: 97000, // Límite anterior para forzar pérdida (ya no se usa)
    maxBalance: 100000, // Límite máximo absoluto: 100,000 pesos
    normalPlayUpper: 97000, // Límite superior para juego normal (ya no se usa)
    minBalance: 40000, // Balance mínimo antes de activar ayuda
  },
  
  // Sistema de multiplicadores
  multipliers: {
    base: 1.2, // Multiplicador base que crece exponencialmente
    riskFactors: { // Factor de riesgo según cantidad de minas
      3: 1.5, // 3 minas = multiplicador x1.5
      4: 2.0, // 4 minas = multiplicador x2.0
      5: 2.5, // 5 minas = multiplicador x2.5
    },
  },
};

/**
 * Formatea un número como moneda en pesos argentinos
 * @param {number} amount - Cantidad a formatear
 * @returns {string} - Cantidad formateada como "$12.345"
 */
function formatCurrency(amount) {
  return `$${amount.toLocaleString('es-AR')}`;
}

/**
 * Estados posibles del juego
 * Controla qué acciones están disponibles en cada momento
 */
const GAME_STATES = {
  READY: "ready",         // Listo para empezar una nueva ronda
  PLAYING: "playing",     // Jugando activamente
  WON: "won",            // Victoria (encontró todos los diamantes)
  LOST: "lost",          // Derrota (tocó una mina)
  CASHED_OUT: "cashed_out", // Retiró ganancias antes de terminar
};

/**
 * Clase principal del juego Diamond Mines
 * 
 * Maneja toda la lógica del juego incluyendo:
 * - Estado del tablero y las celdas
 * - Balance del jugador y apuestas
 * - Manipulación de minas según el balance
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
        element: cell,        // Elemento DOM
        revealed: false,      // Si fue revelada o no
        hasMine: false,      // Si contiene una mina
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
   * Inicia una nueva partida
   * Valida la apuesta, descuenta del balance y configura el tablero
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

    // Configurar estado de la nueva partida
    this.currentBet = betAmount;
    this.balance -= betAmount; // Descontar la apuesta del balance
    this.gameState = GAME_STATES.PLAYING;
    this.diamondsFound = 0;
    this.multiplier = 1.0;
    
    // Configurar el tablero con minas y diamantes
    this.setupBoard();
    this.updateUI();
    this.updateStatusMessage("Busca diamantes, evita las minas.");
    
    // Mostrar advertencia si el balance está bajo
    this.showBalanceWarning();
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
   * @returns {Array<number>} Array con las posiciones de las minas
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
   * Maneja el click en una celda del tablero
   * @param {number} index - Índice de la celda clickeada (0-24)
   */
  handleCellClick(index) {
    // Solo permitir clicks durante el juego y en celdas no reveladas
    if (this.gameState !== GAME_STATES.PLAYING || this.cells[index].revealed) {
      return;
    }

    const cell = this.cells[index];

    // Aplicar manipulación de minas según el balance del jugador
    this.manipulateMines(index);

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
   * SISTEMA DE MANIPULACIÓN DE MINAS
   * 
   * Esta función implementa el sistema de "ayuda" al jugador basado en su balance:
   * - Si el balance está por debajo de 40k: ayudar moviendo minas para evitar pérdidas
   * - Si el balance está entre 40k-100k: juego completamente aleatorio y justo
   * 
   * @param {number} clickedIndex - Índice de la celda que el jugador clickeó
   */
  manipulateMines(clickedIndex) {
    // Solo forzar victoria cuando el balance está bajo (menos de 40k)
    if (this.balance < GAME_CONFIG.balanceThresholds.forceWin) {
      // Si el jugador clickeó una mina, intentar moverla
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
    }
    // Nota: Se removió la lógica de forzar pérdida a los 97k
    // El juego ahora es completamente aleatorio después de 40k
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
        i !== avoidIndex &&      // No es la celda clickeada
        !this.cells[i].hasMine && // No tiene mina
        !this.cells[i].revealed   // No está revelada
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
   * Busca una mina que se pueda mover (no revelada y diferente a la clickeada)
   * @param {number} avoidIndex - Índice a evitar
   * @returns {number} Índice de mina movible, o -1 si no hay ninguna
   * 
   * Nota: Esta función ya no se usa en la lógica actual
   */
  findMineToMove(avoidIndex) {
    const movableMines = this.minePositions.filter(
      (pos) => pos !== avoidIndex && !this.cells[pos].revealed,
    );
    return movableMines.length > 0
      ? movableMines[Math.floor(Math.random() * movableMines.length)]
      : -1;
  }

  /**
   * Actualiza el multiplicador de ganancias
   * 
   * Fórmula: (base^diamantesEncontrados) * factorDeRiesgo
   * - Base: 1.2 (crece exponencialmente)
   * - Factor de riesgo: 1.5x (3 minas), 2.0x (4 minas), 2.5x (5 minas)
   */
  updateMultiplier() {
    const riskFactor = GAME_CONFIG.multipliers.riskFactors[this.selectedMines];
    this.multiplier =
      Math.pow(GAME_CONFIG.multipliers.base, this.diamondsFound) * riskFactor;
    // Redondear a 2 decimales para mostrar limpio
    this.multiplier = Math.round(this.multiplier * 100) / 100;
  }

  /**
   * Permite al jugador retirar sus ganancias antes de completar el tablero
   * Calcula las ganancias actuales y las suma al balance
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
    this.updateUI();
    this.updateStatusMessage(`Retiraste ${formatCurrency(winnings)}. ¡Buen trabajo!`);

    // Verificar límites inmediatamente después de actualizar el balance
    if (this.checkBalanceLimits()) {
      return; // Si se alcanzó el límite máximo, mostrar modal y no resetear
    }
    
    // Resetear el juego después de 3 segundos
    setTimeout(() => this.resetGame(), 3000);
  }

  /**
   * Termina la partida actual (victoria o derrota)
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
      this.updateUI();
    }

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
    document.getElementById("balance").textContent = formatCurrency(this.balance);
    document.getElementById("currentBet").textContent = formatCurrency(this.currentBet);
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
    // Para otros estados, la verificación se hace explícitamente donde corresponde
    if (isReady) {
      this.checkBalanceLimits();
    }

    // Determinar si el jugador está en los límites de balance
    const atMaxBalance = this.balance >= GAME_CONFIG.balanceThresholds.maxBalance;
    const atMinBalance = this.balance <= GAME_CONFIG.balanceThresholds.minBalance;

    // Configurar estado de controles principales
    startButton.disabled = !isReady || atMaxBalance;
    betInput.disabled = !isReady || atMaxBalance;
    mineRadios.forEach((radio) => (radio.disabled = !isReady || atMaxBalance));
    halveButton.disabled = !isReady || atMaxBalance;
    doubleButton.disabled = !isReady || atMaxBalance;

    // El botón Cash Out solo está disponible durante el juego con diamantes encontrados
    cashOutButton.disabled = !isPlaying || this.diamondsFound === 0;

    // Configurar límites del input de apuesta
    if (isReady && !atMaxBalance) {
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
   * SISTEMA DE VERIFICACIÓN DE LÍMITES DE BALANCE
   * 
   * Verifica si el jugador ha alcanzado los límites críticos:
   * - Límite máximo (100k): Muestra modal de felicitación y bloquea el juego
   * - Límite mínimo (40k): Asegura que el balance no baje de este monto
   * 
   * @returns {boolean} true si se alcanzó algún límite, false si no
   */
  checkBalanceLimits() {
    // Verificar límite máximo de 100k
    if (this.balance >= GAME_CONFIG.balanceThresholds.maxBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.maxBalance;
      this.showMaxLimitModal(); // Mostrar modal de felicitación
      return true;
    }
    
    // Verificar límite mínimo de 40k
    if (this.balance < GAME_CONFIG.balanceThresholds.minBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.minBalance;
      return true;
    }
    
    return false; // No se alcanzó ningún límite
  }

  /**
   * SISTEMA MODAL DE LÍMITE MÁXIMO
   * 
   * Muestra un modal de felicitación cuando el jugador alcanza $100.000
   * Incluye:
   * - Mensaje de felicitación
   * - Countdown automático de 5 segundos
   * - Botón para reiniciar inmediatamente
   * - Bloqueo total de la interfaz de juego
   */
  showMaxLimitModal() {
    // Bloquear toda la interfaz poniendo el juego en estado READY
    this.gameState = GAME_STATES.READY;
    
    // Obtener referencias a elementos del modal
    const modal = document.getElementById('maxLimitModal');
    const countdownElement = document.getElementById('countdown');
    const restartButton = document.getElementById('restartNowBtn');
    
    // Verificar que el modal existe en el DOM
    if (!modal) {
      console.error("Modal element not found!");
      return;
    }
    
    // Mostrar el modal removiendo la clase 'hidden'
    modal.classList.remove('hidden');
    
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
        restartButton.removeEventListener('click', handleRestartNow);
      }
    };
    
    // Agregar evento al botón de reiniciar
    if (restartButton) {
      restartButton.addEventListener('click', handleRestartNow);
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
          restartButton.removeEventListener('click', handleRestartNow);
        }
      }
    }, 1000); // Actualizar cada segundo
  }

  /**
   * Oculta el modal y reinicia el juego
   * Se ejecuta cuando termina el countdown o se presiona "Reiniciar Ahora"
   */
  hideModalAndRestart() {
    const modal = document.getElementById('maxLimitModal');
    modal.classList.add('hidden');
    
    // Reiniciar el juego después de una pequeña pausa para la transición
    setTimeout(() => {
      this.resetToInitialState();
    }, 300);
  }

  /**
   * Reinicia el juego completamente al estado inicial
   * Restaura el balance a $50.000 y resetea todo
   */
  resetToInitialState() {
    this.balance = GAME_CONFIG.initialBalance; // Volver a $50.000
    this.resetGame(); // Resetear tablero y variables
    this.updateStatusMessage("Juego reiniciado. Configura tu apuesta y comienza");
  }

  /**
   * Muestra advertencias cuando el balance está cerca de los límites
   * Solo se muestra cuando el balance está muy bajo (cerca de 40k)
   */
  showBalanceWarning() {
    // Advertencia de balance bajo (cuando está cerca de los 40k)
    if (this.balance <= GAME_CONFIG.balanceThresholds.minBalance + 5000) {
      this.updateStatusMessage("⚠️ Balance bajo. ¡Juega con cuidado!");
    }
    // Nota: Se removió la advertencia de límite máximo a 97k
    // Solo se mantiene el límite máximo de 100k con bloqueo total
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
