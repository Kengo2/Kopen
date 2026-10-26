import Link from "next/link";
import { CalendarCheck, CalendarPlus, House, PartyPopper, Plus, Wallet } from "lucide-react";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cobroEvento, dinero, fechaChip } from "@/lib/formato";
import type { Evento } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import Hoja from "@/app/componentes/Hoja";
import Enviar from "@/app/componentes/Enviar";
import CamposEvento from "@/app/componentes/CamposEvento";
import EtiquetaEstado, { eventoAbierto } from "@/app/componentes/EtiquetaEstado";
import { crearEvento } from "./actions";

export const metadata = { title: "Eventos" };

export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const perfil = await requireRol("admin");
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data }, { data: inv }] = await Promise.all([
    supabase.from("eventos").select("*").order("fecha", { ascending: false }),
    supabase.from("invitados").select("evento_id, codigo, ingreso_en").not("codigo", "is", null),
  ]);
  const eventos = (data ?? []) as Evento[];
  const porEvento = new Map<string, { entradas: number; dentro: number }>();
  for (const i of inv ?? []) {
    const c = porEvento.get(i.evento_id) ?? { entradas: 0, dentro: 0 };
    c.entradas++;
    if (i.ingreso_en) c.dentro++;
    porEvento.set(i.evento_id, c);
  }
  const activos = eventos.filter(eventoAbierto).length;
  const facturable = eventos.reduce((s, e) => s + cobroEvento(porEvento.get(e.id)?.entradas ?? 0), 0);

  const nuevo = (
    <Hoja titulo="Nuevo evento" claseBoton="boton" boton={<><CalendarPlus size={18} /> Nuevo evento</>}>
      <form action={crearEvento}>
        <CamposEvento />
        <div style={{ marginTop: 20 }}><Enviar>Crear evento</Enviar></div>
      </form>
    </Hoja>
  );

  return (
    <>
      <Barra nombre={perfil.nombre} rol="Administrador" inicio="/admin" />
      <main className="pagina pila">
        <Avisos ok={ok} error={error} />
        <h1 style={{ marginTop: 8 }}>Eventos</h1>

        {eventos.length > 0 && (
          <div className="mini" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="pastel celeste" style={{ display: "grid", gap: 10, justifyContent: "start" }}>
              <span className="insignia"><CalendarCheck size={20} /></span>
              <span className="tenue chico">Abiertas hoy</span>
              <span className="cifra">{activos}</span>
            </div>
            <div className="pastel naranja" style={{ display: "grid", gap: 10, justifyContent: "start" }}>
              <span className="insignia"><Wallet size={20} /></span>
              <span className="tenue chico">Por cobrar</span>
              <span className="cifra">{dinero(facturable)}</span>
            </div>
          </div>
        )}

        {eventos.length === 0 ? (
          <div className="vacio bloque">
            <PartyPopper size={44} />
            <strong>Crea tu primer evento</strong>
            <p style={{ marginBottom: 20 }}>Cada evento que gestionas tiene su propia lista, su organizador y su equipo de puerta.</p>
            {nuevo}
          </div>
        ) : (
          <ul className="talones">
            {eventos.map((e) => {
              const c = porEvento.get(e.id) ?? { entradas: 0, dentro: 0 };
              return (
                <li key={e.id}>
                  <Link href={`/admin/evento/${e.id}`} className="talon" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                    <span className="franja" style={{ width: 6, height: 40, background: `linear-gradient(${e.color_primario}, ${e.color_secundario})` }} aria-hidden />
                    <div className="talon-info">
                      <strong>{e.nombre}</strong>
                      <div className="linea2">
                        <span>{fechaChip(e.fecha)}</span>
                        <span>{c.entradas} entradas</span>
                        {c.dentro > 0 && <span>{c.dentro} entraron</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "grid", gap: 6, justifyItems: "end" }}>
                      <EtiquetaEstado evento={e} />
                      <span className="tenue chico">Cobro {dinero(cobroEvento(c.entradas))}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <nav className="nav-inferior" aria-label="Navegación" style={{ width: "auto", gap: 14 }}>
        <a href="/admin" className="nav-item activo" aria-label="Eventos" title="Eventos"><House size={24} /></a>
        <Hoja titulo="Nuevo evento" claseBoton="nav-item principal" etiqueta="Nuevo evento" boton={<Plus size={26} />}>
          <form action={crearEvento}>
            <CamposEvento />
            <div style={{ marginTop: 20 }}><Enviar>Crear evento</Enviar></div>
          </form>
        </Hoja>
      </nav>
    </>
  );
}
