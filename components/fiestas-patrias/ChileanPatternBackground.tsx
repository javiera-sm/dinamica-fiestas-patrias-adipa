/**
 * Fondo decorativo con un motivo chileno muy sutil: pequeñas estrellas en
 * línea fina, en tono azul-morado grisáceo desaturado y opacidad muy baja.
 * Puramente decorativo (aria-hidden, sin interacción), pensado para quedar
 * en segundo plano, detrás del contenido y de los resplandores morados
 * existentes — nunca compite con el título, la empanada, el laberinto ni
 * los cupones.
 *
 * (La bandera en línea y la cordillera que vivían aquí se quitaron: no se
 * veían bien a esta escala.)
 */
export function ChileanPatternBackground() {
  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <path
          id="fp-chile-star"
          d="M12 2 L15 8.5 L22 9.5 L17 14.5 L18 21 L12 17.5 L6 21 L7 14.5 L2 9.5 L9 8.5 Z"
        />
      </defs>
      <g fill="none" stroke="#9AA3D6" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round">
        {/* Estrellas pequeñas, sueltas y alejadas entre sí */}
        <use href="#fp-chile-star" transform="translate(110,170) scale(0.6)" opacity={0.09} />
        <use href="#fp-chile-star" transform="translate(55,640) scale(0.5)" opacity={0.07} />
        <use href="#fp-chile-star" transform="translate(900,610) scale(0.55)" opacity={0.08} />
        <use href="#fp-chile-star" transform="translate(940,120) scale(0.5)" opacity={0.07} />
      </g>
    </svg>
  );
}
