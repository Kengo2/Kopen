"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Marca } from "@/app/componentes/Barra";
import { iniciarSesion } from "./actions";

export default function Login() {
  const [error, accion, pendiente] = useActionState(iniciarSesion, null);
  const [ver, setVer] = useState(false);

  return (
    <main className="acceso">
      <div className="acceso-caja">
        <Marca />
        <h1>Ingresa a tu evento</h1>
        <p className="tenue" style={{ marginBottom: 24 }}>Usa el usuario y la contraseña que te dio el administrador o el organizador.</p>
        <form action={accion} className="bloque">
          {error && <div className="nota alerta" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
          <label className="campo">
            <span>Correo o usuario</span>
            <input name="usuario" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          </label>
          <label className="campo" style={{ position: "relative" }}>
            <span>Contraseña</span>
            <input name="clave" type={ver ? "text" : "password"} autoComplete="current-password" required style={{ paddingRight: 52 }} />
            <button
              type="button"
              className="icono-boton"
              onClick={() => setVer((v) => !v)}
              aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{ position: "absolute", right: 4, bottom: 4 }}
            >
              {ver ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </label>
          <button className="boton ancho" style={{ marginTop: 20 }} disabled={pendiente}>
            {pendiente ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
