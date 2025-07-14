# 💎 Diamond Mines

Un emocionante juego de casino basado en buscaminas donde los jugadores pueden apostar dinero virtual y multiplicar sus ganancias encontrando diamantes mientras evitan las minas.

## 📖 Descripción

Diamond Mines es una versión moderna del clásico buscaminas con mecánicas de casino. Los jugadores inician con $50.000 pesos colombianos y pueden apostar en tableros de 5x5 casillas con diferentes niveles de dificultad (3, 4 o 5 minas). El objetivo es encontrar diamantes para multiplicar las ganancias sin tocar ninguna mina.

## ✨ Características Principales

- **🎮 Tablero 5x5**: 25 casillas para explorar en cada partida
- **💰 Sistema de balance**: Inicia con $50.000 pesos colombianos
- **⚙️ Configuración de dificultad**: Elige entre 3, 4 o 5 minas
- **📈 Multiplicadores dinámicos**: Las ganancias aumentan con cada diamante encontrado
- **💸 Apuestas flexibles**: Desde $1.000 hasta $5.000 por partida
- **🏆 Función Cash Out**: Retira ganancias en cualquier momento
- **🎨 Diseño de casino**: Tema elegante con colores dorado, plateado y negro
- **📱 Totalmente responsivo**: Optimizado para móviles, tablets y desktop

## 🎯 Cómo Jugar

1. **💵 Configura tu apuesta**: Usa los botones ½ y 2× o ingresa un monto manualmente (mín. $1.000, máx. $5.000)
2. **⚡ Selecciona dificultad**: Elige 3, 4 o 5 minas (más minas = mayor multiplicador y riesgo)
3. **🎮 Inicia el juego**: Haz clic en "Iniciar Juego"
4. **💎 Busca diamantes**: Haz clic en las casillas para revelarlas
5. **💰 Cash Out opcional**: Retira tus ganancias cuando te sientas seguro
6. **⚠️ Evita las minas**: Un solo error y pierdes la apuesta completa

## 🏗️ Estructura del Proyecto

```
minesweeper/
├── 📄 index.html          # Estructura principal del juego
├── 🎨 style.css           # Estilos y diseño visual
├── ⚙️ app.js              # Lógica completa del juego
├── 📖 README.md           # Documentación principal
├── 📋 LOGICA_JUEGO.md     # Documentación técnica detallada
└── 🖼️ assets/
    └── fondo.png          # Imagen de fondo del casino
```

## 💡 Sistema de Multiplicadores

El juego utiliza un sistema de multiplicadores que crece exponencialmente:

- **Base**: 1.2^diamantes_encontrados
- **Factor de riesgo**:
  - 3 minas: 1.5×
  - 4 minas: 2.0×
  - 5 minas: 2.5×

**Ejemplo**: Con 5 minas y 3 diamantes encontrados: (1.2³) × 2.5 = 4.32×

## 🔧 Límites y Balance

- **Balance inicial**: $50.000
- **Límite máximo**: $100.000 (el juego se reinicia automáticamente)
- **Límite mínimo efectivo**: $40.000 (el sistema ayuda sutilmente al jugador)
- **Apuesta mínima**: $1.000
- **Apuesta máxima**: $5.000 o balance disponible (el menor)

## 🚀 Instalación y Uso

### Instalación Local

```bash
# Clona el repositorio
git clone https://github.com/Rchrdx2/minesweeper.git

# Navega al directorio
cd minesweeper

# Abre index.html en tu navegador
```

### 🌐 Deployment

El juego es una aplicación web estática compatible con:

- GitHub Pages
- Netlify
- Vercel
- Cualquier servidor web

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura semántica y accesible
- **CSS3**:
  - Variables CSS personalizadas
  - Flexbox y CSS Grid
  - Animaciones y transiciones
  - Diseño responsivo
- **JavaScript (ES6+)**:
  - Programación orientada a objetos
  - Módulos ES6
  - Manipulación avanzada del DOM
  - Sistema de eventos

## 🎨 Sistema de Diseño

### Paleta de Colores

- **Primario**: Dorado (#FFD700) - Elementos principales y éxito
- **Secundario**: Plateado (#C0C0C0) - Elementos secundarios
- **Error**: Rojo oscuro (#8B0000) - Minas y errores
- **Fondo**: Negro (#000000) - Ambiente de casino elegante

### Tipografía

- **Fuente principal**: Montserrat
- **Jerarquía**: 6 niveles de encabezados
- **Responsive**: Escalado automático por dispositivo

## 📱 Compatibilidad

### Navegadores Soportados

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Dispositivos

- ✅ Desktop (1280px+)
- ✅ Laptop (1024px+)
- ✅ Tablet (768px+)
- ✅ Móvil (480px+)

## 🎮 Estrategias de Juego

### 🟢 Principiante

- Usa 3 minas para aprender
- Haz Cash Out temprano (2-3 diamantes)
- Apuesta montos pequeños

### 🟡 Intermedio

- Experimenta con 4-5 minas
- Busca 4-5 diamantes antes del Cash Out
- Gestiona el riesgo vs recompensa

### 🔴 Avanzado

- Maximiza con 5 minas
- Busca multiplicadores de 10× o más
- Gestión avanzada de bankroll

## 🔍 Características Técnicas

### Sistema de Juego

- Generación aleatoria de minas por partida
- Estados del juego: READY, PLAYING, WON, LOST, CASHED_OUT
- Validación en tiempo real de apuestas y balance
- Manipulación sutil del RNG para balance de juego

### Interfaz de Usuario

- Componentes modulares y reutilizables
- Animaciones CSS fluidas (revelado de celdas, efectos hover)
- Sistema modal para avisos importantes
- Feedback visual inmediato para todas las acciones

### Gestión de Estado

- Persistencia de balance entre partidas
- Validación automática de límites
- Sistema de multiplicadores en tiempo real
- Gestión inteligente de riesgo

## 📋 Documentación Adicional

- **[LOGICA_JUEGO.md](LOGICA_JUEGO.md)**: Documentación técnica completa
- **Código documentado**: Todos los archivos incluyen comentarios explicativos en español
- **Sistema modular**: Arquitectura escalable y mantenible

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para contribuir:

1. **Fork** el proyecto
2. **Crea** una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. **Abre** un Pull Request

### Ideas de Mejoras

- 🎵 Efectos de sonido
- 🏆 Sistema de logros
- 📊 Estadísticas históricas
- 🌐 Múltiples idiomas
- 💾 Guardado local de progreso

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Rchrdx2**

- GitHub: [@Rchrdx2](https://github.com/Rchrdx2)
- Repositorio: [Diamond Mines](https://github.com/Rchrdx2/minesweeper)

---

_¡Disfruta el juego y que la suerte esté de tu lado! 💎🍀_
