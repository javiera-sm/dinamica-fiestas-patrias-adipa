/**
 * Laberinto clásico: una grilla de celdas abiertas/pared, expuesta también
 * como una lista de segmentos de PARED continuos (getWallSegments), para
 * que Maze.tsx pueda dibujarlo como un laberinto real de líneas conectadas
 * en vez de una grilla de bloques sueltos.
 *
 * Hay DOS layouts independientes, construidos con la misma lógica
 * (createMazeLayout): MOBILE_MAZE (el de siempre, sin tocar) y
 * DESKTOP_MAZE (más ancho, con un poco más de recorrido — solo se usa en
 * la versión de escritorio). Cada layout es su propia grilla/colisión
 * autocontenida; Maze.tsx recibe cuál usar por prop.
 */

export type Point = [number, number];
export type Cell = [row: number, col: number];

export type MazeConfig = {
  cols: number;
  rows: number;
  /** Radio de colisión de la empanada, en unidades de grilla. */
  empanadaRadius: number;
  /**
   * Franja extra arriba y abajo de la grilla (mismas unidades) reservada
   * para las etiquetas "INICIO"/"META": así quedan centradas en su propia
   * columna (la de la entrada/salida real), no corridas hacia un costado
   * para no tapar la empanada.
   */
  labelMargin: number;
  /**
   * Franja extra a cada lado de la grilla (mismas unidades), puramente
   * decorativa/de encuadre: ensancha el módulo del laberinto sin tocar la
   * grilla de celdas ni la colisión.
   */
  sideMargin: number;
  /**
   * Radio (rx, ry) y variante del resplandor detrás de la entrada/salida.
   * "bright" es un resplandor más grande y notorio (usado en el layout de
   * escritorio); "subtle" es el resplandor original, sin cambios.
   */
  gateGlow: { rx: number; ry: number; variant: "subtle" | "bright" };
};

export type MazeLayout = {
  config: MazeConfig;
  startCell: Cell;
  goalCell: Cell;
  startPoint: Point;
  goalPoint: Point;
  goalRadius: number;
  isOpenCell: (row: number, col: number) => boolean;
  moveWithCollision: (current: Point, desired: Point) => Point;
  hasReachedGoal: (position: Point) => boolean;
  getWallSegments: () => [Point, Point][];
};

/** Distancia (al centro de la celda meta) bajo la cual se considera llegada. */
const GOAL_RADIUS = 0.38;

function cellCenter([row, col]: Cell): Point {
  return [col + 0.5, row + 0.5];
}

/**
 * Construye un layout de laberinto completo (grilla + colisión + paredes)
 * a partir de una lista de celdas abiertas. Ningún callejón sin salida
 * debe conectar dos puntos de la ruta principal entre sí (eso crearía un
 * atajo en vez de un callejón sin salida) — se verifica a mano, celda por
 * celda, al diseñar cada layout más abajo.
 */
