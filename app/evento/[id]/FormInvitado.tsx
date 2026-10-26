"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { agregarInvitado } from "./actions";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <button className="btn ancho" disabled={pending}>
      {pending ? "Guardando…" : "Agregar invitado"}
    </button>
  );
}

export default function FormInvitado({ eventoId, precio }: { eventoId: string; precio: number }) {
  const [tipo, setTipo] = useState<"preventa" | "especial">("preventa");
  const [pagado, setPagado] = useState(false);

  return (
    <details>
      <summary>+ Agregar invitado</summary>
      <form action={agregarInvitado.bind(null, eventoId)}>
        <div className="fila">
          <div className="campo">
            <label htmlFor="i-nombre">Nombre</label>
            <input id="i-nombre" name="nombre" required placeholder="Nombre y apellido" />
          </div>
          <div className="campo">
            <label htmlFor="i-tel">WhatsApp (opcional)</label>
            <input id="i-tel" name="telefono" inputMode="tel" placeholder="Ej. 0991234567" />
          </div>
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="i-tipo">Tipo de entrada</label>
            <select id="i-tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as "preventa" | "especial")}>
              <option value="preventa">Preventa (pagada)</option>
              <option value="especial">Invitado especial (gratis)</option>
            </select>
          </div>
          {tipo === "preventa" && (
            <div className="campo">
              <label htmlFor="i-monto">Monto (USD)</label>
              <input id="i-monto" name="monto" type="number" min="0" step="0.01" defaultValue={precio} />
            </div>
          )}
        </div>
        {tipo === "preventa" && (
          <div className="fila">
            <div className="campo">
              <label htmlFor="i-pagado">¿Ya pagó?</label>
              <select id="i-pagado" name="pagado" value={pagado ? "si" : "no"} onChange={(e) => setPagado(e.target.value === "si")}>
                <option value="no">Todavía no (queda pendiente)</option>
                <option value="si">Sí, pago confirmado</option>
              </select>
            </div>
            <div className="campo">
              <label htmlFor="i-metodo">Método de pago</label>
              <select id="i-metodo" name="metodo_pago" defaultValue="transferencia">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
          </div>
        )}
        <p className="mut">
          {tipo === "especial" || pagado
            ? "La entrada con QR se genera al guardar."
            : "La entrada se genera cuando confirmes el pago."}
        </p>
        <Enviar />
      </form>
    </details>
  );
}
