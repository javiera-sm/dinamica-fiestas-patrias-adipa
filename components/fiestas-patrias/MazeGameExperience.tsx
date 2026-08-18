"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdipaIsotype } from "./AdipaIsotype";
import { ChileanPatternBackground } from "./ChileanPatternBackground";
import { ClockIcon, CountdownTimer } from "./CountdownTimer";
import { CouponCard } from "./CouponCard";
import { Maze } from "./Maze";
import { MAZE } from "./mazePath";

/**
 * Relación de aspecto real del contenido dibujado dentro del SVG del
 * laberinto (ancho de la grilla / alto de la grilla + la franja para
 * INICIO/META arriba y abajo). El contenedor usa esta MISMA proporción para
 * que el <svg> (que preserva su aspecto internamente) llene el módulo por
 * completo, sin franjas vacías a los costados que lo hacían ver más
 * angosto/vertical de lo que el espacio disponible permitía.
 */
const MAZE_MODULE_ASPECT = `${MAZE.cols + MAZE.sideMargin * 2} / ${MAZE.rows + MAZE.labelMargin * 2}`;

const COUPONS = [
  {
    code: "VIVA-5",
    description: "En cursos y sesiones magistrales",
  },
  {
    code: "CHILE-10",
    description: "En diplomados, postítulos, acreditaciones y especializaciones",
  },
];

/** Tiempo que se deja ver la mini-celebración en el laberinto antes de pasar a la pantalla de premios. */
const CELEBRATION_MS = 850;

type Phase = "playing" | "celebrating" | "won" | "timeout";

