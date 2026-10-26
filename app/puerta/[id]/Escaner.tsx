"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import { ArrowLeft, Camera, Check, History, Keyboard, LogOut, ShieldAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hora } from "@/lib/formato";
import type { ResultadoValidacion } from "@/lib/tipos";
import { Modal } from "@/app/componentes/Hoja";
import { cerrarSesion } from "@/app/login/actions";

type Registro = ResultadoValidacion & { codigo: string; en: string };
type Estado = "apagado" | "iniciando" | "escaneando" | "verificando" | "resultado";

/** Segundos que se muestra una entrada válida antes de volver a escanear solo. */
const AUTO_SIGUIENTE = 3;
/** Milisegundos en que se ignora el mismo QR después de mostrar su resultado. */
const IGNORAR_MISMO = 8000;

function sonar(tipo: ResultadoValidacion["resultado"]) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tonos = tipo === "valido" ? [880, 1320] : tipo === "usado" ? [440, 440] : [220, 180];
    tonos.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = tipo === "valido" ? "sine" : "square";
      o.frequency.value = f;
      g.gain.value = 0.12;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.16;
      o.start(t);
      o.stop(t + 0.13);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* sin audio */ }
  navigator.vibrate?.(tipo === "valido" ? 90 : [220, 90, 220]);
}

