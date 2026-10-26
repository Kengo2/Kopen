import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPerfil, puedeVerEvento } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Evento } from "@/lib/tipos";
import Barra from "@/app/componentes/Barra";
import { eventoAbierto } from "@/app/componentes/EtiquetaEstado";
import Escaner from "./Escaner";

export default async function Puerta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (!puedeVerEvento(perfil, id)) redirect("/");

  const supabase = await createClient();
  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).single();
  if (!ev) notFound();
  const evento = ev as Evento;
  const abierto = eventoAbierto(evento);

  return (
    <main style={{ ["--pri" as string]: evento.color_primario, ["--pri2" as string]: evento.color_secundario }}>
      <Barra nombre={perfil.nombre} inicio={perfil.rol === "puerta" ? `/puerta/${id}` : `/evento/${id}`} />
      {perfil.rol !== "puerta" && <p><Link href={`/evento/${id}`} className="mut">← Volver a invitados</Link></p>}
      <h1 className="grad">{evento.nombre}</h1>
      {abierto ? (
        <Escaner eventoId={id} />
      ) : (
        <div className="aviso error">
          El escáner solo funciona en las fechas en que la plataforma está activa para este evento.
        </div>
      )}
    </main>
  );
}
