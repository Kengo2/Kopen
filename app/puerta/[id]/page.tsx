import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarX } from "lucide-react";
import { getPerfil, puedeVerEvento } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Evento } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import { estadoEvento, eventoAbierto } from "@/app/componentes/EtiquetaEstado";
import Escaner from "./Escaner";

export const metadata = { title: "Puerta" };

export default async function Puerta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (!puedeVerEvento(perfil, id)) redirect("/");

  const supabase = await createClient();
  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).single();
  if (!ev) notFound();
  const evento = ev as Evento;
  const volver = perfil.rol === "puerta" ? null : `/evento/${id}`;

  if (!eventoAbierto(evento)) {
    const e = estadoEvento(evento);
    return (
      <>
        <Barra nombre={perfil.nombre} rol="Puerta" inicio={volver ?? `/puerta/${id}`} />
        <main className="pagina">
          <div className="vacio" style={{ paddingTop: 64 }}>
            <CalendarX size={48} />
            <strong>El escáner está cerrado</strong>
            <p>
              {evento.nombre}: {e.texto.toLowerCase()}. La puerta solo funciona en las fechas en que la plataforma está abierta para esta fiesta.
            </p>
            {volver && <Link href={volver} className="boton suave" style={{ marginTop: 20 }}>Volver al panel</Link>}
          </div>
        </main>
      </>
    );
  }

  return <Escaner eventoId={id} eventoNombre={evento.nombre} volver={volver} usuario={perfil.nombre} />;
}
