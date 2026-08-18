import Image from "next/image";

/**
 * Isotipo ADIPA: la "A" real del logotipo (recortada de logo-adipa.png,
 * public/adipa-a.png) sobre un cuadrado blanco de bordes redondeados.
 * Puramente decorativo/de marca (aria-hidden — el nombre completo ya lo
 * dice el texto "Fiestas Patrias ADIPA" que va justo debajo).
 */
export function AdipaIsotype() {
  return (
    <div
      className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)] sm:mb-4 sm:h-14 sm:w-14"
      aria-hidden="true"
    >
      <Image
        src="/adipa-a.png"
        alt=""
        width={160}
        height={169}
        className="h-6 w-auto sm:h-7"
        priority
      />
    </div>
  );
}
