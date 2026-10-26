"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Archive, BadgeCheck, RotateCcw, Trash2, Undo2 } from "lucide-react";
import Menu from "@/app/componentes/Menu";
import { Modal } from "@/app/componentes/Hoja";
import Enviar from "@/app/componentes/Enviar";
import { cambiarEstado, eliminarEvento, marcarCobrado } from "./actions";

type Accion = "finalizar" | "eliminar" | null;

/** Menú ⋮ de un evento: cobrado, finalizar / reactivar y eliminar. */
export default function AccionesEvento({
  id,
  nombre,
  archivado,
  cobrado,
  volverA,
}: {
  id: string;
  nombre: string;
  archivado: boolean;
  cobrado: boolean;
  volverA?: string;
}) {
  const [accion, setAccion] = useState<Accion>(null);
  const [confirmo, setConfirmo] = useState("");
  const ok = useSearchParams().get("ok");
  useEffect(() => { if (ok) setAccion(null); }, [ok]);
  useEffect(() => { setConfirmo(""); }, [accion]);

  return (
    <>
      <Menu etiqueta={`Acciones de ${nombre}`}>
        {(cerrar) => (
          <>
            <form action={marcarCobrado.bind(null, id, !cobrado, volverA)}>
              <button>
                {cobrado ? <><Undo2 size={18} /> Marcar como por cobrar</> : <><BadgeCheck size={18} /> Marcar como cobrado</>}
              </button>
            </form>
            {archivado ? (
              <form action={cambiarEstado.bind(null, id, "activo", volverA)}>
                <button><RotateCcw size={18} /> Reactivar evento</button>
              </form>
            ) : (
              <button onClick={() => { setAccion("finalizar"); cerrar(); }}><Archive size={18} /> Finalizar y archivar</button>
            )}
            <button className="rojo" onClick={() => { setAccion("eliminar"); cerrar(); }}><Trash2 size={18} /> Eliminar evento</button>
          </>
        )}
      </Menu>

      <Modal abierto={accion === "finalizar"} alCerrar={() => setAccion(null)} titulo="Finalizar evento">
        <form action={cambiarEstado.bind(null, id, "archivado", volverA)} style={{ display: "grid", gap: 8 }}>
          <p className="tenue" style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--papel)" }}>{nombre}</strong> quedará archivado en solo lectura: nadie podrá modificar la lista ni escanear, y las entradas dejarán de mostrarse. Puedes reactivarlo después.
          </p>
          <Enviar pendiente="Archivando…">Finalizar y archivar</Enviar>
          <button type="button" className="boton suave ancho" onClick={() => setAccion(null)}>Cancelar</button>
        </form>
      </Modal>

      <Modal abierto={accion === "eliminar"} alCerrar={() => setAccion(null)} titulo="Eliminar evento">
        <form action={eliminarEvento.bind(null, id)} style={{ display: "grid", gap: 8 }}>
          <p className="tenue" style={{ marginBottom: 6 }}>
            Se borrarán para siempre <strong style={{ color: "var(--papel)" }}>{nombre}</strong>, su lista de invitados, los escaneos y los accesos del organizador y la puerta. Esto no se puede deshacer.
          </p>
          <p className="tenue chico" style={{ marginBottom: 6 }}>Si solo terminó, mejor finalízalo para conservar el registro.</p>
          <label className="campo">
            <span>Escribe ELIMINAR para confirmar</span>
            <input value={confirmo} onChange={(e) => setConfirmo(e.target.value)} autoCapitalize="characters" autoComplete="off" />
          </label>
          <div style={{ marginTop: 8 }} />
          {confirmo.trim().toUpperCase() === "ELIMINAR" ? (
            <Enviar clase="boton ancho peligro-lleno" pendiente="Eliminando…">Eliminar evento</Enviar>
          ) : (
            <button type="button" className="boton ancho peligro-lleno" disabled>Eliminar evento</button>
          )}
          <button type="button" className="boton suave ancho" onClick={() => setAccion(null)}>Cancelar</button>
        </form>
      </Modal>
    </>
  );
}
