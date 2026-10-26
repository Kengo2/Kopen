"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** Botón de envío que se desactiva mientras se guarda. */
export default function Enviar({ children, pendiente = "Guardando…", clase = "boton ancho" }: { children: ReactNode; pendiente?: string; clase?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={clase} disabled={pending}>
      {pending ? pendiente : children}
    </button>
  );
}
