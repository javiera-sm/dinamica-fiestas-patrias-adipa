"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MazeLayout, Point } from "./mazePath";

/** Menor = la empanada responde más rápido al cursor; mayor = más "inercia". */
const SMOOTHING_TAU = 0.07;
/** Sube el objetivo en touch (unidades de grilla) para que el dedo no tape a la empanada. */
const TOUCH_Y_OFFSET = -0.55;

/** Ancho de la empanada, en unidades de grilla (la imagen es más ancha que alta: ~1.96:1). */
const EMPANADA_WIDTH_UNITS = 0.82;
const EMPANADA_ASPECT = 245 / 480;

/**
 * Migas: un pool fijo de divs reciclados (no se crean/destruyen nodos en
 * cada frame, así queda liviano en mobile). Cada uno se "activa" cuando la
 * empanada avanzó al menos CRUMB_MIN_DISTANCE desde la última miga; el
 * fade lo hace la animación CSS `fp-crumb-fade` (globals.css), no un
 * temporizador en JS — por eso no hace falta limpiar nada para que
 * "desaparezcan solas y no se acumulen".
 */
const CRUMB_POOL_SIZE = 12;
const CRUMB_MIN_DISTANCE = 0.16;

type MazeProps = {
  /** Qué grilla/recorrido usar (MOBILE_MAZE o DESKTOP_MAZE, ver mazePath.ts). */
  layout: MazeLayout;
  /**
   * Identificador único de esta instancia ("mobile" | "desktop"): las dos
   * variantes están montadas al mismo tiempo (CSS decide cuál se ve), así
   * que sus <defs> (gradientes, filtros, patrón) necesitan ids distintos
   * — dos elementos con el mismo id en la misma página es inválido y hace
   * que las referencias `url(#id)` puedan resolver al elemento equivocado
   * (por ejemplo, al de la instancia oculta).
   */
  instanceId: string;
  /** false congela el juego (se usa mientras se muestra la celebración de victoria). */
  active: boolean;
  onWin: () => void;
};

