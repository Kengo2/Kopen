"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Modal } from "./Hoja";

function BotonConfirmar({ texto, peligro }: { texto: string; peligro: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={`boton ancho ${peligro ? "peligro-lleno" : ""}`} disabled={pending}>
      {pending ? "Un momento…" : texto}
    </button>
  );
}

/** Botón que pide confirmación antes de ejecutar una acción del servidor. */
export default function Confirmar({
  accion,
  titulo,
  mensaje,
  confirmar,
  children,
  claseBoton = "boton contorno",
  peligro = true,
  etiqueta,
}: {
  accion: () => void | Promise<void>;
  titulo: string;
  mensaje: ReactNode;
  confirmar: string;
  children: ReactNode;
  claseBoton?: string;
  peligro?: boolean;
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ok = useSearchParams().get("ok");
  useEffect(() => { if (ok) setAbierto(false); }, [ok]);
  return (
    <>
      <button type="button" className={claseBoton} onClick={() => setAbierto(true)} aria-label={etiqueta}>
        {children}
      </button>
      <Modal abierto={abierto} alCerrar={() => setAbierto(false)} titulo={titulo}>
        <p className="tenue" style={{ marginBottom: 20 }}>{mensaje}</p>
        <form action={accion} style={{ display: "grid", gap: 8 }}>
          <BotonConfirmar texto={confirmar} peligro={peligro} />
          <button type="button" className="boton suave ancho" onClick={() => setAbierto(false)}>Cancelar</button>
        </form>
      </Modal>
    </>
  );
}
