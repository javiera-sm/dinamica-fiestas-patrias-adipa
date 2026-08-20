"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdipaIsotype } from "./AdipaIsotype";
import { ChileanPatternBackground } from "./ChileanPatternBackground";
import { ClockIcon, CountdownTimer } from "./CountdownTimer";
import { CouponCard } from "./CouponCard";
import { Maze } from "./Maze";
import { Streamers } from "./Streamers";
import { DESKTOP_MAZE, MOBILE_MAZE, type MazeLayout } from "./mazePath";

/**
 * Relación de aspecto real del contenido dibujado dentro del SVG del
 * laberinto (ancho de la grilla / alto de la grilla + la franja para
 * INICIO/META arriba y abajo). El contenedor usa esta MISMA proporción para
 * que el <svg> (que preserva su aspecto internamente) llene el módulo por
 * completo, sin franjas vacías a los costados. Cada layout tiene la suya
 * (el de escritorio es notoriamente más ancho que alto).
 */
function moduleAspect(layout: MazeLayout) {
  const { config } = layout;
  return `${config.cols + config.sideMargin * 2} / ${config.rows + config.labelMargin * 2}`;
}

const MOBILE_MAZE_ASPECT = moduleAspect(MOBILE_MAZE);
const DESKTOP_MAZE_ASPECT = moduleAspect(DESKTOP_MAZE);

/** Un único cupón (antes había dos, VIVA-5 y CHILE-10). */
const COUPON = {
  code: "VIVACHILE-2026",
  benefits: [
    "$3.000 en cursos y sesiones magistrales",
    "$20.000 en diplomados, acreditaciones, especializaciones y postítulos.",
  ],
};

/** Tiempo que se deja ver la mini-celebración en el laberinto antes de pasar a la pantalla de premios. */
const CELEBRATION_MS = 850;

type Phase = "playing" | "celebrating" | "won" | "timeout";

export function MazeGameExperience() {
  const [phase, setPhase] = useState<Phase>("playing");
  /** Se incrementa en cada "Volver a intentar": fuerza a remontar el laberinto y el temporizador, reiniciándolos por completo. */
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  const handleWin = useCallback(() => {
    setPhase((current) => (current === "playing" ? "celebrating" : current));
  }, []);

  const handleTimeExpire = useCallback(() => {
    setPhase((current) => (current === "playing" ? "timeout" : current));
  }, []);

  const handleRetry = useCallback(() => {
    setPhase("playing");
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
          className={`relative flex w-full max-w-md flex-col items-center gap-3 transition-opacity duration-500 sm:gap-4 lg:max-w-5xl lg:gap-5 ${
            phase === "celebrating" || phase === "timeout" ? "opacity-90" : "opacity-100"
          }`}
        >
          {/*
            Escritorio (lg+): el texto va ARRIBA ocupando casi todo el
            ancho, y el laberinto va DEBAJO, centrado — nunca lado a lado
            (eso es justo lo que se pidió corregir de la versión anterior).
            Mobile/tablet quedan intactos (sin cambios).
          */}
          <div className="relative w-full text-center">
            <AdipaIsotype />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#B9AEFF] sm:text-xs lg:text-sm">
              Fiestas Patrias ADIPA
            </p>
            <h1 className="mt-1 text-lg font-extrabold text-white sm:text-2xl lg:mx-auto lg:mt-2 lg:max-w-3xl lg:text-[2rem] lg:leading-[1.15] xl:text-[2.75rem]">
              Ayuda a la empanada a llegar a la meta
            </h1>
            <p className="fp-text-breathe mt-1.5 text-sm font-bold text-[#FBDA9B] sm:text-base lg:mt-2 lg:text-lg">
              Si lo logras, te regalamos un premio 🎁
            </p>

            {/*
              Mobile/tablet: en el flujo normal, centrado bajo el título
              (sin cambios). Escritorio (lg+): arriba, hacia la esquina
              derecha del bloque de texto — al lado del contenido, no
              debajo. Arranca sola apenas se monta (running=true desde el
              primer render): no espera ninguna interacción del usuario.
            */}
            {phase !== "timeout" && (
              <div className="mt-2 flex justify-center lg:absolute lg:right-0 lg:top-1 lg:mt-0">
                <CountdownTimer
                  key={attempt}
                  running={phase === "playing"}
                  onExpire={handleTimeExpire}
                />
              </div>
            )}
          </div>

          <div className="flex w-full flex-col items-center gap-3 sm:gap-4">
            {/*
              Dos variantes del laberinto: MISMA lógica/colisión (ver
              mazePath.ts), pero con grillas distintas — la de escritorio
              es notoriamente más ancha y con un poco más de recorrido para
              justificar el espacio. Se renderizan ambas siempre (livianas)
              y CSS decide cuál se ve, igual que el resto de los ajustes
              responsive de este componente — así no hay que detectar el
              viewport en JS ni remontar nada al cambiar de tamaño.
            */}
            <div
              className="mt-1 w-full max-w-[330px] overflow-hidden rounded-[26px] border border-white/10 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.65)] sm:max-w-[380px] lg:hidden"
              style={{ aspectRatio: MOBILE_MAZE_ASPECT }}
            >
              <Maze key={attempt} layout={MOBILE_MAZE} instanceId="mobile" active={phase === "playing"} onWin={handleWin} />
            </div>
            <div
              className="hidden w-full max-w-[760px] overflow-hidden rounded-[26px] border border-white/10 shadow-[0_20px_50px_-14px_rgba(0,0,0,0.65)] lg:block xl:max-w-[860px]"
              style={{ aspectRatio: DESKTOP_MAZE_ASPECT }}
            >
              <Maze key={attempt} layout={DESKTOP_MAZE} instanceId="desktop" active={phase === "playing"} onWin={handleWin} />
            </div>

            <p className="text-xs text-white/55 sm:text-sm">
              Mueve el mouse o el dedo dentro del laberinto para guiarla
            </p>
          </div>
        </div>
      ) : (
        <div className="fp-coupon-appear flex w-full max-w-md flex-col items-center gap-5">
          {/*
            Serpentinas: solo aparecen en el momento en que sale esta
            pantalla (se monta junto con ella, ver la key/condición del
            padre) y se apagan solas con su propia animación — no vuelven a
            aparecer después.
          */}
          <Streamers />
          <div className="text-center">
            <AdipaIsotype />
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#B9AEFF] sm:text-xs">
              Fiestas Patrias ADIPA
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-white sm:text-3xl">
              ¡Acabas de ganar tu cupón!
            </h1>
          </div>

          <div className="flex w-full justify-center">
            <CouponCard code={COUPON.code} benefits={COUPON.benefits} floatDelay={0} appearDelayMs={250} />
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
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">¡Se acabó el tiempo! 😢</h2>
            <p className="max-w-xs text-sm text-white/70 sm:text-base">
              La empanada no llegó a la meta.
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