export function Maze({ layout, instanceId, active, onWin }: MazeProps) {
  const { config, startPoint, goalPoint } = layout;
  const id = (name: string) => `fp-${name}-${instanceId}`;

  /** Alto total del viewBox, incluyendo la franja para INICIO/META arriba y abajo. */
  const viewRows = config.rows + config.labelMargin * 2;
  const viewY0 = -config.labelMargin;
  /** Ancho total del viewBox, incluyendo el margen decorativo a cada lado. */
  const viewCols = config.cols + config.sideMargin * 2;
  const viewX0 = -config.sideMargin;

  const svgRef = useRef<SVGSVGElement>(null);
  const empanadaRef = useRef<HTMLDivElement>(null);
  const crumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const crumbIndexRef = useRef(0);
  const lastCrumbPosRef = useRef<Point>(startPoint);
  const positionRef = useRef<Point>(startPoint);
  const targetRef = useRef<Point>(startPoint);
  const wonRef = useRef(false);
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

      const x = ((clientX - rect.left) / rect.width) * viewCols + viewX0;
      let y = ((clientY - rect.top) / rect.height) * viewRows + viewY0;
      if (isTouch) y += TOUCH_Y_OFFSET;

      targetRef.current = [x, y];
    },
    [viewCols, viewX0, viewRows, viewY0]
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
      const next = layout.moveWithCollision(positionRef.current, desired);
      positionRef.current = next;

      // Migas: solo dejan una cuando la empanada ya avanzó una distancia
      // mínima desde la última (si no, se activaría un pool entero por
      // segundo con la empanada casi quieta). Puramente visual: no toca
      // targetRef/positionRef ni la colisión.
      const [lastCx, lastCy] = lastCrumbPosRef.current;
      if (Math.hypot(next[0] - lastCx, next[1] - lastCy) >= CRUMB_MIN_DISTANCE) {
        const crumb = crumbRefs.current[crumbIndexRef.current];
        if (crumb) {
          crumb.style.left = `${((lastCx - viewX0) / viewCols) * 100}%`;
          crumb.style.top = `${((lastCy - viewY0) / viewRows) * 100}%`;
          crumb.classList.remove("fp-crumb-active");
          // Fuerza un reflow para que el navegador "note" el quite de la
          // clase antes de volver a agregarla: si no, al ya estar la
          // animación aplicada de una activación anterior, re-agregar la
          // misma clase no la reinicia (CSS no re-dispara una animación ya
          // en curso solo porque el className no cambió de valor).
          void crumb.offsetWidth;
          crumb.classList.add("fp-crumb-active");
        }
        crumbIndexRef.current = (crumbIndexRef.current + 1) % CRUMB_POOL_SIZE;
        lastCrumbPosRef.current = next;
      }

      // La empanada ya no es parte del SVG: es un <div> posicionado encima
      // vía left/top en porcentaje (coinciden con las unidades de grilla
      // convertidas a fracción del ancho/alto total del viewBox), para
      // poder usar next/image con optimización real en vez de incrustar un
      // <image> dentro del SVG.
      const el = empanadaRef.current;
      if (el) {
        el.style.left = `${((next[0] - viewX0) / viewCols) * 100}%`;
        el.style.top = `${((next[1] - viewY0) / viewRows) * 100}%`;
      }

      if (!wonRef.current && layout.hasReachedGoal(next)) {
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
  }, [active, onWin, layout, viewX0, viewY0, viewCols, viewRows]);

  // --- Renderizado: laberinto clásico de paredes continuas ---

  const wallPathD = layout
    .getWallSegments()
    .map(([[x1, y1], [x2, y2]]) => `M${x1},${y1} L${x2},${y2}`)
    .join(" ");

  const empanadaWidthPct = (EMPANADA_WIDTH_UNITS / viewCols) * 100;
  const empanadaHeightPct = ((EMPANADA_WIDTH_UNITS * EMPANADA_ASPECT) / viewRows) * 100;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${viewX0} ${viewY0} ${viewCols} ${viewRows}`}
        className="block h-full w-full touch-none select-none"
        style={{ touchAction: "none" }}
      >
        <defs>
          <filter id={id("wall-glow")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.035" />
          </filter>
          <filter id={id("wall-shadow")} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.045" />
          </filter>
          <radialGradient id={id("gate-glow-subtle")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6B5BFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6B5BFF" stopOpacity="0" />
          </radialGradient>
          {/* Resplandor más grande, para el layout de escritorio (sutil, no un foco de luz) */}
          <radialGradient id={id("gate-glow-bright")} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C7BFFF" stopOpacity="0.65" />
            <stop offset="45%" stopColor="#8B7CFF" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#6B5BFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id("maze-bg")} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#111F45" />
            <stop offset="100%" stopColor="#0B1730" />
          </linearGradient>
          {/* Cuadros de la cinta de llegada, como una bandera a cuadros clásica */}
          <pattern
            id={id("finish-checker")}
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
        <rect x={viewX0} y={viewY0} width={viewCols} height={viewRows} rx={0.26} fill={`url(#${id("maze-bg")})`} />

        {/* Resplandor detrás de la entrada y la salida, para destacarlas */}
        <ellipse
          cx={startPoint[0]}
          cy={config.rows}
          rx={config.gateGlow.rx}
          ry={config.gateGlow.ry}
          fill={`url(#${id(`gate-glow-${config.gateGlow.variant}`)})`}
        />
        <ellipse
          cx={goalPoint[0]}
          cy={0}
          rx={config.gateGlow.rx}
          ry={config.gateGlow.ry}
          fill={`url(#${id(`gate-glow-${config.gateGlow.variant}`)})`}
        />

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
          filter={`url(#${id("wall-shadow")})`}
        />
        <path
          d={wallPathD}
          fill="none"
          stroke="#6B5BFF"
          strokeWidth={0.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.22}
          filter={`url(#${id("wall-glow")})`}
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
          x={startPoint[0]}
          y={config.rows + config.labelMargin * 0.62}
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
          x1={goalPoint[0] - 0.4}
          y1={0.13}
          x2={goalPoint[0] - 0.4}
          y2={-0.27}
          stroke="#C9BFFF"
          strokeWidth={0.045}
          strokeLinecap="round"
          opacity={0.9}
        />
        <line
          x1={goalPoint[0] + 0.4}
          y1={0.13}
          x2={goalPoint[0] + 0.4}
          y2={-0.27}
          stroke="#C9BFFF"
          strokeWidth={0.045}
          strokeLinecap="round"
          opacity={0.9}
        />
        <circle cx={goalPoint[0] - 0.4} cy={-0.27} r={0.032} fill="#DCD5FF" />
        <circle cx={goalPoint[0] + 0.4} cy={-0.27} r={0.032} fill="#DCD5FF" />
        <path
          d={`M${goalPoint[0] - 0.4},0.05 Q${goalPoint[0]},-0.05 ${goalPoint[0] + 0.4},0.05 L${goalPoint[0] + 0.4},-0.05 Q${goalPoint[0]},-0.15 ${goalPoint[0] - 0.4},-0.05 Z`}
          fill={`url(#${id("finish-checker")})`}
          stroke="#8B7FFF"
          strokeWidth={0.012}
          strokeLinejoin="round"
        />
        <text
          x={goalPoint[0]}
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
        Pool fijo de "migas": se posicionan y activan imperativamente desde
        el loop RAF (arriba), nunca vía estado de React — evita re-renders
        por cada miga y mantiene esto liviano en mobile. Van antes que la
        empanada en el DOM para quedar visualmente detrás de ella.
      */}
      {Array.from({ length: CRUMB_POOL_SIZE }, (_, index) => (
        <div
          key={index}
          ref={(el) => {
            crumbRefs.current[index] = el;
          }}
          className="fp-crumb"
        />
      ))}

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
          left: `${((startPoint[0] - viewX0) / viewCols) * 100}%`,
          top: `${((startPoint[1] - viewY0) / viewRows) * 100}%`,
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
