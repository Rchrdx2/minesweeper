# Manual de Uso: Código del Juego "Diamond Mines"

Este documento detalla el funcionamiento interno, la lógica y la configuración del juego de casino **Diamond Mines**, basado en el archivo `app.js` proporcionado. El objetivo es ofrecer una guía completa para desarrolladores o administradores que necesiten entender, modificar o mantener el código del juego.

## 1. Descripción General del Juego

**Diamond Mines** es un juego de apuestas en un tablero de 5x5 (25 casillas). El objetivo del jugador es descubrir casillas que contienen diamantes y evitar las que ocultan minas. El juego está diseñado con una serie de sistemas automáticos e invisibles que ajustan la dificultad y las probabilidades en tiempo real, principalmente en función del balance del jugador y su racha de juego.

### Características Principales

- **Balance en Pesos Colombianos (COP):** El juego opera con un sistema de balance y apuestas en moneda local.
- **Mecánicas Invisibles:** Incluye sistemas de manipulación que no son evidentes para el jugador, como rangos dinámicos y control de rachas.
- **Probabilidades Adaptativas:** La dificultad se ajusta automáticamente según el balance para controlar la economía del juego y la experiencia del usuario.
- **Límites de Balance:** Posee protecciones para evitar que el balance llegue a cero (`$5,000`) y un límite máximo de ganancias (`$100,000`) para reiniciar el ciclo de juego.

## 2. Configuración Principal (`GAME_CONFIG`)

Toda la configuración central del juego se encuentra en el objeto `GAME_CONFIG`. Modificar estos valores alterará directamente el comportamiento del juego.

| Parámetro                      | Valor por Defecto | Descripción                                                                        |
| :----------------------------- | :---------------- | :--------------------------------------------------------------------------------- |
| `boardSize`                    | `5`               | Define el tamaño del tablero (5x5).                                                |
| `initialBalance`               | `50000`           | Balance inicial con el que comienza cada jugador al reiniciar.                     |
| `minBet`                       | `1000`            | Apuesta mínima permitida.                                                          |
| `maxBet`                       | `5000`            | Apuesta máxima permitida.                                                          |
| `balanceThresholds.forceWin`   | `40000`           | Umbral de balance por debajo del cual se activa el sistema de "victoria asistida". |
| `balanceThresholds.maxBalance` | `100000`          | Límite máximo de balance. Al alcanzarlo, el juego se reinicia.                     |
| `balanceThresholds.minBalance` | `5000`            | Balance mínimo protegido. El sistema previene que el jugador baje de esta cifra.   |

### Configuración de Sistemas Internos

- **`manipulation`**: Define los "espacios seguros" en el modo de victoria asistida, dependiendo del rango de balance del jugador.
- **`streakControl`**: Configura el sistema de control de rachas, estableciendo el máximo de `cashouts` consecutivos en `3` antes de forzar una derrota.
- **`randomRangeControl`**: Establece las probabilidades de pérdida forzada cuando el balance es alto. Se activa cuando `enableDynamicLoss` es `true`.
- **`normalization`**: Configura el sistema que "normaliza" el juego (desactiva la probabilidad de pérdida dinámica) después de `20` partidas.
- **`multipliers`**: Define la fórmula para calcular las ganancias, usando una base exponencial (`1.1`) y factores de riesgo según la cantidad de minas seleccionadas.

## 3. Sistemas de Manipulación (Lógica Invisible)

El núcleo del juego reside en sus sistemas de control dinámico, que operan en segundo plano para gestionar la experiencia del usuario. Se activan en función del balance del jugador.

### Escenario 1: Balance Bajo (< $40,000 COP) - "Victoria Asistida"

Cuando el balance cae por debajo de los `$40,000`, se activa el sistema `manipulationActive`. Su objetivo es ayudar al jugador a recuperarse, permitiéndole descubrir un número determinado de casillas de forma segura.

- **Lógica:** El sistema calcula un número máximo de espacios (`maxSpaces`) que el jugador puede descubrir sin encontrar una mina. Si el jugador hace clic en una casilla con mina dentro de este límite, **el sistema mueve la mina a otra casilla vacía en tiempo real** para garantizar que el jugador no pierda.
- **Espacios Seguros por Balance:**
  - **$35,000 - $39,999:** 3 espacios seguros.
  - **$30,000 - $34,999:** 4 espacios seguros.
  - **$25,000 - $29,999:** 5 espacios seguros.
  - **$20,000 - $24,999:** 6 espacios seguros.
  - **$15,000 - $19,999:** 7 espacios seguros.
  - **$10,000 - $14,999:** 8 espacios seguros.
  - **$5,000 - $9,999:** 10 espacios seguros.

> **Nota importante:** Si el jugador excede el número de espacios seguros permitidos, el sistema forzará una pérdida en el siguiente clic, colocando una mina en la casilla seleccionada si esta no la tenía originalmente.

