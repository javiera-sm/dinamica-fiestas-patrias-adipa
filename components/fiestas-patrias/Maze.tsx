"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOAL_POINT,
  MAZE,
  START_POINT,
  getWallSegments,
  hasReachedGoal,
  moveWithCollision,
  type Point,
} from "./mazePath";

/** Menor = la empanada responde más rápido al cursor; mayor = más "inercia". */
const SMOOTHING_TAU = 0.07;
/** Sube el objetivo en touch (unidades de grilla) para que el dedo no tape a la empanada. */
const TOUCH_Y_OFFSET = -0.55;

/** Alto total del viewBox, incluyendo la franja para INICIO/META arriba y abajo. */
const VIEW_ROWS = MAZE.rows + MAZE.labelMargin * 2;
const VIEW_Y0 = -MAZE.labelMargin;
/** Ancho total del viewBox, incluyendo el margen decorativo a cada lado. */
const VIEW_COLS = MAZE.cols + MAZE.sideMargin * 2;
const VIEW_X0 = -MAZE.sideMargin;

/** Ancho de la empanada, en unidades de grilla (la imagen es más ancha que alta: ~1.96:1). */
const EMPANADA_WIDTH_UNITS = 0.82;
const EMPANADA_ASPECT = 245 / 480;

type MazeProps = {
  /** false congela el juego (se usa mientras se muestra la celebración de victoria). */
  active: boolean;
  onWin: () => void;
  /** Se llama una sola vez, en la primera interacción real del usuario con el laberinto. */
  onInteract?: () => void;
};

