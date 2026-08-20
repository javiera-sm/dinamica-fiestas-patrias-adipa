import type { CSSProperties } from "react";
import { CopyCodeButton } from "./CopyCodeButton";

type CouponCardProps = {
  code: string;
  /** Cada string es una línea de beneficio completa (se muestran tal cual, una por ítem). */
  benefits: string[];
  /** Retraso de la flotación (en segundos). */
  floatDelay: number;
  /** Retraso de la animación de aparición (en ms). */
  appearDelayMs: number;
};

/**
 * Tarjeta de cupón única (antes había dos, lado a lado). Mismo estilo de
 * siempre: aparición + flotación continua en dos elementos separados (ver
 * nota histórica más abajo), código destacado en una píldora con
 * degradado morado, y debajo la lista de beneficios asociados a ESE
 * código.
 *
 * Dos animaciones distintas (aparición única + flotación continua) no
 * pueden convivir en el mismo elemento vía className porque ambas fijan la
 * propiedad `animation` completa (la última en el cascade "gana" y pisa a
 * la otra). Por eso se separan en un wrapper (aparición) y un hijo
 * (flotación).
 */
export function CouponCard({ code, benefits, floatDelay, appearDelayMs }: CouponCardProps) {
  return (
    <div
      className="fp-coupon-appear w-full sm:w-[360px]"
      style={{ "--fp-coupon-appear-delay": `${appearDelayMs}ms` } as CSSProperties}
    >
      <div
        className="fp-card-float flex w-full flex-col items-center rounded-[26px] border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.03] p-6 text-center shadow-[0_16px_40px_-12px_rgba(9,30,66,0.55)] backdrop-blur-sm sm:p-8"
        style={{ "--fp-card-float-delay": `${floatDelay}s` } as CSSProperties}
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#B9AEFF]">
          Cupón ADIPA
        </span>

        <div className="mt-4 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#6C5CE7] to-[#5A3DE8] px-6 py-3 shadow-[0_10px_24px_-8px_rgba(107,91,255,0.55)]">
          <span className="text-xl font-extrabold tracking-wide text-white sm:text-2xl">{code}</span>
        </div>

        <div className="mt-5 w-full max-w-[220px] border-t border-dashed border-white/15" />

        <ul className="mt-5 flex w-full flex-col gap-3 text-left text-sm font-medium leading-relaxed text-white/85 sm:text-base">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2.5">
              <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#8FE3D9]" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <CopyCodeButton code={code} />
      </div>
    </div>
  );
}
