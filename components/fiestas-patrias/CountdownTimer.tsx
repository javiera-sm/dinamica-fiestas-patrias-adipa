"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_SECONDS = 60;
/** Cuánto se deja ver la animación de "se acabó el tiempo" antes de avisar al padre. */
const EXPIRE_ANIMATION_MS = 550;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

type CountdownTimerProps = {
  /**
   * Solo descuenta mientras esto es true. Arranca en `false` (se queda
   * quieto en 01:00) hasta que el padre confirma la primera interacción
   * del usuario con el laberinto — así no se le resta tiempo a nadie por
   * el solo hecho de cargar la página. También se pone en false al ganar,
   * para congelar el conteo.
   */
  running: boolean;
  /** Se llama una sola vez, justo después de la animación de "tiempo agotado". */
  onExpire: () => void;
};

/**
 * Cuenta regresiva de 1 minuto. No se reinicia sola: al llegar a 0 juega
 * una pequeña animación y avisa al padre vía onExpire, que decide qué
 * hacer (mostrar la pantalla de "Volver a intentar"). El padre es quien la
 * reinicia — remontándola con una key distinta — cuando el usuario vuelve
 * a intentarlo.
 */
export function CountdownTimer({ running, onExpire }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [expired, setExpired] = useState(false);
  // Guarda si ya se programó el aviso de expiración, SIN ser una dependencia
  // reactiva: si en vez de esto se usara el estado `expired` en el arreglo
  // de dependencias del efecto de abajo, el propio setExpired(true) haría
  // que el efecto se re-ejecute, y React cancelaría (cleanup) el setTimeout
  // recién programado antes de que llegara a disparar onExpire.
  const expiredRef = useRef(false);

  useEffect(() => {
    if (!running || expired || secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [running, expired, secondsLeft]);

  useEffect(() => {
    if (!running || expiredRef.current || secondsLeft > 0) return;
    expiredRef.current = true;
    setExpired(true);
    const id = setTimeout(onExpire, EXPIRE_ANIMATION_MS);
    return () => clearTimeout(id);
  }, [running, secondsLeft, onExpire]);

  return (
    <div className={`flex flex-col items-center gap-1.5 lg:items-start ${expired ? "fp-timer-expire" : ""}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8FE3D9] sm:text-sm">
        ¡Inicia el juego!
      </p>
      <div className="inline-flex min-w-[104px] items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#5A3DE8] px-4 py-1.5 font-mono text-xl font-bold tabular-nums text-white shadow-[0_10px_24px_-8px_rgba(107,91,255,0.5)] sm:text-2xl">
        <ClockIcon />
        {formatTime(secondsLeft)}
      </div>
    </div>
  );
}

export function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
