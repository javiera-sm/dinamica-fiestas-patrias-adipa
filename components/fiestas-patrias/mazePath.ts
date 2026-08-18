/**
 * Laberinto clásico: una grilla de celdas abiertas/pared (igual que antes,
 * para no tocar la lógica de colisión que ya funciona), pero ahora se
 * expone también como una lista de segmentos de PARED continuos
 * (getWallSegments), para que Maze.tsx pueda dibujarlo como un laberinto
 * real de líneas conectadas en vez de una grilla de bloques sueltos.
 *
 * Diseño intencionalmente pequeño y simple (resoluble en ~5-10 segundos):
 * una única ruta del inicio (abajo) a la meta (arriba) con 4 giros, más 2
 * callejones sin salida de una celda cada uno. Ningún callejón conecta dos
 * puntos de la ruta principal entre sí (eso crearía un atajo en vez de un
 * callejón sin salida) — verificado a mano celda por celda.
 */

export type Point = [number, number];
export type Cell = [row: number, col: number];

export const MAZE = {
  cols: 4,
  rows: 5,
  /** Radio de colisión de la empanada, en unidades de grilla. */
  empanadaRadius: 0.26,
  /**
   * Franja extra arriba y abajo de la grilla (mismas unidades) reservada
   * para las etiquetas "INICIO"/"META": así quedan centradas en su propia
   * columna (la de la entrada/salida real), no corridas hacia un costado
   * para no tapar la empanada.
   */
  labelMargin: 0.5,
  /**
   * Franja extra a cada lado de la grilla (mismas unidades), puramente
   * decorativa/de encuadre: ensancha el módulo del laberinto sin tocar la
   * grilla de celdas ni la colisión (que sigue operando en las mismas
   * MAZE.cols x MAZE.rows unidades de siempre). Junto con labelMargin más
   * chico, hace que el módulo se sienta más ancho y menos alto sin cambiar
   * el recorrido ni la lógica del laberinto.
   */
  sideMargin: 0.36,
};

const OPEN_CELLS: Cell[] = [
  // Ruta principal, de la meta (fila 0) al inicio (fila 4)
  [0, 1], // meta
  [1, 1],
  [1, 2],
  [2, 2],
  [3, 2],
  [3, 1],
  [4, 1], // inicio
  // Callejones sin salida (1 celda cada uno)
  [1, 3], // cuelga de [1,2]
  [3, 0], // cuelga de [3,1]
];

const GRID: boolean[][] = Array.from({ length: MAZE.rows }, () => Array(MAZE.cols).fill(false));
for (const [row, col] of OPEN_CELLS) {
  GRID[row][col] = true;
}

export function isOpenCell(row: number, col: number): boolean {
  if (row < 0 || row >= MAZE.rows || col < 0 || col >= MAZE.cols) return false;
  return GRID[row][col];
}

function cellCenter([row, col]: Cell): Point {
  return [col + 0.5, row + 0.5];
}

export const START_CELL: Cell = [4, 1];
export const GOAL_CELL: Cell = [0, 1];
export const START_POINT: Point = cellCenter(START_CELL);
export const GOAL_POINT: Point = cellCenter(GOAL_CELL);

/** Distancia (al centro de la celda meta) bajo la cual se considera llegada. */
export const GOAL_RADIUS = 0.38;

/**
 * ¿Puede la empanada (aproximada como un cuadrado de lado 2*radius, más
 * simple y suficientemente preciso que un círculo para este laberinto) estar
 * centrada en (x,y) sin quedar parcialmente sobre una celda de pared?
 * Se comprueba el centro y las cuatro esquinas de ese cuadrado.
 */
function isPositionOpen(x: number, y: number, radius: number): boolean {
  const offsets: Point[] = [
    [0, 0],
    [-radius, -radius],
    [radius, -radius],
    [-radius, radius],
    [radius, radius],
  ];
  return offsets.every(([ox, oy]) => {
    const col = Math.floor(x + ox);
    const row = Math.floor(y + oy);
    return isOpenCell(row, col);
  });
}

/**
 * Mueve desde `current` hacia `desired`, con los ejes evaluados por
 * separado: si el eje X queda bloqueado por una pared pero el Y no, la
 * empanada igual avanza en Y (se "desliza" contra la pared en vez de
 * quedar pegada) — la técnica estándar de colisión deslizante en grillas.
 */
export function moveWithCollision(current: Point, desired: Point): Point {
  const radius = MAZE.empanadaRadius;
  let [x, y] = current;

  if (isPositionOpen(desired[0], y, radius)) {
    x = desired[0];
  }
  if (isPositionOpen(x, desired[1], radius)) {
    y = desired[1];
  }

  return [x, y];
}

export function hasReachedGoal(position: Point): boolean {
  const dist = Math.hypot(position[0] - GOAL_POINT[0], position[1] - GOAL_POINT[1]);
  return dist <= GOAL_RADIUS;
}

/**
 * Genera la lista de segmentos de pared (cada uno de largo 1 unidad) a
 * partir de la grilla abierta/cerrada: hay una pared en el límite entre dos
 * celdas vecinas SOLO cuando una es transitable y la otra no (XOR) — dos
 * celdas de pared contiguas no dibujan nada entre sí (es roca sólida, sin
 * borde que marcar), y dos celdas abiertas contiguas tampoco (ahí pasa el
 * recorrido). Si dibujara una pared cada vez que ambas celdas no están
 * abiertas a la vez, cada celda de pared quedaría rodeada por su cuenta y
 * el laberinto se vería como una grilla de cajas sueltas en vez de un
 * laberinto real con paredes solo alrededor del camino.
 */
export function getWallSegments(): [Point, Point][] {
  const segments: [Point, Point][] = [];

  // Paredes verticales (entre columna c-1 y c), incluye los bordes izq/der exteriores.
  for (let c = 0; c <= MAZE.cols; c++) {
    for (let r = 0; r < MAZE.rows; r++) {
      const leftOpen = isOpenCell(r, c - 1);
      const rightOpen = isOpenCell(r, c);
      if (leftOpen !== rightOpen) {
        segments.push([[c, r], [c, r + 1]]);
      }
    }
  }

  // Paredes horizontales (entre fila r-1 y r), incluye los bordes sup/inf exteriores,
  // salvo en la celda de entrada (abajo) y de salida (arriba).
  for (let r = 0; r <= MAZE.rows; r++) {
    for (let c = 0; c < MAZE.cols; c++) {
      if (r === MAZE.rows && c === START_CELL[1]) continue; // hueco de entrada
      if (r === 0 && c === GOAL_CELL[1]) continue; // hueco de salida

      const topOpen = isOpenCell(r - 1, c);
      const bottomOpen = isOpenCell(r, c);
      if (topOpen !== bottomOpen) {
        segments.push([[c, r], [c + 1, r]]);
      }
    }
  }

  return segments;
}
