// Configuración del juego
const GAME_CONFIG = {
  boardSize: 5,
  initialBalance: 50000, // 50,000 pesos
  minBet: 1000, // 1,000 pesos
  maxBet: 5000, // 5,000 pesos
  balanceThresholds: {
    forceWin: 40000, // 40,000 pesos - forzar victoria
    forceLoss: 97000, // 97,000 pesos - forzar pérdida
    maxBalance: 100000, // 100,000 pesos - límite máximo y bloqueo
    normalPlayUpper: 97000, // 97,000 pesos
    minBalance: 40000, // 40,000 pesos
  },
  multipliers: {
    base: 1.2,
    riskFactors: {
      3: 1.5,
      4: 2.0,
      5: 2.5,
    },
  },
};

// Función para formatear moneda en pesos
function formatCurrency(amount) {
  return `$${amount.toLocaleString('es-AR')}`;
}

const GAME_STATES = {
  READY: "ready",
  PLAYING: "playing",
  WON: "won",
  LOST: "lost",
  CASHED_OUT: "cashed_out",
};

class DiamondMinesGame {
  constructor() {
    this.gameState = GAME_STATES.READY;
    this.balance = GAME_CONFIG.initialBalance;
    this.currentBet = 0;
    this.selectedMines = 3;
    this.multiplier = 1.0;
    this.diamondsFound = 0;
    this.totalDiamonds = 0;
    this.gameBoard = null;
    this.cells = [];
    this.minePositions = [];

    this.initializeGame();
  }

  initializeGame() {
    this.createGameBoard();
    this.bindEvents();
    this.updateUI();
    this.updateStatusMessage("Configura tu apuesta y comienza");
  }

  createGameBoard() {
    const boardElement = document.getElementById("gameBoard");
    boardElement.innerHTML = "";
    this.cells = [];
    for (let i = 0; i < GAME_CONFIG.boardSize * GAME_CONFIG.boardSize; i++) {
      const cell = document.createElement("div");
      cell.className = "game-cell";
      cell.dataset.index = i;
      cell.addEventListener("click", () => this.handleCellClick(i));
      boardElement.appendChild(cell);
      this.cells.push({
        element: cell,
        revealed: false,
        hasMine: false,
      });
    }
  }

