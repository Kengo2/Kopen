import Link from "next/link";
import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fechaCorta } from "@/lib/formato";
import type { Evento } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import Avisos from "@/app/componentes/Avisos";
import CamposEvento from "@/app/componentes/CamposEvento";
import EtiquetaEstado from "@/app/componentes/EtiquetaEstado";
import { crearEvento } from "./actions";

export default async function Admin({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const perfil = await requireRol("admin");
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("eventos").select("*").order("fecha", { ascending: false });
  const eventos = (data ?? []) as Evento[];

  return (
    <main>
      <Barra nombre={perfil.nombre} />
      <h1>Eventos</h1>
      <p className="mut">Crea un evento por cada fiesta que alquilas y luego la cuenta de su organizador.</p>
      <Avisos ok={ok} error={error} />

      <div className="card">
        <details open={eventos.length === 0}>
          <summary>+ Nuevo evento</summary>
          <form action={crearEvento}>
            <CamposEvento />
            <button className="btn ancho">Crear evento</button>
          </form>
        </details>
      </div>

      <div className="card">
        {eventos.length === 0 ? (
          <p className="mut">Todavía no hay eventos.</p>
        ) : (
          <ul className="lista">
            {eventos.map((e) => (
              <li key={e.id} className="item">
                <div className="info">
                  <b>{e.nombre}</b>
                  <small>{fechaCorta(e.fecha)} · {e.lugar || "Sin lugar"}</small>
                </div>
                <div className="acciones">
                  <EtiquetaEstado evento={e} />
                  <Link href={`/admin/evento/${e.id}`} className="btn sec sm">Abrir</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
