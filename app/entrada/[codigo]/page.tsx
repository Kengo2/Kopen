import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fechaLarga } from "@/lib/formato";
import type { EntradaPublica } from "@/lib/tipos";
import Boleto from "./Boleto";

async function cargar(codigo: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("ver_entrada", { p_codigo: codigo });
  return (data as EntradaPublica | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }): Promise<Metadata> {
  const { codigo } = await params;
  const e = await cargar(codigo);
  return {
    title: e ? `Tu entrada · ${e.evento}` : "Entrada no encontrada",
    robots: { index: false, follow: false },
  };
}

export default async function Entrada({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const e = await cargar(codigo);
  if (!e) notFound();

  return (
    <main
      className="entrada"
      style={{ ["--pri" as string]: e.color_primario, ["--pri2" as string]: e.color_secundario }}
    >
      <Boleto entrada={e} fechaTexto={fechaLarga(e.fecha)} />
    </main>
  );
}