### Escenario 2: Balance Alto (≥ $40,000 COP) - "Juego Aleatorio Controlado"

En este rango, el juego se vuelve predominantemente aleatorio, pero está sujeto a tres sistemas de control que se ejecutan en el siguiente orden de prioridad:

#### A. Sistema de Control de Rachas (Prioridad Alta)

Este sistema evita que un jugador obtenga demasiadas ganancias consecutivas.

- **Lógica:** Si un jugador realiza **3 cashouts o victorias seguidas**, el sistema activa la bandera `forceNextLoss`. En la siguiente partida, la primera casilla que el jugador seleccione contendrá una mina, garantizando una derrota para romper la racha. El contador se reinicia al perder.

#### B. Probabilidad de Pérdida Dinámica (Prioridad Media)

A medida que el balance del jugador aumenta, también lo hace la probabilidad de que el sistema fuerce una pérdida al inicio de una jugada, colocando una mina en la primera casilla seleccionada.

- **Lógica:** Antes de procesar un clic, el sistema calcula una probabilidad de pérdida (`lossChance`) y la compara con un valor aleatorio. Si la condición se cumple, fuerza la derrota.
- **Probabilidades por Balance:**
  - **$40,000 - $49,999:** 25% de probabilidad de pérdida.
  - **$50,000 - $59,999:** 35% de probabilidad de pérdida.
  - **$60,000 - $69,999:** 45% de probabilidad de pérdida.
  - **$70,000 - $79,999:** 55% de probabilidad de pérdida.
  - **$80,000 - $89,999:** 65% de probabilidad de pérdida.
  - **≥ $90,000:** 75% de probabilidad de pérdida.

#### C. Sistema de Normalización (Condicional)

Para que el juego no se perciba como predecible a largo plazo, este sistema "normaliza" la experiencia después de un número determinado de partidas.

- **Lógica:** Después de **20 partidas** (`gameThreshold`), el sistema de **Probabilidad de Pérdida Dinámica se desactiva permanentemente** para esa sesión (`enableDynamicLoss = false`). Esto significa que el juego se vuelve puramente aleatorio en ese aspecto, aunque los otros sistemas (control de rachas y victoria asistida) permanecen activos.

## 4. Flujo del Juego y Estados (`GAME_STATES`)

El juego opera bajo una máquina de estados finitos que dicta las acciones disponibles.

- `READY`: Listo para empezar. Se pueden configurar la apuesta y las minas.
- `PLAYING`: Partida en curso. Se puede hacer clic en las casillas o retirar (`Cash Out`).
- `WON`: El jugador encontró todos los diamantes.
- `LOST`: El jugador seleccionó una mina.
- `CASHED_OUT`: El jugador retiró las ganancias antes de finalizar la partida.

## 5. Funciones y Métodos Clave

La lógica del juego está encapsulada en la clase `DiamondMinesGame`. A continuación se describen sus métodos más importantes.

| Método                                  | Descripción                                                                                                                      |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `initializeGame()`                      | Prepara el tablero, los eventos y la interfaz inicial.                                                                           |
| `startGame()`                           | Inicia una nueva partida. Descuenta la apuesta, activa los sistemas de manipulación y configura el tablero.                      |
| `handleCellClick(index)`                | Gestiona el clic en una casilla. Es el punto de entrada para toda la lógica de manipulación (rachas, probabilidad y asistencia). |
| `manipulateMines(index)`                | Mueve o coloca minas en tiempo real cuando el sistema de "Victoria Asistida" está activo.                                        |
| `applyRandomRangeManipulation(index)`   | Aplica la lógica de control de rachas, forzando una pérdida si es necesario.                                                     |
| `applyProbabilisticManipulation(index)` | Aplica la lógica de probabilidad de pérdida dinámica en el rango de balance alto.                                                |
| `cashOut()`                             | Permite al jugador retirar las ganancias acumuladas y activa el contador de rachas.                                              |
| `endGame(won)`                          | Finaliza la partida (victoria o derrota). Calcula ganancias y gestiona el control de rachas.                                     |
| `resetToInitialState()`                 | Reinicia el juego por completo a su estado original (balance, contadores, etc.).                                                 |
| `updateUI()`                            | Actualiza todos los elementos visuales de la interfaz.                                                                           |
| `checkBalanceLimits()`                  | Verifica si se ha alcanzado el balance máximo ($100,000) o mínimo ($5,000).                                                      |
| `checkSystemNormalization()`            | Comprueba si se ha alcanzado el umbral de 20 partidas para desactivar la probabilidad dinámica.                                  |

## 6. Inicialización del Juego

El juego se instancia y se ejecuta cuando el DOM (Document Object Model) de la página ha cargado por completo. La instancia se asigna a `window.DiamondMinesGame` para facilitar la depuración y el monitoreo desde la consola del navegador.