export function MazeGameExperience() {
  const [phase, setPhase] = useState<Phase>("playing");
  const [hasInteracted, setHasInteracted] = useState(false);
  /** Se incrementa en cada "Volver a intentar": fuerza a remontar el laberinto y el temporizador, reiniciándolos por completo. */
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const handleWin = useCallback(() => {
    setPhase((current) => (current === "playing" ? "celebrating" : current));
  }, []);

  const handleInteract = useCallback(() => {
    setHasInteracted(true);
  }, []);

  const handleTimeExpire = useCallback(() => {
    setPhase((current) => (current === "playing" ? "timeout" : current));
  }, []);

  const handleRetry = useCallback(() => {
    setPhase("playing");
    setHasInteracted(false);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (phase !== "celebrating") return;
    timeoutRef.current = setTimeout(() => setPhase("won"), CELEBRATION_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase]);

  const showMaze = phase !== "won";

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#091E42] px-4 py-4 sm:py-6">
      {/*
        Identidad chilena sutil, en segundo plano: se pinta ANTES que los
        resplandores morados (mismo nivel de apilamiento por ser ambos
        "position: absolute" con z-index automático, así que el orden en el
        DOM decide — este va primero y queda debajo de todo lo demás).
      */}
      <ChileanPatternBackground />

      {/* Fondo: resplandores morados sutiles, sin recargar la interfaz */}
      <div
        className="fp-float pointer-events-none absolute -left-24 -top-16 size-72 rounded-full bg-[#6B5BFF]/25 blur-3xl sm:size-96"
        style={{ "--fp-float-x": "22px", "--fp-float-y": "16px", "--fp-float-duration": "19s" } as CSSProperties}
      />
      <div
        className="fp-float pointer-events-none absolute -bottom-24 -right-16 size-72 rounded-full bg-[#5A3DE8]/25 blur-3xl sm:size-96"
        style={
          {
            "--fp-float-x": "-18px",
            "--fp-float-y": "-14px",
            "--fp-float-duration": "23s",
            "--fp-float-delay": "-6s",
          } as CSSProperties
        }
      />
      <div
        className="fp-float pointer-events-none absolute left-1/2 top-1/3 size-64 -translate-x-1/2 rounded-full bg-[#6C5CE7]/15 blur-3xl"
        style={
          {
            "--fp-float-x": "14px",
            "--fp-float-y": "-18px",
            "--fp-float-duration": "17s",
            "--fp-float-delay": "-11s",
          } as CSSProperties
        }
      />

      {showMaze ? (
        <div
          className={`relative flex w-full max-w-md flex-col items-center gap-3 transition-opacity duration-500 sm:gap-4 ${
            phase === "celebrating" || phase === "timeout" ? "opacity-90" : "opacity-100"
          }`}
        >
          <div className="relative text-center">
            <AdipaIsotype />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#B9AEFF] sm:text-xs">
              Fiestas Patrias ADIPA
            </p>
            <h1 className="mt-1 text-lg font-extrabold text-white sm:text-2xl">
              Ayuda a la empanada a llegar a la meta
            </h1>
            <p className="fp-text-breathe mt-1.5 text-sm font-bold text-[#FBDA9B] sm:text-base">
              Si lo logras, te regalamos un premio 🎁
            </p>

            {/*
              Una sola instancia del temporizador, reposicionada por CSS
              según el tamaño de pantalla (evita tener dos temporizadores
              corriendo a la vez): en mobile queda en el flujo normal,
              centrado bajo el título; en escritorio (lg+) se saca del
              flujo y se integra al encabezado, a la derecha de la columna
              central y alineado con el título — no pegado al borde de la
              pantalla.
            */}
            {phase !== "timeout" && (
              <div className="mt-2 lg:absolute lg:left-full lg:top-1 lg:mt-0 lg:ml-8">
                <CountdownTimer
                  key={attempt}
                  running={hasInteracted && phase === "playing"}
                  onExpire={handleTimeExpire}
                />
              </div>
            )}
          </div>

          <div
            className="mt-1 w-full max-w-[330px] overflow-hidden rounded-[26px] border border-white/10 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.65)] sm:max-w-[380px]"
            style={{ aspectRatio: MAZE_MODULE_ASPECT }}
          >
            <Maze key={attempt} active={phase === "playing"} onWin={handleWin} onInteract={handleInteract} />
          </div>

          <p className="text-xs text-white/55 sm:text-sm">
            Mueve el mouse o el dedo dentro del laberinto para guiarla
          </p>
        </div>
      ) : (
        <div className="fp-coupon-appear flex w-full max-w-md flex-col items-center gap-5">
          <div className="text-center">
            <AdipaIsotype />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#B9AEFF] sm:text-xs">
              Fiestas Patrias ADIPA
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-white sm:text-3xl">
              ¡Acabas de ganar 2 cupones!
            </h1>
          </div>

          <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:justify-center">
            {COUPONS.map((coupon, index) => (
              <CouponCard
                key={coupon.code}
                code={coupon.code}
                description={coupon.description}
                floatDelay={index * 1.4}
                appearDelayMs={250 + index * 180}
              />
            ))}
          </div>

          <a
            href="https://adipa.cl"
            className="fp-cta-pulse mt-1 inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-10 py-3.5 text-base font-bold text-[#091E42] shadow-[0_14px_34px_-10px_rgba(0,0,0,0.55)] transition-transform hover:scale-105"
          >
            Recoger premio
          </a>
        </div>
      )}

      {phase === "timeout" && (
        <div className="fp-coupon-appear fixed inset-0 z-40 flex items-center justify-center bg-[#091E42]/85 px-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#5A3DE8] px-5 py-2 font-mono text-2xl font-bold text-white shadow-[0_10px_24px_-8px_rgba(107,91,255,0.5)]">
              <ClockIcon />
              00:00
            </div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">¡Se acabó el tiempo!</h2>
            <p className="max-w-xs text-sm text-white/70 sm:text-base">
              La empanada no llegó a la meta a tiempo.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-10 py-3.5 text-base font-bold text-[#091E42] shadow-[0_14px_34px_-10px_rgba(0,0,0,0.55)] transition-transform hover:scale-105"
            >
              Volver a intentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
