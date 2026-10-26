"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPerfil, puedeVerEvento } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { crearCuenta, eliminarCuenta } from "@/lib/cuentas";

const q = (s: string) => encodeURIComponent(s);

async function exigirAcceso(eventoId: string) {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol === "puerta" || !puedeVerEvento(perfil, eventoId)) redirect("/");
  return perfil;
}

function volver(eventoId: string, msg: { ok?: string; error?: string }): never {
  const p = msg.error ? `error=${q(msg.error)}` : `ok=${q(msg.ok ?? "")}`;
  redirect(`/evento/${eventoId}?${p}`);
}

export async function agregarInvitado(eventoId: string, formData: FormData) {
  await exigirAcceso(eventoId);
  const nombre = String(formData.get("nombre") || "").trim();
  const telefono = String(formData.get("telefono") || "").replace(/[^\d+]/g, "") || null;
  const tipo = formData.get("tipo") === "especial" ? "especial" : "preventa";
  const pagado = formData.get("pagado") === "si";
  const metodo = formData.get("metodo_pago") === "efectivo" ? "efectivo" : "transferencia";
  const monto = Number(formData.get("monto") || 0);

  if (!nombre) volver(eventoId, { error: "Escribe el nombre del invitado." });
  if (tipo === "preventa" && (Number.isNaN(monto) || monto < 0)) volver(eventoId, { error: "Monto no válido." });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("invitados").insert({
    evento_id: eventoId,
    nombre,
    telefono,
    tipo,
    estado_pago: tipo === "especial" ? "no_aplica" : pagado ? "confirmado" : "pendiente",
    metodo_pago: tipo === "preventa" ? metodo : null,
    monto: tipo === "preventa" ? monto : 0,
    creado_por: auth.user?.id,
  });
  if (error) volver(eventoId, { error: mensajeRls(error.message) });
  revalidatePath(`/evento/${eventoId}`);
  volver(eventoId, { ok: tipo === "especial" || pagado ? `Entrada creada para ${nombre}. Ya puedes enviarla.` : `${nombre} quedó por cobrar.` });
}

export async function confirmarPago(eventoId: string, invitadoId: string, formData: FormData) {
  await exigirAcceso(eventoId);
  const metodo = formData.get("metodo_pago") === "efectivo" ? "efectivo" : "transferencia";
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("invitados")
    .update({ estado_pago: "confirmado", metodo_pago: metodo }, { count: "exact" })
    .eq("id", invitadoId)
    .eq("evento_id", eventoId);
  if (error) volver(eventoId, { error: mensajeRls(error.message) });
  if (!count) volver(eventoId, { error: "No se pudo confirmar el pago. La plataforma está cerrada para esta fiesta." });
  revalidatePath(`/evento/${eventoId}`);
  volver(eventoId, { ok: "Pago confirmado. La entrada está lista para enviar." });
}

export async function borrarInvitado(eventoId: string, invitadoId: string) {
  await exigirAcceso(eventoId);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("invitados")
    .delete({ count: "exact" })
    .eq("id", invitadoId)
    .eq("evento_id", eventoId);
  if (error) volver(eventoId, { error: mensajeRls(error.message) });
  if (!count) volver(eventoId, { error: "No se pudo eliminar (quizá ya entró a la fiesta)." });
  revalidatePath(`/evento/${eventoId}`);
  volver(eventoId, { ok: "Invitado eliminado." });
}

export async function crearCuentaPuerta(eventoId: string, formData: FormData) {
  await exigirAcceso(eventoId);
  const error = await crearCuenta({
    nombre: String(formData.get("nombre") || ""),
    usuario: String(formData.get("usuario") || ""),
    clave: String(formData.get("clave") || ""),
    rol: "puerta",
    eventoId,
  });
  if (error) volver(eventoId, { error });
  revalidatePath(`/evento/${eventoId}`);
  volver(eventoId, { ok: "Acceso de puerta creado." });
}

export async function borrarCuentaPuerta(eventoId: string, userId: string) {
  await exigirAcceso(eventoId);
  // Confirmamos (con la sesión del usuario) que la cuenta es de puerta y de este evento.
  const supabase = await createClient();
  const { data } = await supabase.from("perfiles").select("rol, evento_id").eq("id", userId).single();
  if (!data || data.rol !== "puerta" || data.evento_id !== eventoId) volver(eventoId, { error: "No puedes eliminar esa cuenta." });
  const error = await eliminarCuenta(userId);
  if (error) volver(eventoId, { error });
  revalidatePath(`/evento/${eventoId}`);
  volver(eventoId, { ok: "Acceso de puerta eliminado." });
}

function mensajeRls(msg: string) {
  if (msg.includes("row-level security")) return "La plataforma está cerrada para esta fiesta en estas fechas.";
  return msg;
}
