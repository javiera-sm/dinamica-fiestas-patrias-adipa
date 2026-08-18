"use client";

import { useEffect, useRef, useState } from "react";

const CONFIRMATION_MS = 1800;

/** Copia `code` al portapapeles y muestra una confirmación temporal. Funciona en desktop y mobile. */
export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error("Clipboard API no disponible");
      }
    } catch {
      // Respaldo para navegadores/contextos sin permiso de Clipboard API.
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // Si tampoco funciona el respaldo, simplemente no mostramos confirmación.
      }
      document.body.removeChild(textarea);
    }

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), CONFIRMATION_MS);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar código ${code}`}
      className={`mt-5 inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border px-5 py-2 text-xs font-bold uppercase tracking-wider transition-colors duration-200 ${
        copied
          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
          : "border-white/20 bg-white/[0.06] text-white/85 hover:border-white/35 hover:bg-white/[0.12]"
      }`}
    >
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
            <path
              d="M4 10.5L8 14.5L16 5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          ¡Copiado!
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
            <rect x="6.5" y="6.5" width="9" height="10.5" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M6 4.5H12.5C13.6 4.5 14.5 5.4 14.5 6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
          Copiar código
        </>
      )}
    </button>
  );
}
