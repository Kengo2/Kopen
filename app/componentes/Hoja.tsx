"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/** Panel que se abre desde abajo (en computadora, al centro). */
export function Modal({ abierto, alCerrar, titulo, children }: { abierto: boolean; alCerrar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    document.addEventListener("keydown", tecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input, select, button[type=submit]")?.focus();
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = previo;
    };
  }, [abierto, alCerrar]);

  if (!abierto) return null;
  return (
    <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="hoja-asa" aria-hidden />
        <div className="hoja-cab">
          <h2>{titulo}</h2>
          <button type="button" className="icono-boton" onClick={alCerrar} aria-label="Cerrar">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Botón que abre una hoja con un formulario. Se cierra sola cuando la acción termina bien. */
export default function Hoja({
  titulo,
  boton,
  claseBoton = "boton",
  children,
}: {
  titulo: string;
  boton: ReactNode;
  claseBoton?: string;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const params = useSearchParams();
  const ok = params.get("ok");

  useEffect(() => {
    if (ok) setAbierto(false);
  }, [ok]);

  return (
    <>
      <button type="button" className={claseBoton} onClick={() => setAbierto(true)}>
        {boton}
      </button>
      <Modal abierto={abierto} alCerrar={() => setAbierto(false)} titulo={titulo}>
        {children}
      </Modal>
    </>
  );
}
