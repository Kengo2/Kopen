"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { correoDesdeUsuario } from "@/lib/auth";

export async function iniciarSesion(_prev: string | null, formData: FormData) {
  const usuario = String(formData.get("usuario") || "");
  const clave = String(formData.get("clave") || "");
  if (!usuario || !clave) return "Escribe tu usuario y contraseña.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: correoDesdeUsuario(usuario),
    password: clave,
  });
  if (error) return "Usuario o contraseña incorrectos.";
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
