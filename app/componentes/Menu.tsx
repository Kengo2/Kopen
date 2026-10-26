"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { MoreVertical } from "lucide-react";

/** Botón ⋮ que despliega una lista de acciones. */
export default function Menu({ etiqueta = "Más opciones", children }: { etiqueta?: string; children: (cerrar: () => void) => ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const params = useSearchParams().toString();
  useEffect(() => { setAbierto(false); }, [params]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icono-boton" aria-label={etiqueta} aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <MoreVertical size={20} />
      </button>
      {abierto && <div className="menu-lista" role="menu">{children(() => setAbierto(false))}</div>}
    </div>
  );
}
