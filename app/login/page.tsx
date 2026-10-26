"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function Login() {
  const [error, accion, pendiente] = useActionState(iniciarSesion, null);

  return (
    <main className="centro">
      <form action={accion} className="card login">
        <h1 className="grad">Entradas QR</h1>
        <p className="mut">Ingresa con tu cuenta de administrador, organizador o puerta.</p>
        {error && <div className="aviso error">{error}</div>}
        <div className="campo">
          <label htmlFor="usuario">Correo o usuario</label>
          <input id="usuario" name="usuario" autoComplete="username" autoCapitalize="none" required />
        </div>
        <div className="campo">
          <label htmlFor="clave">Contraseña</label>
          <input id="clave" name="clave" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn ancho" disabled={pendiente}>
          {pendiente ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