  bindEvents() {
    document
      .getElementById("halveBet")
      .addEventListener("click", () => this.halveBet());
    document
      .getElementById("doubleBet")
      .addEventListener("click", () => this.doubleBet());
    document
      .getElementById("startGame")
      .addEventListener("click", () => this.startGame());
    document
      .getElementById("cashOut")
      .addEventListener("click", () => this.cashOut());

    document.querySelectorAll('input[name="mines"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.selectedMines = parseInt(e.target.value, 10);
        this.updateUI();
      });
    });

    const betInput = document.getElementById("betAmount");

    const validateBetAmount = () => {
      let value = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
      const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
      value = Math.max(GAME_CONFIG.minBet, Math.min(value, maxAllowedBet));
      betInput.value = value;
    };

    betInput.addEventListener("input", validateBetAmount);
    betInput.addEventListener("blur", validateBetAmount);
  }

  halveBet() {
    const betInput = document.getElementById("betAmount");
    let currentBet = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
    let newBet = Math.floor(currentBet / 2);
    betInput.value = Math.max(newBet, GAME_CONFIG.minBet);
  }

  doubleBet() {
    const betInput = document.getElementById("betAmount");
    let currentBet = parseInt(betInput.value, 10) || GAME_CONFIG.minBet;
    let newBet = currentBet * 2;
    const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
    betInput.value = Math.min(newBet, maxAllowedBet);
  }

  startGame() {
    const betInput = document.getElementById("betAmount");
    // Re-validar justo antes de empezar, por si acaso
    let betAmount = parseInt(betInput.value, 10);
    const maxAllowedBet = Math.min(GAME_CONFIG.maxBet, this.balance);
    betAmount = Math.max(
      GAME_CONFIG.minBet,
      Math.min(betAmount, maxAllowedBet),
    );
    betInput.value = betAmount;

    if (betAmount > this.balance) {
      this.updateStatusMessage(
        "No tienes suficiente balance para esta apuesta.",
      );
      return;
    }

    // Verificar límites antes de empezar
    // Ya no es necesario llamar checkBalanceLimits aquí porque se llama en updateUI()

    this.currentBet = betAmount;
    this.balance -= betAmount;
    this.gameState = GAME_STATES.PLAYING;
    this.diamondsFound = 0;
    this.multiplier = 1.0;
    this.setupBoard();
    this.updateUI();
    this.updateStatusMessage("Busca diamantes, evita las minas.");
    
    // Mostrar advertencia si está cerca de los límites
    this.showBalanceWarning();
  }

  setupBoard() {
    this.cells.forEach((cell) => {
      cell.revealed = false;
      cell.hasMine = false;
      cell.element.className = "game-cell";
      cell.element.textContent = "";
    });

    this.minePositions = this.generateMinePositions();
    this.minePositions.forEach((pos) => {
      this.cells[pos].hasMine = true;
    });

    this.totalDiamonds =
      GAME_CONFIG.boardSize * GAME_CONFIG.boardSize - this.selectedMines;
  }

  generateMinePositions() {
    const positions = [];
    const totalCells = GAME_CONFIG.boardSize * GAME_CONFIG.boardSize;
    while (positions.length < this.selectedMines) {
      const randomPos = Math.floor(Math.random() * totalCells);
      if (!positions.includes(randomPos)) {
        positions.push(randomPos);
      }
    }
    return positions;
  }

  handleCellClick(index) {
    if (this.gameState !== GAME_STATES.PLAYING || this.cells[index].revealed) {
      return;
    }

    const cell = this.cells[index];

    this.manipulateMines(index);

    cell.revealed = true;
    cell.element.classList.add("revealed");

    if (cell.hasMine) {
      cell.element.classList.add("mine");
      cell.element.textContent = "💣";
      this.endGame(false);
    } else {
      cell.element.classList.add("diamond");
      cell.element.textContent = "💎";
      this.diamondsFound++;
      this.updateMultiplier();

      if (this.diamondsFound === this.totalDiamonds) {
        this.endGame(true);
      }
    }
    this.updateUI();
  }

  manipulateMines(clickedIndex) {
    // Solo forzar victoria cuando el balance está bajo (menos de 40k)
    if (this.balance < GAME_CONFIG.balanceThresholds.forceWin) {
      if (this.cells[clickedIndex].hasMine) {
        const newMinePosition = this.findSafeSpotForMine(clickedIndex);
        if (newMinePosition !== -1) {
          this.cells[clickedIndex].hasMine = false;
          this.cells[newMinePosition].hasMine = true;
          const mineIndexInArray = this.minePositions.indexOf(clickedIndex);
          if (mineIndexInArray > -1) {
            this.minePositions.splice(mineIndexInArray, 1, newMinePosition);
          }
        }
      }
    }
    // Se removió la lógica de forzar pérdida a los 97k
    // El juego ahora es completamente aleatorio después de 40k
  }

  findSafeSpotForMine(avoidIndex) {
    const safeSpots = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (
        i !== avoidIndex &&
        !this.cells[i].hasMine &&
        !this.cells[i].revealed
      ) {
        safeSpots.push(i);
      }
    }
    return safeSpots.length > 0
      ? safeSpots[Math.floor(Math.random() * safeSpots.length)]
      : -1;
  }

  findMineToMove(avoidIndex) {
    const movableMines = this.minePositions.filter(
      (pos) => pos !== avoidIndex && !this.cells[pos].revealed,
    );
    return movableMines.length > 0
      ? movableMines[Math.floor(Math.random() * movableMines.length)]
      : -1;
  }

  updateMultiplier() {
    const riskFactor = GAME_CONFIG.multipliers.riskFactors[this.selectedMines];
    this.multiplier =
      Math.pow(GAME_CONFIG.multipliers.base, this.diamondsFound) * riskFactor;
    this.multiplier = Math.round(this.multiplier * 100) / 100;
  }

  cashOut() {
    if (this.gameState !== GAME_STATES.PLAYING || this.diamondsFound === 0)
      return;

    let winnings = Math.floor(this.currentBet * this.multiplier);

    // Ajustar ganancias para no exceder el límite máximo
    if (this.balance + winnings > GAME_CONFIG.balanceThresholds.maxBalance) {
      winnings = GAME_CONFIG.balanceThresholds.maxBalance - this.balance;
    }

    this.balance += winnings;
    this.gameState = GAME_STATES.CASHED_OUT;
    this.updateUI();
    this.updateStatusMessage(`Retiraste ${formatCurrency(winnings)}. ¡Buen trabajo!`);

    // La verificación de límites se hará automáticamente en updateUI()
    setTimeout(() => this.resetGame(), 3000);
  }

  endGame(won) {
    this.gameState = won ? GAME_STATES.WON : GAME_STATES.LOST;

    this.cells.forEach((cell) => {
      cell.element.classList.add("disabled");
    });

    if (won) {
      let winnings = Math.floor(this.currentBet * this.multiplier);
      
      // Ajustar ganancias para no exceder el límite máximo
      if (this.balance + winnings > GAME_CONFIG.balanceThresholds.maxBalance) {
        winnings = GAME_CONFIG.balanceThresholds.maxBalance - this.balance;
      }
      
      this.balance += winnings;
      this.updateStatusMessage(`¡Ganaste ${formatCurrency(winnings)}!`);
      
      // La verificación de límites se hará automáticamente en updateUI()
    } else {
      this.updateStatusMessage("¡Perdiste! Inténtalo de nuevo.");
      this.minePositions.forEach((pos) => {
        if (!this.cells[pos].revealed) {
          this.cells[pos].element.classList.add("mine");
          this.cells[pos].element.textContent = "💣";
        }
      });
    }

    this.updateUI();
    setTimeout(() => this.resetGame(), 3000);
  }

  resetGame() {
    this.gameState = GAME_STATES.READY;
    this.currentBet = 0;
    this.diamondsFound = 0;
    this.multiplier = 1.0;
    this.minePositions = [];

    this.cells.forEach((cell) => {
      cell.revealed = false;
      cell.hasMine = false;
      cell.element.className = "game-cell";
      cell.element.textContent = "";
    });

    this.updateUI();
    this.updateStatusMessage("Configura tu apuesta y comienza de nuevo");
  }

  updateUI() {
    document.getElementById("balance").textContent = formatCurrency(this.balance);
    document.getElementById("currentBet").textContent = formatCurrency(this.currentBet);
    document.getElementById("multiplier").textContent =
      `${this.multiplier.toFixed(2)}x`;
    document.getElementById("minesLeft").textContent = this.selectedMines;

    const startButton = document.getElementById("startGame");
    const cashOutButton = document.getElementById("cashOut");
    const betInput = document.getElementById("betAmount");
    const mineRadios = document.querySelectorAll('input[name="mines"]');
    const halveButton = document.getElementById("halveBet");
    const doubleButton = document.getElementById("doubleBet");

    const isReady = this.gameState === GAME_STATES.READY;
    const isPlaying = this.gameState === GAME_STATES.PLAYING;

    // Verificar límites de balance DESPUÉS de actualizar UI
    if (isReady) {
      this.checkBalanceLimits();
    }

    // Deshabilitar controles si el balance está en los límites
    const atMaxBalance = this.balance >= GAME_CONFIG.balanceThresholds.maxBalance;
    const atMinBalance = this.balance <= GAME_CONFIG.balanceThresholds.minBalance;

    startButton.disabled = !isReady || atMaxBalance;
    betInput.disabled = !isReady || atMaxBalance;
    mineRadios.forEach((radio) => (radio.disabled = !isReady || atMaxBalance));
    halveButton.disabled = !isReady || atMaxBalance;
    doubleButton.disabled = !isReady || atMaxBalance;

    cashOutButton.disabled = !isPlaying || this.diamondsFound === 0;

    if (isReady && !atMaxBalance) {
      betInput.max = Math.min(GAME_CONFIG.maxBet, this.balance);
      // Validar el valor actual del input por si ha quedado desactualizado
      let value = parseInt(betInput.value, 10);
      const maxAllowed = Math.min(GAME_CONFIG.maxBet, this.balance);
      if (value > maxAllowed) {
        betInput.value = maxAllowed;
      }
    }

    const statusMessage = document.getElementById("statusMessage");
    statusMessage.className = "status-message";
    if (this.gameState === GAME_STATES.WON) statusMessage.classList.add("won");
    else if (this.gameState === GAME_STATES.LOST)
      statusMessage.classList.add("lost");
    else if (this.gameState === GAME_STATES.CASHED_OUT)
      statusMessage.classList.add("cashed-out");
  }

  updateStatusMessage(message) {
    document.getElementById("statusMessage").textContent = message;
  }

  checkBalanceLimits() {
    // Verificar límite máximo
    if (this.balance >= GAME_CONFIG.balanceThresholds.maxBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.maxBalance;
      this.showMaxLimitModal();
      return true;
    }
    
    // Verificar límite mínimo y forzar victoria si es necesario
    if (this.balance < GAME_CONFIG.balanceThresholds.minBalance) {
      this.balance = GAME_CONFIG.balanceThresholds.minBalance;
      return true;
    }
    
    return false;
  }

  showMaxLimitModal() {
    // Bloquear toda la interfaz
    this.gameState = GAME_STATES.READY;
    
    // Mostrar el modal
    const modal = document.getElementById('maxLimitModal');
    const countdownElement = document.getElementById('countdown');
    const restartButton = document.getElementById('restartNowBtn');
    
    if (!modal) {
      console.error("Modal element not found!");
      return;
    }
    
    modal.classList.remove('hidden');
    
    let countdown = 5;
    if (countdownElement) {
      countdownElement.textContent = countdown;
    }
    
    // Agregar evento al botón de reiniciar ahora
    const handleRestartNow = () => {
      clearInterval(countdownInterval);
      this.hideModalAndRestart();
      if (restartButton) {
        restartButton.removeEventListener('click', handleRestartNow);
      }
    };
    
    if (restartButton) {
      restartButton.addEventListener('click', handleRestartNow);
    }
    
    // Iniciar countdown
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdownElement) {
        countdownElement.textContent = countdown;
      }
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        this.hideModalAndRestart();
        if (restartButton) {
          restartButton.removeEventListener('click', handleRestartNow);
        }
      }
    }, 1000);
  }

  hideModalAndRestart() {
    const modal = document.getElementById('maxLimitModal');
    modal.classList.add('hidden');
    
    // Reiniciar el juego después de una pequeña pausa
    setTimeout(() => {
      this.resetToInitialState();
    }, 300);
  }

  resetToInitialState() {
    this.balance = GAME_CONFIG.initialBalance;
    this.resetGame();
    this.updateStatusMessage("Juego reiniciado. Configura tu apuesta y comienza");
  }

  showBalanceWarning() {
    if (this.balance <= GAME_CONFIG.balanceThresholds.minBalance + 5000) {
      this.updateStatusMessage("⚠️ Balance bajo. ¡Juega con cuidado!");
    }
    // Se removió la advertencia de límite máximo a 97k
    // Solo se mantiene el límite máximo de 100k con bloqueo total
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new DiamondMinesGame();
  window.DiamondMinesGame = game;
});
