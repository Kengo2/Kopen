"use client";

import { useEffect, useMemo, useState } from "react";
import { hora } from "@/lib/formato";
import type { Invitado } from "@/lib/tipos";
import { borrarInvitado, confirmarPago } from "./actions";

type Filtro = "todos" | "pendientes" | "listos" | "entraron";

function telefonoWa(tel: string) {
  const d = tel.replace(/\D/g, "");
  // Números ecuatorianos que empiezan con 0 → código de país 593
  if (d.startsWith("0")) return "593" + d.slice(1);
  return d;
}

export default function ListaInvitados({
  eventoId,
  invitados,
  abierto,
  eventoNombre,
  base,
}: {
  eventoId: string;
  invitados: Invitado[];
  abierto: boolean;
  eventoNombre: string;
  base: string;
}) {
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [origen, setOrigen] = useState(base);
  useEffect(() => {
    if (!base) setOrigen(window.location.origin);
  }, [base]);

  const lista = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return invitados.filter((i) => {
      if (t && !i.nombre.toLowerCase().includes(t) && !(i.telefono ?? "").includes(t)) return false;
      if (filtro === "pendientes") return i.tipo === "preventa" && i.estado_pago === "pendiente";
      if (filtro === "listos") return !!i.codigo && !i.ingreso_en;
      if (filtro === "entraron") return !!i.ingreso_en;
      return true;
    });
  }, [invitados, texto, filtro]);

  const filtros: [Filtro, string][] = [
    ["todos", "Todos"],
    ["pendientes", "Por pagar"],
    ["listos", "Con entrada"],
    ["entraron", "Entraron"],
  ];

  return (
    <>
      <h2>Invitados</h2>
      <div className="campo">
        <input placeholder="Buscar por nombre o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <div className="tabs">
        {filtros.map(([f, etiqueta]) => (
          <a key={f} href="#" className={filtro === f ? "on" : ""} onClick={(e) => { e.preventDefault(); setFiltro(f); }}>
            {etiqueta}
          </a>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="mut">No hay invitados en esta lista.</p>
      ) : (
        <ul className="lista">
          {lista.map((i) => {
            const url = i.codigo ? `${origen}/entrada/${i.codigo}` : "";
            const msg = `Hola ${i.nombre}, esta es tu entrada para ${eventoNombre}: ${url}\nPresenta el código QR en la puerta. Es personal y vale para una sola entrada.`;
            const wa = i.telefono
              ? `https://wa.me/${telefonoWa(i.telefono)}?text=${encodeURIComponent(msg)}`
              : `https://wa.me/?text=${encodeURIComponent(msg)}`;

            return (
              <li key={i.id} className="item">
                <div className="info">
                  <b>{i.nombre}</b>
                  <small>
                    {i.tipo === "especial" ? "Especial" : `Preventa · $${Number(i.monto).toFixed(2)}${i.metodo_pago ? ` · ${i.metodo_pago}` : ""}`}
                    {i.telefono ? ` · ${i.telefono}` : ""}
                  </small>
                  <div style={{ marginTop: 4 }}>
                    {i.ingreso_en ? (
                      <span className="tag ok">Entró {hora(i.ingreso_en)}</span>
                    ) : i.codigo ? (
                      <span className="tag neu">Entrada lista</span>
                    ) : (
                      <span className="tag warn">Pago pendiente</span>
                    )}
                  </div>
                </div>
                <div className="acciones">
                  {i.codigo && (
                    <>
                      <a className="btn sec sm" href={url} target="_blank" rel="noreferrer">Ver</a>
                      <a className="btn sm" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>
                    </>
                  )}
                  {abierto && !i.codigo && (
                    <form action={confirmarPago.bind(null, eventoId, i.id)} style={{ display: "flex", gap: 6 }}>
                      <select name="metodo_pago" defaultValue={i.metodo_pago ?? "transferencia"} style={{ padding: "6px 8px", width: "auto" }} aria-label="Método de pago">
                        <option value="transferencia">Transf.</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                      <button className="btn sm">Confirmar pago</button>
                    </form>
                  )}
                  {abierto && !i.ingreso_en && (
                    <form
                      action={borrarInvitado.bind(null, eventoId, i.id)}
                      onSubmit={(e) => { if (!confirm(`¿Eliminar a ${i.nombre}? Su QR dejará de funcionar.`)) e.preventDefault(); }}
                    >
                      <button className="btn peligro sm" aria-label={`Eliminar a ${i.nombre}`}>✕</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