/** Acepta el código solo o el enlace completo de la entrada. */
function extraerCodigo(texto: string) {
  const t = texto.trim();
  const m = t.match(/\/entrada\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : t;
}

const VEREDICTO = {
  valido: { titulo: "Puede entrar", Icono: Check },
  usado: { titulo: "Ya entró", Icono: ShieldAlert },
  invalido: { titulo: "No válida", Icono: X },
} as const;

export default function Escaner({
  eventoId,
  eventoNombre,
  volver,
  usuario,
}: {
  eventoId: string;
  eventoNombre: string;
  volver: string | null;
  usuario: string;
}) {
  const supabase = useRef(createClient()).current;
  const lector = useRef<Html5Qrcode | null>(null);
  const estadoRef = useRef<Estado>("apagado");
  const ultimo = useRef({ codigo: "", hasta: 0 });
  const bloqueo = useRef<WakeLockSentinel | null>(null);

  const [estado, setEstadoUI] = useState<Estado>("apagado");
  const [actual, setActual] = useState<Registro | null>(null);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [conteo, setConteo] = useState({ dentro: 0, total: 0 });
  const [error, setError] = useState("");
  const [manualAbierto, setManualAbierto] = useState(false);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [manual, setManual] = useState("");

  const setEstado = (e: Estado) => { estadoRef.current = e; setEstadoUI(e); };

  // ---------- Contador en tiempo real ----------
  const actualizarConteo = useCallback(async () => {
    const [{ count: total }, { count: dentro }] = await Promise.all([
      supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", eventoId).not("codigo", "is", null),
      supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", eventoId).not("ingreso_en", "is", null),
    ]);
    setConteo({ dentro: dentro ?? 0, total: total ?? 0 });
  }, [supabase, eventoId]);

  useEffect(() => {
    actualizarConteo();
    const canal = supabase
      .channel(`puerta-${eventoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invitados", filter: `evento_id=eq.${eventoId}` }, () => actualizarConteo())
      .subscribe();
    const intervalo = setInterval(actualizarConteo, 30000);
    return () => { supabase.removeChannel(canal); clearInterval(intervalo); };
  }, [supabase, eventoId, actualizarConteo]);

  // ---------- Pantalla siempre encendida mientras se escanea ----------
  const mantenerEncendida = useCallback(async () => {
    try { bloqueo.current = await navigator.wakeLock?.request("screen"); } catch { /* no disponible */ }
  }, []);
  useEffect(() => {
    const volverVisible = () => {
      if (document.visibilityState === "visible" && estadoRef.current !== "apagado") mantenerEncendida();
    };
    document.addEventListener("visibilitychange", volverVisible);
    return () => document.removeEventListener("visibilitychange", volverVisible);
  }, [mantenerEncendida]);

  // ---------- Validación ----------
  const validar = useCallback(async (texto: string, desdeCamara: boolean) => {
    const codigo = extraerCodigo(texto);
    if (!codigo) return;
    if (desdeCamara) {
      if (estadoRef.current !== "escaneando") return;
      // El mismo QR que sigue frente a la cámara no se vuelve a procesar.
      if (codigo === ultimo.current.codigo && Date.now() < ultimo.current.hasta) return;
    }
    setEstado("verificando");
    try { lector.current?.pause(true); } catch { /* ya pausado */ }
    setError("");

    try {
      const { data, error } = await supabase.rpc("validar_entrada", { p_codigo: codigo, p_evento: eventoId });
      if (error) throw error;
      const r: Registro = { ...(data as ResultadoValidacion), codigo, en: new Date().toISOString() };
      setActual(r);
      setHistorial((h) => [r, ...h].slice(0, 30));
      sonar(r.resultado);
      setEstado("resultado");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Sin conexión. Revisa el internet e intenta de nuevo.");
      siguiente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, eventoId]);

  function siguiente() {
    if (actual) ultimo.current = { codigo: actual.codigo, hasta: Date.now() + IGNORAR_MISMO };
    setActual(null);
    if (lector.current) {
      try { lector.current.resume(); } catch { /* ya activo */ }
      setEstado("escaneando");
    } else {
      setEstado("apagado");
    }
  }

  // Entrada válida: vuelve a escanear sola tras unos segundos.
  useEffect(() => {
    if (estado !== "resultado" || actual?.resultado !== "valido") return;
    const t = setTimeout(siguiente, AUTO_SIGUIENTE * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, actual]);

  // ---------- Cámara ----------
  async function encender() {
    setEstado("iniciando");
    setError("");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const l = new Html5Qrcode("lector", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      lector.current = l;
      await l.start(
        { facingMode: "environment" },
        { fps: 12, disableFlip: true },
        (texto) => { validar(texto, true); },
        () => {},
      );
      setEstado("escaneando");
      mantenerEncendida();
    } catch (e) {
      lector.current = null;
      setEstado("apagado");
      const s = String(e);
      setError(
        s.includes("Permission") || s.includes("NotAllowed")
          ? "El navegador no tiene permiso para usar la cámara. Toca el candado junto a la dirección web y permite la cámara."
          : "No se pudo abrir la cámara. Puedes escribir el código a mano.",
      );
    }
  }

  async function apagar() {
    try { await lector.current?.stop(); } catch { /* ya detenida */ }
    lector.current = null;
    bloqueo.current?.release().catch(() => {});
    setEstado("apagado");
  }

  useEffect(() => () => {
    lector.current?.stop().catch(() => {});
    bloqueo.current?.release().catch(() => {});
  }, []);

  const camaraVisible = estado !== "apagado";
  const porcentaje = conteo.total ? Math.round((conteo.dentro / conteo.total) * 100) : 0;
  const v = actual ? VEREDICTO[actual.resultado] : null;

  return (
    <div className="escaner">
      <header className="escaner-cab">
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {volver ? (
            <Link href={volver} className="icono-boton" aria-label="Volver al panel"><ArrowLeft size={22} /></Link>
          ) : (
            <form action={cerrarSesion}>
              <button className="icono-boton" aria-label="Cerrar sesión"><LogOut size={20} /></button>
            </form>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{eventoNombre}</div>
            <div className="tenue" style={{ fontSize: 13 }}>Puerta · {usuario}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ textAlign: "right" }}>
            <div><span className="cifra">{conteo.dentro}</span><span className="tenue"> / {conteo.total}</span></div>
            <div className="tenue" style={{ fontSize: 12 }}>adentro · {porcentaje}%</div>
          </div>
          <button className="icono-boton" onClick={() => setHistorialAbierto(true)} aria-label="Últimos escaneos">
            <History size={22} />
          </button>
        </div>
      </header>

      <div className="escaner-cuerpo">
        <div className="visor">
          <div id="lector" style={{ visibility: camaraVisible ? "visible" : "hidden" }} />
          {camaraVisible && (
            <div className="mira" aria-hidden>
              <div className="mira-marco"><i /><i /><i /><i /></div>
              <div className="mira-texto">
                {estado === "iniciando" ? "Abriendo cámara…" : estado === "verificando" ? "Verificando…" : "Apunta al código QR de la entrada"}
              </div>
            </div>
          )}
          {!camaraVisible && (
            <div className="visor-apagado">
              <div>
                <Camera size={44} style={{ margin: "0 auto 16px", color: "var(--pulsera)" }} />
                <h2 style={{ marginBottom: 8 }}>Listo para la puerta</h2>
                <p className="tenue" style={{ marginBottom: 20 }}>
                  Abre la cámara y apunta a cada entrada. Verás en grande si la persona puede entrar.
                </p>
                <button className="boton grande ancho" onClick={encender}>
                  <Camera size={22} /> Abrir cámara
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="escaner-pie">
          {error && <div className="nota alerta" role="alert"><ShieldAlert size={18} /><span>{error}</span></div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="boton suave" style={{ flex: 1 }} onClick={() => setManualAbierto(true)}>
              <Keyboard size={18} /> Escribir código
            </button>
            {camaraVisible && (
              <button className="boton contorno" onClick={apagar}>Apagar cámara</button>
            )}
          </div>
        </div>
      </div>

      {/* Resultado a pantalla completa */}
      {actual && v && (
        <div
          className={`veredicto ${actual.resultado}`}
          role="alertdialog"
          aria-live="assertive"
          aria-label={v.titulo}
          onClick={actual.resultado === "valido" ? siguiente : undefined}
        >
          {actual.resultado === "valido" && (
            <div className="tiempo" aria-hidden><i style={{ animationDuration: `${AUTO_SIGUIENTE}s` }} /></div>
          )}
          <div className="veredicto-centro">
            <div className="veredicto-icono"><v.Icono size={64} strokeWidth={3} /></div>
            <h1>{v.titulo}</h1>
            {actual.nombre && <div className="veredicto-nombre">{actual.nombre}</div>}
            <p className="veredicto-detalle">
              {actual.resultado === "valido" && (actual.tipo === "especial" ? "Invitado especial" : "Entrada de preventa")}
              {actual.resultado === "usado" && actual.ingreso_en &&
                `Esta entrada ya se usó a las ${hora(actual.ingreso_en)}${actual.ingreso_por ? `, la escaneó ${actual.ingreso_por}` : ""}. No la dejes pasar de nuevo.`}
              {actual.resultado === "invalido" &&
                (actual.nombre ? "El pago de esta entrada no está confirmado. Pide que hablen con el organizador." : "Este código no pertenece a esta fiesta. Puede ser una entrada falsa o de otro evento.")}
            </p>
          </div>
          <button className="boton grande ancho" onClick={(e) => { e.stopPropagation(); siguiente(); }}>
            Escanear siguiente
          </button>
        </div>
      )}

      <Modal abierto={manualAbierto} alCerrar={() => setManualAbierto(false)} titulo="Escribir código">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!manual.trim()) return;
            setManualAbierto(false);
            validar(manual, false);
            setManual("");
          }}
        >
          <label className="campo">
            <span>Código de la entrada</span>
            <input value={manual} onChange={(e) => setManual(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Ej. 8yzbHcP8bpOMpekm" />
            <small>Está en el enlace de la entrada, después de /entrada/.</small>
          </label>
          <button className="boton ancho" style={{ marginTop: 16 }}>Validar</button>
        </form>
      </Modal>

      <Modal abierto={historialAbierto} alCerrar={() => setHistorialAbierto(false)} titulo="Últimos escaneos">
        {historial.length === 0 ? (
          <p className="tenue">Aún no has escaneado entradas desde este celular.</p>
        ) : (
          <ul className="talones">
            {historial.map((r, i) => (
              <li key={i} className="talon" style={{ gridTemplateColumns: "1fr auto" }}>
                <div className="talon-info">
                  <strong>{r.nombre ?? "Código desconocido"}</strong>
                  <div className="linea2">{hora(r.en)}</div>
                </div>
                <span className={`chip ${r.resultado === "valido" ? "ok" : r.resultado === "usado" ? "usado" : "mal"}`}>
                  {r.resultado === "valido" ? "Entró" : r.resultado === "usado" ? "Ya había entrado" : "No válida"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
