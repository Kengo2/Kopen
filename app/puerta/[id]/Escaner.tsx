"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@/lib/supabase/client";
import { hora } from "@/lib/formato";
import type { ResultadoValidacion } from "@/lib/tipos";

type Registro = ResultadoValidacion & { codigo: string; en: string };

const TEXTOS = {
  valido: "VÁLIDA · PUEDE ENTRAR",
  usado: "YA FUE USADA",
  invalido: "ENTRADA INVÁLIDA",
} as const;

function sonido(ok: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220;
    o.type = ok ? "sine" : "square";
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.15 : 0.45));
    o.onended = () => ctx.close();
  } catch { /* sin audio */ }
  navigator.vibrate?.(ok ? 80 : [200, 80, 200]);
}

/** Acepta el código solo o el enlace completo de la entrada. */
function extraerCodigo(texto: string) {
  const t = texto.trim();
  const m = t.match(/\/entrada\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : t;
}

export default function Escaner({ eventoId }: { eventoId: string }) {
  const supabase = useRef(createClient()).current;
  const lectorRef = useRef<Html5Qrcode | null>(null);
  const ocupado = useRef(false);
  const ultimo = useRef<{ codigo: string; t: number }>({ codigo: "", t: 0 });

  const [actual, setActual] = useState<Registro | null>(null);
  const [historial, setHistorial] = useState<Registro[]>([]);
  const [conteo, setConteo] = useState({ dentro: 0, total: 0 });
  const [camara, setCamara] = useState<"apagada" | "iniciando" | "activa" | "error">("apagada");
  const [errorCam, setErrorCam] = useState("");
  const [manual, setManual] = useState("");
  const [errorRed, setErrorRed] = useState("");

  const actualizarConteo = useCallback(async () => {
    const [{ count: total }, { count: dentro }] = await Promise.all([
      supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", eventoId).not("codigo", "is", null),
      supabase.from("invitados").select("id", { count: "exact", head: true }).eq("evento_id", eventoId).not("ingreso_en", "is", null),
    ]);
    setConteo({ dentro: dentro ?? 0, total: total ?? 0 });
  }, [supabase, eventoId]);

  // Contador en tiempo real: cualquier escáner que marque un ingreso actualiza a todos.
  useEffect(() => {
    actualizarConteo();
    const canal = supabase
      .channel(`puerta-${eventoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invitados", filter: `evento_id=eq.${eventoId}` }, () => actualizarConteo())
      .subscribe();
    const intervalo = setInterval(actualizarConteo, 30000);
    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
    };
  }, [supabase, eventoId, actualizarConteo]);

  const validar = useCallback(async (texto: string) => {
    const codigo = extraerCodigo(texto);
    if (!codigo || ocupado.current) return;
    const ahora = Date.now();
    // Evita leer el mismo QR varias veces seguidas mientras sigue frente a la cámara.
    if (codigo === ultimo.current.codigo && ahora - ultimo.current.t < 4000) return;
    ultimo.current = { codigo, t: ahora };
    ocupado.current = true;
    setErrorRed("");

    try {
      const { data, error } = await supabase.rpc("validar_entrada", { p_codigo: codigo, p_evento: eventoId });
      if (error) throw error;
      const r = { ...(data as ResultadoValidacion), codigo, en: new Date().toISOString() };
      setActual(r);
      setHistorial((h) => [r, ...h].slice(0, 15));
      sonido(r.resultado === "valido");
    } catch (e) {
      setErrorRed(e instanceof Error ? e.message : "Sin conexión. Intenta de nuevo.");
      ultimo.current = { codigo: "", t: 0 };
    } finally {
      setTimeout(() => { ocupado.current = false; }, 1200);
    }
  }, [supabase, eventoId]);

  async function encender() {
    setCamara("iniciando");
    setErrorCam("");
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const lector = new Html5Qrcode("lector", { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
      lectorRef.current = lector;
      await lector.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
        (texto) => { validar(texto); },
        () => {},
      );
      setCamara("activa");
    } catch (e) {
      setCamara("error");
      setErrorCam(
        String(e).includes("Permission") || String(e).includes("NotAllowed")
          ? "No hay permiso para usar la cámara. Actívalo en la configuración del navegador."
          : "No se pudo abrir la cámara. Puedes escribir el código a mano.",
      );
    }
  }

  async function apagar() {
    try { await lectorRef.current?.stop(); } catch { /* ya estaba detenida */ }
    lectorRef.current = null;
    setCamara("apagada");
  }

  useEffect(() => () => { lectorRef.current?.stop().catch(() => {}); }, []);

  return (
    <>
      <div className="stats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="stat"><b>{conteo.dentro}</b><span>Adentro</span></div>
        <div className="stat"><b>{Math.max(conteo.total - conteo.dentro, 0)}</b><span>Por llegar</span></div>
      </div>

      <div id="lector" style={{ display: camara === "activa" || camara === "iniciando" ? "block" : "none" }} />
      {camara !== "activa" ? (
        <button className="btn ancho" onClick={encender} disabled={camara === "iniciando"} style={{ padding: 16, fontSize: 18 }}>
          {camara === "iniciando" ? "Abriendo cámara…" : "Abrir cámara y escanear"}
        </button>
      ) : (
        <button className="btn sec ancho" onClick={apagar} style={{ marginTop: 10 }}>Apagar cámara</button>
      )}
      {errorCam && <div className="aviso error" style={{ marginTop: 10 }}>{errorCam}</div>}
      {errorRed && <div className="aviso error" style={{ marginTop: 10 }}>{errorRed}</div>}

      {actual ? (
        <div className={`resultado ${actual.resultado}`} role="status" aria-live="assertive">
          {TEXTOS[actual.resultado]}
          {actual.nombre && <small>{actual.nombre}{actual.tipo === "especial" ? " · Invitado especial" : ""}</small>}
          {actual.resultado === "usado" && actual.ingreso_en && (
            <small>Entró a las {hora(actual.ingreso_en)}{actual.ingreso_por ? ` · escaneó ${actual.ingreso_por}` : ""}</small>
          )}
        </div>
      ) : (
        <div className="resultado espera">Apunta la cámara al QR de la entrada</div>
      )}

      <form
        className="card"
        style={{ marginTop: 12, display: "flex", gap: 8 }}
        onSubmit={(e) => { e.preventDefault(); ultimo.current = { codigo: "", t: 0 }; validar(manual); setManual(""); }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Escribir código a mano" autoCapitalize="none" aria-label="Código de la entrada" />
        <button className="btn" style={{ flexShrink: 0 }}>Validar</button>
      </form>

      {historial.length > 0 && (
        <div className="card">
          <h3>Últimos escaneos</h3>
          <ul className="lista">
            {historial.map((r, idx) => (
              <li key={idx} className="item">
                <div className="info">
                  <b>{r.nombre ?? "Código desconocido"}</b>
                  <small>{hora(r.en)}</small>
                </div>
                <span className={`tag ${r.resultado === "valido" ? "ok" : r.resultado === "usado" ? "warn" : "bad"}`}>
                  {r.resultado === "valido" ? "Válida" : r.resultado === "usado" ? "Ya usada" : "Inválida"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