export function Maze({ active, onWin, onInteract }: MazeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const empanadaRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Point>(START_POINT);
  const targetRef = useRef<Point>(START_POINT);
  const wonRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);

  // --- Interacción y colisión: misma lógica que antes ---

  const setTargetFromClientPoint = useCallback(
    (clientX: number, clientY: number, isTouch: boolean) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (!hasInteractedRef.current) {
        hasInteractedRef.current = true;
        onInteract?.();
      }

      const x = ((clientX - rect.left) / rect.width) * VIEW_COLS + VIEW_X0;
      let y = ((clientY - rect.top) / rect.height) * VIEW_ROWS + VIEW_Y0;
      if (isTouch) y += TOUCH_Y_OFFSET;

      targetRef.current = [x, y];
    },
    [onInteract]
  );

  // Listeners nativos (no props onX de React) para poder llamar
  // preventDefault() en touchmove de forma confiable y evitar que la
  // página haga scroll mientras se juega dentro del laberinto.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleMouseMove = (event: MouseEvent) => {
      setTargetFromClientPoint(event.clientX, event.clientY, false);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) return;
      event.preventDefault();
      const touch = event.touches[0];
      setTargetFromClientPoint(touch.clientX, touch.clientY, true);
    };

    svg.addEventListener("mousemove", handleMouseMove);
    svg.addEventListener("touchstart", handleTouchMove, { passive: false });
    svg.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      svg.removeEventListener("mousemove", handleMouseMove);
      svg.removeEventListener("touchstart", handleTouchMove);
      svg.removeEventListener("touchmove", handleTouchMove);
    };
  }, [setTargetFromClientPoint]);

  useEffect(() => {
    const tick = (time: number) => {
      if (!active) {
        lastTimeRef.current = time;
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const last = lastTimeRef.current ?? time;
      const dt = Math.min((time - last) / 1000, 0.1);
      lastTimeRef.current = time;

      const factor = 1 - Math.exp(-dt / SMOOTHING_TAU);
      const [px, py] = positionRef.current;
      const [tx, ty] = targetRef.current;
      const desired: Point = [px + (tx - px) * factor, py + (ty - py) * factor];
      const next = moveWithCollision(positionRef.current, desired);
      positionRef.current = next;

      // La empanada ya no es parte del SVG: es un <div> posicionado encima
      // vía left/top en porcentaje (coinciden con las unidades de grilla
      // convertidas a fracción del ancho/alto total del viewBox), para
      // poder usar next/image con optimización real en vez de incrustar un
      // <image> dentro del SVG.
      const el = empanadaRef.current;
      if (el) {
        el.style.left = `${((next[0] - VIEW_X0) / VIEW_COLS) * 100}%`;
        el.style.top = `${((next[1] - VIEW_Y0) / VIEW_ROWS) * 100}%`;
      }

      if (!wonRef.current && hasReachedGoal(next)) {
        wonRef.current = true;
        setCelebrating(true);
        onWin();
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [active, onWin]);

  // --- Renderizado: laberinto clásico de paredes continuas ---

  const wallPathD = getWallSegments()
    .map(([[x1, y1], [x2, y2]]) => `M${x1},${y1} L${x2},${y2}`)
    .join(" ");

  const empanadaWidthPct = (EMPANADA_WIDTH_UNITS / VIEW_COLS) * 100;
  const empanadaHeightPct = ((EMPANADA_WIDTH_UNITS * EMPANADA_ASPECT) / VIEW_ROWS) * 100;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${VIEW_X0} ${VIEW_Y0} ${VIEW_COLS} ${VIEW_ROWS}`}
        className="block h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
      >
        <defs>
          <filter id="fp-wall-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.035" />
          </filter>
          <filter id="fp-wall-shadow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.045" />
          </filter>
          <radialGradient id="fp-gate-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6B5BFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6B5BFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="fp-maze-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#111F45" />
            <stop offset="100%" stopColor="#0B1730" />
          </linearGradient>
          {/* Cuadros de la cinta de llegada, como una bandera a cuadros clásica */}
          <pattern
            id="fp-finish-checker"
            width={0.1}
            height={0.1}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(90)"
          >
            <rect width={0.1} height={0.1} fill="#F4F2FF" />
            <rect width={0.05} height={0.05} fill="#4B3FBF" />
            <rect x={0.05} y={0.05} width={0.05} height={0.05} fill="#4B3FBF" />
          </pattern>
        </defs>

        {/*
          Fondo del laberinto: un tono propio (degradado sutil, distinto del
          fondo de la página) para que la tarjeta se distinga sin competir
          con las paredes.
        */}
        <rect
          x={VIEW_X0}
          y={VIEW_Y0}
          width={VIEW_COLS}
          height={VIEW_ROWS}
          rx={0.26}
          fill="url(#fp-maze-bg)"
        />

        {/* Resplandor detrás de la entrada y la salida, para destacarlas */}
        <ellipse cx={START_POINT[0]} cy={MAZE.rows} rx={0.5} ry={0.36} fill="url(#fp-gate-glow)" />
        <ellipse cx={GOAL_POINT[0]} cy={0} rx={0.5} ry={0.36} fill="url(#fp-gate-glow)" />

        {/*
          Laberinto clásico: un único trazo con extremos y uniones
          redondeadas (strokeLinecap/Linejoin="round") en vez de una grilla
          de bloques sueltos. Los segmentos comparten coordenadas exactas en
          cada esquina, así que sus puntas redondeadas se superponen y el
          trazo se ve como una sola pared continua y conectada. Glow y
          sombra deliberadamente sutiles (líneas "modernas", no neón).
        */}
        <path
          d={wallPathD}
          transform="translate(0.04, 0.05)"
          fill="none"
          stroke="rgba(2,5,14,0.45)"
          strokeWidth={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#fp-wall-shadow)"
        />
        <path
          d={wallPathD}
          fill="none"
          stroke="#6B5BFF"
          strokeWidth={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.22}
          filter="url(#fp-wall-glow)"
        />
        <path
          d={wallPathD}
          fill="none"
          stroke="#5A4FD9"
          strokeWidth={0.14}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Etiquetas de inicio y meta, centradas en su propia columna (no corridas a un lado) */}
        <text
          x={START_POINT[0]}
          y={MAZE.rows + MAZE.labelMargin * 0.62}
          textAnchor="middle"
          fontSize={0.17}
          fontWeight={700}
          letterSpacing={0.01}
          fill="rgba(180,190,230,0.75)"
        >
          INICIO
        </text>
        {/*
          Cinta de llegada: dos postes con remate y, entre ambos, una banda
          a cuadros con un leve pandeo (como una cinta real, no un rectángulo
          rígido), a la altura de la salida del laberinto.
        */}
        <line
          x1={GOAL_POINT[0] - 0.4}
          y1={0.13}
          x2={GOAL_POINT[0] - 0.4}
          y2={-0.27}
          stroke="#C9BFFF"
          strokeWidth={0.045}
          strokeLinecap="round"
          opacity={0.9}
        />
        <line
          x1={GOAL_POINT[0] + 0.4}
          y1={0.13}
          x2={GOAL_POINT[0] + 0.4}
          y2={-0.27}
          stroke="#C9BFFF"
          strokeWidth={0.045}
          strokeLinecap="round"
          opacity={0.9}
        />
        <circle cx={GOAL_POINT[0] - 0.4} cy={-0.27} r={0.032} fill="#DCD5FF" />
        <circle cx={GOAL_POINT[0] + 0.4} cy={-0.27} r={0.032} fill="#DCD5FF" />
        <path
          d={`M${GOAL_POINT[0] - 0.4},0.05 Q${GOAL_POINT[0]},-0.05 ${GOAL_POINT[0] + 0.4},0.05 L${GOAL_POINT[0] + 0.4},-0.05 Q${GOAL_POINT[0]},-0.15 ${GOAL_POINT[0] - 0.4},-0.05 Z`}
          fill="url(#fp-finish-checker)"
          stroke="#8B7FFF"
          strokeWidth={0.012}
          strokeLinejoin="round"
        />
        <text
          x={GOAL_POINT[0]}
          y={-0.34}
          textAnchor="middle"
          fontSize={0.17}
          fontWeight={700}
          letterSpacing={0.01}
          fill="#DCD5FF"
        >
          META
        </text>
      </svg>

      {/*
        La empanada vive fuera del SVG (un <div> absoluto posicionado en
        porcentaje) para poder usar next/image con optimización real, en vez
        de incrustar la imagen como <image> dentro del SVG. La celebración
        de victoria anima un <div> interno aparte: el externo se mueve vía
        left/top en cada frame (RAF) y una animación CSS de `transform` en
        ESE MISMO elemento se pisaría con esos estilos inline.
      */}
      <div
        ref={empanadaRef}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${((START_POINT[0] - VIEW_X0) / VIEW_COLS) * 100}%`,
          top: `${((START_POINT[1] - VIEW_Y0) / VIEW_ROWS) * 100}%`,
          width: `${empanadaWidthPct}%`,
          height: `${empanadaHeightPct}%`,
        }}
      >
        <div className={celebrating ? "fp-maze-win relative h-full w-full" : "relative h-full w-full"}>
          <Image
            src="/empanada.png"
            alt="Empanada de pino"
            fill
            sizes="120px"
            className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
            priority
          />
        </div>
      </div>
    </div>
  );
}
