"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Share2 } from "lucide-react";
import type { EntradaPublica } from "@/lib/tipos";

/** Color de texto legible (blanco o tinta) sobre el promedio de dos colores. */
export function textoSobre(a: string, b: string) {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  return (lum(a) + lum(b)) / 2 > 0.4 ? "#17122b" : "#ffffff";
}

function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number) {
  const out: string[] = [];
  let actual = "";
  for (const p of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) { out.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) out.push(actual);
  return out;
}

async function dibujarImagen(e: EntradaPublica, fechaTexto: string): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080, H = 1720, M = 70;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const tx = textoSobre(e.color_primario, e.color_secundario);
  const display = '"Bricolage Grotesque Variable", system-ui, sans-serif';
  const texto = '"Figtree Variable", system-ui, sans-serif';

  ctx.fillStyle = "#17122b";
  ctx.fillRect(0, 0, W, H);

  // Parte superior con los colores de la fiesta
  const corte = 640;
  const g = ctx.createLinearGradient(0, 0, W, corte);
  g.addColorStop(0, e.color_primario);
  g.addColorStop(1, e.color_secundario);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(M, M, W - 2 * M, corte - M, [44, 44, 0, 0]);
  ctx.fill();

  ctx.fillStyle = tx;
  ctx.textAlign = "left";
  ctx.font = `600 34px ${texto}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText("Estás invitado a", M + 60, M + 100);
  ctx.globalAlpha = 1;
  ctx.font = `800 92px ${display}`;
  let y = M + 210;
  for (const l of lineas(ctx, e.evento, W - 2 * M - 120).slice(0, 3)) { ctx.fillText(l, M + 60, y); y += 98; }
  ctx.font = `600 36px ${texto}`;
  ctx.fillText(fechaTexto, M + 60, Math.min(y + 10, corte - 90));
  if (e.lugar) ctx.fillText(e.lugar, M + 60, Math.min(y + 60, corte - 40));

  // Parte inferior blanca con muescas y línea perforada
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(M, corte, W - 2 * M, H - corte - M, [0, 0, 44, 44]);
  ctx.fill();
  ctx.fillStyle = "#17122b";
  ctx.beginPath(); ctx.arc(M, corte, 26, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W - M, corte, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d8d4e8"; ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
  ctx.beginPath(); ctx.moveTo(M + 50, corte); ctx.lineTo(W - M - 50, corte); ctx.stroke();
  ctx.setLineDash([]);

  const lado = 640, qx = (W - lado) / 2, qy = corte + 70;
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, e.codigo, { width: lado, margin: 0, errorCorrectionLevel: "M", color: { dark: "#17122b", light: "#ffffff" } });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, qx, qy, lado, lado);

  ctx.textAlign = "center";
  ctx.fillStyle = "#17122b";
  ctx.font = `800 64px ${display}`;
  ctx.fillText(e.nombre, W / 2, qy + lado + 110, W - 2 * M - 80);
  ctx.font = `500 32px ${texto}`;
  ctx.fillStyle = "#5b5378";
  ctx.fillText(e.tipo === "especial" ? "Invitado especial" : "Entrada de preventa", W / 2, qy + lado + 165);
  ctx.fillText("Personal. Sirve para una sola entrada.", W / 2, qy + lado + 215);

  return new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
}

export default function Boleto({ entrada: e, fechaTexto }: { entrada: EntradaPublica; fechaTexto: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const archivo = `entrada-${e.nombre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.png`;
  const tx = textoSobre(e.color_primario, e.color_secundario);

  useEffect(() => {
    if (ref.current) QRCode.toCanvas(ref.current, e.codigo, { width: 600, margin: 0, errorCorrectionLevel: "M", color: { dark: "#17122b", light: "#ffffff" } });
  }, [e.codigo]);

  async function descargar() {
    setOcupado(true);
    try {
      const blob = await dibujarImagen(e, fechaTexto);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = archivo; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setAviso("Imagen guardada en tu celular");
    } finally { setOcupado(false); }
  }

  async function compartir() {
    setOcupado(true);
    try {
      const blob = await dibujarImagen(e, fechaTexto);
      const file = new File([blob], archivo, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Entrada para ${e.evento}` });
      } else if (navigator.share) {
        await navigator.share({ url: location.href, title: `Entrada para ${e.evento}` });
      } else {
        await navigator.clipboard.writeText(location.href);
        setAviso("Enlace copiado");
      }
    } catch { /* cancelado */ } finally { setOcupado(false); }
  }

  return (
    <div className="boleto" style={{ ["--evento-1" as string]: e.color_primario, ["--evento-2" as string]: e.color_secundario, ["--evento-tx" as string]: tx }}>
      {e.flyer_url && <img className="boleto-flyer" src={e.flyer_url} alt={`Flyer de ${e.evento}`} />}
      <div className="boleto-cuerpo">
        <div style={{ fontWeight: 600, opacity: 0.85 }}>Estás invitado a</div>
        <h1>{e.evento}</h1>
        <div className="datos-boleto">
          <span>{fechaTexto}</span>
          {e.lugar && <span>{e.lugar}</span>}
        </div>
      </div>
      <div className="boleto-qr">
        <canvas ref={ref} aria-label="Código QR de tu entrada" />
        <div className="boleto-nombre">{e.nombre}</div>
        <div style={{ color: "#5b5378", fontSize: 14, marginTop: 2 }}>
          {e.tipo === "especial" ? "Invitado especial" : "Entrada de preventa"}
        </div>
        {e.usada && <div className="chip usado" style={{ marginTop: 12 }}>Esta entrada ya se usó</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        <button className="boton" onClick={compartir} disabled={ocupado}><Share2 size={18} /> Compartir</button>
        <button className="boton suave" onClick={descargar} disabled={ocupado}><Download size={18} /> Guardar imagen</button>
      </div>
      <p className="tenue chico" style={{ textAlign: "center", marginTop: 14 }} role="status">
        {aviso || "Muestra este QR en la puerta. Es personal: si lo compartes, la otra persona podría usar tu entrada."}
      </p>
    </div>
  );
}