function createMazeLayout(config: MazeConfig, openCells: Cell[], startCell: Cell, goalCell: Cell): MazeLayout {
  const grid: boolean[][] = Array.from({ length: config.rows }, () => Array(config.cols).fill(false));
  for (const [row, col] of openCells) {
    grid[row][col] = true;
  }

  function isOpenCell(row: number, col: number): boolean {
    if (row < 0 || row >= config.rows || col < 0 || col >= config.cols) return false;
    return grid[row][col];
  }

  const startPoint = cellCenter(startCell);
  const goalPoint = cellCenter(goalCell);

  /**
   * ¿Puede la empanada (aproximada como un cuadrado de lado 2*radius, más
   * simple y suficientemente preciso que un círculo) estar centrada en
   * (x,y) sin quedar parcialmente sobre una celda de pared? Se comprueba
   * el centro y las cuatro esquinas de ese cuadrado.
   */
  function isPositionOpen(x: number, y: number, radius: number): boolean {
    const offsets: Point[] = [
      [0, 0],
      [-radius, -radius],
      [radius, -radius],
      [-radius, radius],
      [radius, radius],
    ];
    return offsets.every(([ox, oy]) => isOpenCell(Math.floor(y + oy), Math.floor(x + ox)));
  }

  /**
   * Mueve desde `current` hacia `desired`, con los ejes evaluados por
   * separado: si el eje X queda bloqueado por una pared pero el Y no, la
   * empanada igual avanza en Y (se "desliza" contra la pared) — la técnica
   * estándar de colisión deslizante en grillas.
   */
  function moveWithCollision(current: Point, desired: Point): Point {
    const radius = config.empanadaRadius;
    let [x, y] = current;
    if (isPositionOpen(desired[0], y, radius)) x = desired[0];
    if (isPositionOpen(x, desired[1], radius)) y = desired[1];
    return [x, y];
  }

  function hasReachedGoal(position: Point): boolean {
    return Math.hypot(position[0] - goalPoint[0], position[1] - goalPoint[1]) <= GOAL_RADIUS;
  }

  /**
   * Genera la lista de segmentos de pared (cada uno de largo 1 unidad) a
   * partir de la grilla abierta/cerrada: hay una pared en el límite entre
   * dos celdas vecinas SOLO cuando una es transitable y la otra no (XOR) —
   * dos celdas de pared contiguas no dibujan nada entre sí, y dos celdas
   * abiertas contiguas tampoco (ahí pasa el recorrido). Si dibujara una
   * pared cada vez que ambas celdas no están abiertas a la vez, cada
   * celda de pared quedaría rodeada por su cuenta y el laberinto se vería
   * como una grilla de cajas sueltas en vez de un laberinto real.
   */
  function getWallSegments(): [Point, Point][] {
    const segments: [Point, Point][] = [];

    for (let c = 0; c <= config.cols; c++) {
      for (let r = 0; r < config.rows; r++) {
        const leftOpen = isOpenCell(r, c - 1);
        const rightOpen = isOpenCell(r, c);
        if (leftOpen !== rightOpen) {
          segments.push([[c, r], [c, r + 1]]);
        }
      }
    }

    for (let r = 0; r <= config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (r === config.rows && c === startCell[1]) continue; // hueco de entrada
        if (r === 0 && c === goalCell[1]) continue; // hueco de salida

        const topOpen = isOpenCell(r - 1, c);
        const bottomOpen = isOpenCell(r, c);
        if (topOpen !== bottomOpen) {
          segments.push([[c, r], [c + 1, r]]);
        }
      }
    }

    return segments;
  }

  return {
    config,
    startCell,
    goalCell,
    startPoint,
    goalPoint,
    goalRadius: GOAL_RADIUS,
    isOpenCell,
    moveWithCollision,
    hasReachedGoal,
    getWallSegments,
  };
}

/**
 * Layout mobile/tablet: el de siempre, SIN NINGÚN CAMBIO (mismo recorrido,
 * mismos callejones sin salida). 7 celdas de ruta principal (4 giros) + 2
 * callejones sin salida de 1 celda cada uno.
 */
export const MOBILE_MAZE: MazeLayout = createMazeLayout(
  {
    cols: 4,
    rows: 5,
    empanadaRadius: 0.26,
    labelMargin: 0.5,
    sideMargin: 0.36,
    gateGlow: { rx: 0.5, ry: 0.36, variant: "subtle" },
  },
  [
    [0, 1], // meta
    [1, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [3, 1],
    [4, 1], // inicio
    [1, 3], // cuelga de [1,2]
    [3, 0], // cuelga de [3,1]
  ],
  [4, 1],
  [0, 1]
);

/**
 * Layout de escritorio: mismo concepto y dificultad (fácil, un único
 * recorrido con giros + un callejón sin salida), en una grilla mucho más
 * ancha que alta (8x3, proporción ~2:1) para una composición pensada para
 * pantallas anchas — y más simple que un intento anterior (menos giros,
 * un solo callejón) para que el inicio no se sienta abrupto: el primer
 * tramo es largo (4 celdas) antes del primer giro. La ruta sube en
 * "escalera" (siempre hacia la derecha y hacia arriba) para poder
 * ensancharla sin crear atajos: cada tramo horizontal solo comparte, con
 * el tramo de la fila vecina, la columna exacta del giro — verificado
 * celda por celda (grado de cada nodo) para que ningún callejón ni ningún
 * giro conecte dos puntos de la ruta principal entre sí.
 */
export const DESKTOP_MAZE: MazeLayout = createMazeLayout(
  {
    cols: 8,
    rows: 3,
    empanadaRadius: 0.26,
    labelMargin: 0.6,
    sideMargin: 0.3,
    gateGlow: { rx: 0.62, ry: 0.42, variant: "bright" },
  },
  [
    [2, 1], // inicio
    [2, 2],
    [2, 3],
    [2, 4],
    [1, 4],
    [1, 5],
    [1, 6],
    [2, 6], // cuelga de [1,6] (callejón sin salida)
    [0, 6], // meta
  ],
  [2, 1],
  [0, 6]
);
