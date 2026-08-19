import type { CSSProperties } from "react";

const STREAMER_COLORS = ["#6C5CE7", "#8FE3D9", "#FBDA9B", "#C9BFFF", "#5A3DE8", "#9AE6FF"];
const STREAMER_COUNT = 16;

/**
 * Serpentinas: solo una animación de entrada, una sola vez, para la
 * pantalla "¡Acabas de ganar 2 cupones!". Cada tira cae y gira con la
 * animación CSS `fp-streamer-fall` (globals.css), que termina en
 * opacidad 0 (`animation-fill-mode: forwards`) — así se "apagan solas"
 * sin necesitar temporizadores ni estado en JS. Como este componente se
 * monta recién cuando aparece la pantalla de premios, la animación se
 * dispara justo en ese momento y no se repite mientras esa pantalla siga
 * visible.
 */
export function Streamers() {
  const items = Array.from({ length: STREAMER_COUNT }, (_, index) => {
    const leftPercent = Math.round(((index + 0.5) / STREAMER_COUNT) * 100 * 100) / 100;
    const delay = Math.round((index % 8) * 0.07 * 100) / 100;
    const duration = 1.6 + (index % 5) * 0.18;
    const rotateStart = Math.round(Math.sin(index * 1.7) * 50 * 100) / 100;
    const color = STREAMER_COLORS[index % STREAMER_COLORS.length];
    return { key: index, leftPercent, delay, duration, rotateStart, color };
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
      {items.map(({ key, leftPercent, delay, duration, rotateStart, color }) => (
        <span
          key={key}
          className="fp-streamer"
          style={
            {
              left: `${leftPercent}%`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              "--fp-streamer-rot-start": `${rotateStart}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
