"use client";

import { useState } from "react";
import { Gift, Ticket } from "lucide-react";
import Enviar from "@/app/componentes/Enviar";
import { agregarInvitado } from "./actions";

export default function FormInvitado({ eventoId, precio }: { eventoId: string; precio: number }) {
  const [tipo, setTipo] = useState<"preventa" | "especial">("preventa");
  const [pagado, setPagado] = useState(true);
  const emiteAhora = tipo === "especial" || pagado;

  return (
    <form action={agregarInvitado.bind(null, eventoId)}>
      <div className="opciones" role="radiogroup" aria-label="Tipo de entrada">
        <label>
          <input type="radio" name="tipo" value="preventa" checked={tipo === "preventa"} onChange={() => setTipo("preventa")} />
          <span><Ticket size={16} /> Preventa</span>
        </label>
        <label>
          <input type="radio" name="tipo" value="especial" checked={tipo === "especial"} onChange={() => setTipo("especial")} />
          <span><Gift size={16} /> Invitado especial</span>
        </label>
      </div>

      <label className="campo" style={{ marginTop: 18 }}>
        <span>Nombre y apellido</span>
        <input name="nombre" required autoComplete="off" placeholder="Ej. María Pérez" />
      </label>
      <label className="campo">
        <span>WhatsApp</span>
        <input name="telefono" inputMode="tel" autoComplete="off" placeholder="Ej. 0991234567" />
        <small>Opcional. Sirve para mandarle la entrada con un toque.</small>
      </label>

      {tipo === "preventa" && (
        <>
          <div className="fila" style={{ marginTop: 14 }}>
            <label className="campo">
              <span>Monto (USD)</span>
              <input name="monto" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={precio} />
            </label>
            <div className="campo">
              <span>¿Ya pagó?</span>
              <div className="opciones">
                <label>
                  <input type="radio" name="pagado" value="si" checked={pagado} onChange={() => setPagado(true)} />
                  <span>Sí</span>
                </label>
                <label>
                  <input type="radio" name="pagado" value="no" checked={!pagado} onChange={() => setPagado(false)} />
                  <span>No</span>
                </label>
              </div>
            </div>
          </div>
          {pagado && (
            <div className="campo" style={{ marginTop: 14 }}>
              <span>¿Cómo pagó?</span>
              <div className="opciones">
                <label>
                  <input type="radio" name="metodo_pago" value="transferencia" defaultChecked />
                  <span>Transferencia</span>
                </label>
                <label>
                  <input type="radio" name="metodo_pago" value="efectivo" />
                  <span>Efectivo</span>
                </label>
              </div>
            </div>
          )}
        </>
      )}

      <p className="tenue chico" style={{ margin: "16px 0" }}>
        {emiteAhora
          ? "Al guardar se crea su entrada con QR, lista para enviar."
          : "Quedará en «Por cobrar». Su entrada se crea cuando confirmes el pago."}
      </p>
      <Enviar>{emiteAhora ? "Crear entrada" : "Guardar como pendiente"}</Enviar>
    </form>
  );
}
