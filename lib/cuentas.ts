import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { correoDesdeUsuario } from "@/lib/auth";
import type { Rol } from "@/lib/tipos";

/** Crea una cuenta (usuario de Supabase + perfil) para un evento. Devuelve un mensaje de error o null. */
export async function crearCuenta(opts: {
  nombre: string;
  usuario: string;
  clave: string;
  rol: Exclude<Rol, "admin">;
  eventoId: string;
}): Promise<string | null> {
  const nombre = opts.nombre.trim();
  const usuario = opts.usuario.trim().toLowerCase();
  if (!nombre || !usuario) return "Completa el nombre y el usuario.";
  if (!/^[a-z0-9._@+-]+$/.test(usuario)) return "El usuario solo puede tener letras, números, puntos y guiones.";
  if (opts.clave.length < 6) return "La contraseña debe tener al menos 6 caracteres.";

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: correoDesdeUsuario(usuario),
    password: opts.clave,
    email_confirm: true,
  });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("already")) return "Ese usuario ya existe. Usa otro.";
    return `No se pudo crear la cuenta: ${error?.message ?? "error desconocido"}`;
  }

  const { error: e2 } = await admin.from("perfiles").insert({
    id: data.user.id,
    nombre,
    usuario,
    rol: opts.rol,
    evento_id: opts.eventoId,
  });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    return `No se pudo guardar el perfil: ${e2.message}`;
  }
  return null;
}

export async function eliminarCuenta(userId: string) {
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  return error ? error.message : null;
}
