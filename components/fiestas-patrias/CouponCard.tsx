import type { CSSProperties } from "react";
import { CopyCodeButton } from "./CopyCodeButton";

type CouponCardProps = {
  code: string;
  description: string;
  /** Retraso de la flotación (en segundos), para que las tarjetas no floten en sincronía. */
  floatDelay: number;
  /** Retraso de la animación de aparición (en ms), para que entren en cascada. */
  appearDelayMs: number;
};

/**
 * Dos animaciones distintas (aparición única + flotación continua) no
 * pueden convivir en el mismo elemento vía className porque ambas fijan la
 * propiedad `animation` completa (la última en el cascade "gana" y pisa a
 * la otra). Por eso se separan en un wrapper (aparición) y un hijo
 * (flotación). El wrapper externo NO fija su propio alto: así el
 * `items-stretch` del contenedor padre (en MazeGameExperience) puede
 * estirarlo al alto del hermano más alto. El hijo interno recién ahí usa
 * h-full, porque para ese punto su padre ya tiene una altura definida —
 * poner h-full en ambos niveles genera una referencia circular (100% de un
 * alto que todavía depende de "auto") y las tarjetas terminan con alturas
 * distintas.
 *
 * `items-stretch` solo iguala el eje transversal: en fila (desktop) es el
 * alto, pero en columna (mobile, cuando se apilan) es el ancho — por eso
 * min-h-[280px] fija un piso de alto que alcanza para la descripción más
 * larga (CHILE-10) en cualquier disposición, y `flex-1` en la descripción
 * empuja el botón de copiar siempre al mismo lugar aunque el texto sea más
 * corto (VIVA-5).
 */
export function CouponCard({ code, description, floatDelay, appearDelayMs }: CouponCardProps) {
  return (
    <div
      className="fp-coupon-appear w-full sm:w-[250px]"
      style={{ "--fp-coupon-appear-delay": `${appearDelayMs}ms` } as CSSProperties}
    >
      <div
        className="fp-card-float flex h-full min-h-[280px] w-full flex-col items-center rounded-[26px] border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-6 text-center shadow-[0_16px_40px_-12px_rgba(9,30,66,0.55)] backdrop-blur-sm"
        style={{ "--fp-card-float-delay": `${floatDelay}s` } as CSSProperties}
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#B9AEFF]">
          Cupón ADIPA
        </span>

        <div className="mt-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#5A3DE8] px-5 py-2.5 shadow-[0_10px_24px_-8px_rgba(107,91,255,0.55)]">
          <span className="text-2xl font-extrabold tracking-wide text-white sm:text-[1.65rem]">
            {code}
          </span>
        </div>

        <div className="mt-4 w-full max-w-[170px] border-t border-dashed border-white/15" />

        <p className="mt-4 flex-1 text-sm leading-relaxed text-white/70">{description}</p>

        <CopyCodeButton code={code} />
      </div>
    </div>
  );
}
