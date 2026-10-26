"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, ExternalLink, MessageCircle, MoreVertical, Search, Trash2, UserPlus, Wallet } from "lucide-react";
import { dinero, hora, iniciales } from "@/lib/formato";
import type { Invitado } from "@/lib/tipos";
import { Modal } from "@/app/componentes/Hoja";
import Enviar from "@/app/componentes/Enviar";
import { borrarInvitado, confirmarPago } from "./actions";

type Filtro = "todos" | "cobrar" | "enviar" | "dentro";

function telefonoWa(tel: string) {
  const d = tel.replace(/\D/g, "");
  // Números ecuatorianos que empiezan con 0 → código de país 593
  if (d.startsWith("0")) return "593" + d.slice(1);
  return d;
}

function Menu({ children }: { children: (cerrar: () => void) => React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
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
      <button className="icono-boton" aria-label="Más opciones" aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
        <MoreVertical size={20} />
      </button>
      {abierto && <div className="menu-lista" role="menu">{children(() => setAbierto(false))}</div>}
    </div>
  );
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
  const [cobrar, setCobrar] = useState<Invitado | null>(null);
  const [borrar, setBorrar] = useState<Invitado | null>(null);
  const [copiado, setCopiado] = useState("");
  const [origen, setOrigen] = useState(base);
  const ok = useSearchParams().get("ok");

  useEffect(() => { if (!base) setOrigen(window.location.origin); }, [base]);
  useEffect(() => { if (ok) { setCobrar(null); setBorrar(null); } }, [ok]);

  const grupos = useMemo(() => ({
    todos: invitados,
    cobrar: invitados.filter((i) => !i.codigo),
    enviar: invitados.filter((i) => i.codigo && !i.ingreso_en),
    dentro: invitados.filter((i) => i.ingreso_en),
  }), [invitados]);

  const lista = useMemo(() => {
    const t = texto.trim().toLowerCase();
    const base = grupos[filtro];
    if (!t) return base;
    return base.filter((i) => i.nombre.toLowerCase().includes(t) || (i.telefono ?? "").includes(t));
  }, [grupos, filtro, texto]);

  const enlace = (i: Invitado) => `${origen}/entrada/${i.codigo}`;
  const whatsapp = (i: Invitado) => {
    const msg = `Hola ${i.nombre.split(" ")[0]}, esta es tu entrada para ${eventoNombre} 🎟️\n${enlace(i)}\n\nMuestra el código QR en la puerta. Es personal y sirve para una sola entrada.`;
    return i.telefono
      ? `https://wa.me/${telefonoWa(i.telefono)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };
  async function copiar(i: Invitado) {
    try {
      await navigator.clipboard.writeText(enlace(i));
      setCopiado(i.id);
      setTimeout(() => setCopiado(""), 2000);
    } catch { /* sin permiso para copiar */ }
  }

  const filtros: [Filtro, string][] = [
    ["todos", "Todos"],
    ["cobrar", "Por cobrar"],
    ["enviar", "Por llegar"],
    ["dentro", "Adentro"],
  ];

  return (
    <section aria-labelledby="titulo-invitados">
      <div className="bloque-cab" style={{ marginBottom: 12 }}>
        <h2 id="titulo-invitados">Invitados</h2>
      </div>

      {invitados.length > 0 && (
        <>
          <label className="buscador campo">
            <span className="solo-lectores">Buscar invitado</span>
            <Search size={18} />
            <input type="search" placeholder="Buscar por nombre o teléfono" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </label>
          <div className="filtros" role="tablist" style={{ margin: "12px 0 14px" }}>
            {filtros.map(([f, etiqueta]) => (
              <button key={f} role="tab" aria-selected={filtro === f} className={`filtro ${filtro === f ? "activo" : ""}`} onClick={() => setFiltro(f)}>
                {etiqueta} <b>{grupos[f].length}</b>
              </button>
            ))}
          </div>
        </>
      )}

      {invitados.length === 0 ? (
        <div className="vacio bloque">
          <UserPlus size={40} />
          <strong>Tu lista está vacía</strong>
          <p>{abierto ? "Agrega a tu primer invitado con el botón + de abajo. Su entrada con QR se crea al instante." : "Esta fiesta no tiene invitados."}</p>
        </div>
      ) : lista.length === 0 ? (
        <p className="tenue" style={{ padding: "24px 0", textAlign: "center" }}>
          {texto ? `Nadie coincide con «${texto}».` : "No hay invitados en este grupo."}
        </p>
      ) : (
        <ul className="talones">
          {lista.map((i) => (
            <li key={i.id} className="talon">
              <span className="avatar" aria-hidden>{iniciales(i.nombre)}</span>
              <div className="talon-info">
                <strong>{i.nombre}</strong>
                <div className="linea2">
                  {i.ingreso_en ? (
                    <span className="chip ok">Entró {hora(i.ingreso_en)}</span>
                  ) : i.codigo ? (
                    <span className="chip lista">Entrada lista</span>
                  ) : (
                    <span className="chip usado">Por cobrar {dinero(Number(i.monto))}</span>
                  )}
                  <span>
                    {i.tipo === "especial" ? "Invitado especial" : i.metodo_pago && i.codigo ? `Preventa, ${i.metodo_pago}` : "Preventa"}
                  </span>
                  {copiado === i.id && <span style={{ color: "var(--pulsera)" }}>Enlace copiado</span>}
                </div>
              </div>
              <div className="talon-acciones">
                {abierto && !i.codigo && (
                  <button className="boton chico" onClick={() => setCobrar(i)}>
                    <Wallet size={16} /> Cobrar
                  </button>
                )}
                {i.codigo && !i.ingreso_en && (
                  <a className="boton chico suave" href={whatsapp(i)} target="_blank" rel="noreferrer" aria-label={`Enviar entrada a ${i.nombre} por WhatsApp`}>
                    <MessageCircle size={16} /> Enviar
                  </a>
                )}
                {(i.codigo || (abierto && !i.ingreso_en)) && (
                  <Menu>
                    {(cerrar) => (
                      <>
                        {i.codigo && (
                          <>
                            <a href={enlace(i)} target="_blank" rel="noreferrer" onClick={cerrar}><ExternalLink size={18} /> Ver entrada</a>
                            <button onClick={() => { copiar(i); cerrar(); }}><Copy size={18} /> Copiar enlace</button>
                          </>
                        )}
                        {abierto && !i.ingreso_en && (
                          <button className="rojo" onClick={() => { setBorrar(i); cerrar(); }}><Trash2 size={18} /> Eliminar invitado</button>
                        )}
                      </>
                    )}
                  </Menu>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal abierto={!!cobrar} alCerrar={() => setCobrar(null)} titulo="Confirmar pago">
        {cobrar && (
          <form action={confirmarPago.bind(null, eventoId, cobrar.id)}>
            <p style={{ marginBottom: 18 }}>
              <strong>{cobrar.nombre}</strong> <span className="tenue">pagó {dinero(Number(cobrar.monto))}. Al confirmar se crea su entrada con QR.</span>
            </p>
            <div className="campo">
              <span>¿Cómo pagó?</span>
              <div className="opciones">
                <label>
                  <input type="radio" name="metodo_pago" value="transferencia" defaultChecked={cobrar.metodo_pago !== "efectivo"} />
                  <span>Transferencia</span>
                </label>
                <label>
                  <input type="radio" name="metodo_pago" value="efectivo" defaultChecked={cobrar.metodo_pago === "efectivo"} />
                  <span>Efectivo</span>
                </label>
              </div>
            </div>
            <div style={{ marginTop: 20 }}><Enviar>Confirmar pago y crear entrada</Enviar></div>
          </form>
        )}
      </Modal>

      <Modal abierto={!!borrar} alCerrar={() => setBorrar(null)} titulo="Eliminar invitado">
        {borrar && (
          <form action={borrarInvitado.bind(null, eventoId, borrar.id)} style={{ display: "grid", gap: 8 }}>
            <p className="tenue" style={{ marginBottom: 12 }}>
              Vas a eliminar a <strong style={{ color: "var(--papel)" }}>{borrar.nombre}</strong>.
              {borrar.codigo ? " Su código QR dejará de funcionar en la puerta." : ""} Esto no se puede deshacer.
            </p>
            <Enviar clase="boton ancho peligro-lleno" pendiente="Eliminando…">Eliminar</Enviar>
            <button type="button" className="boton suave ancho" onClick={() => setBorrar(null)}>Cancelar</button>
          </form>
        )}
      </Modal>
    </section>
  );
}
