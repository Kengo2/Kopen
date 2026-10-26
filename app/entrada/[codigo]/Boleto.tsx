"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { EntradaPublica } from "@/lib/tipos";

/** Parte un texto en líneas que caben en `ancho` píxeles. */
function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number) {
  const palabras = texto.split(/\s+/);
  const out: string[] = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) {
      out.push(actual);
      actual = p;
    } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}

async function dibujarImagen(e: EntradaPublica, fechaTexto: string): Promise<Blob> {
  const W = 1080, H = 1620;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, e.color_primario);
  g.addColorStop(1, e.color_secundario);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  const fuente = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

  ctx.font = `600 34px ${fuente}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText("ESTÁS INVITADO A", W / 2, 130);
  ctx.globalAlpha = 1;

  ctx.font = `800 84px ${fuente}`;
  let y = 230;
  for (const l of lineas(ctx, e.evento, W - 140).slice(0, 2)) {
    ctx.fillText(l, W / 2, y);
    y += 92;
  }

  ctx.font = `500 36px ${fuente}`;
  ctx.globalAlpha = 0.95;
  ctx.fillText(fechaTexto, W / 2, y + 10);
  if (e.lugar) ctx.fillText(e.lugar, W / 2, y + 60);
  ctx.globalAlpha = 1;

  // Recuadro blanco con el QR
  const lado = 720, x = (W - lado) / 2, qy = y + 120;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x - 30, qy - 30, lado + 60, lado + 60, 40);
  ctx.fill();
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, e.codigo, { width: lado, margin: 1, errorCorrectionLevel: "M" });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, x, qy, lado, lado);

  ctx.fillStyle = "#fff";
  ctx.font = `800 64px ${fuente}`;
  const ny = qy + lado + 120;
  ctx.fillText(e.nombre, W / 2, ny, W - 120);
  ctx.font = `500 30px ${fuente}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(e.tipo === "especial" ? "Invitado especial" : "Entrada de preventa", W / 2, ny + 54);
  ctx.fillText("Personal · válida para una sola entrada", W / 2, ny + 100);
  ctx.globalAlpha = 1;

  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

export default function Boleto({ entrada: e, fechaTexto }: { entrada: EntradaPublica; fechaTexto: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const archivo = `entrada-${e.nombre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`;

  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, e.codigo, { width: 600, margin: 1, errorCorrectionLevel: "M" });
  }, [e.codigo]);

  async function descargar() {
    setOcupado(true);
    try {
      const blob = await dibujarImagen(e, fechaTexto);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = archivo; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally { setOcupado(false); }
  }

  async function compartir() {
    setOcupado(true);
    try {
      const blob = await dibujarImagen(e, fechaTexto);
      const file = new File([blob], archivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Entrada · ${e.evento}` });
      } else if (navigator.share) {
        await navigator.share({ url: location.href, title: `Entrada · ${e.evento}` });
      } else {
        await navigator.clipboard.writeText(location.href);
        alert("Enlace copiado");
      }
    } catch {
      /* el usuario canceló */
    } finally { setOcupado(false); }
  }

  return (
    <>
      <div className="boleto">
        {e.flyer_url && <img className="flyer" src={e.flyer_url} alt="" />}
        <div className="cab">
          <small>Estás invitado a</small>
          <h1>{e.evento}</h1>
          <div style={{ opacity: 0.95 }}>{fechaTexto}</div>
          {e.lugar && <div style={{ opacity: 0.95 }}>{e.lugar}</div>}
        </div>
        <div className="qr">
          <canvas ref={ref} aria-label="Código QR de tu entrada" />
        </div>
        <div className="pie">
          <b>{e.nombre}</b>
          <span style={{ opacity: 0.9 }}>{e.tipo === "especial" ? "Invitado especial" : "Entrada de preventa"}</span>
          {e.usada && <div className="tag" style={{ background: "#0006", marginTop: 10 }}>Esta entrada ya fue usada</div>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <button className="btn" onClick={compartir} disabled={ocupado}>Compartir</button>
        <button className="btn sec" onClick={descargar} disabled={ocupado}>Descargar imagen</button>
      </div>
      <p className="mut" style={{ textAlign: "center", marginTop: 12 }}>
        Muestra este QR en la puerta. Es personal: no lo compartas con otras personas.
      </p>
    </>
  );
}
