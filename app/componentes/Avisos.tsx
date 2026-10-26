"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";

/** Muestra el resultado de una acción (?ok= o ?error=) como aviso flotante y limpia la dirección. */
export default function Avisos({ ok, error }: { ok?: string; error?: string }) {
  const [visible, setVisible] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const router = useRouter();
  const ruta = usePathname();

  useEffect(() => {
    if (!ok && !error) return;
    setVisible(error ? { tipo: "error", texto: error } : { tipo: "ok", texto: ok! });
    router.replace(ruta, { scroll: false });
    const t = setTimeout(() => setVisible(null), error ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [ok, error, ruta, router]);

  if (!visible) return null;
  return (
    <div className="avisos" role="status" aria-live="polite">
      <div className={`aviso ${visible.tipo === "error" ? "error" : ""}`} onClick={() => setVisible(null)}>
        {visible.tipo === "error" ? <CircleAlert size={20} /> : <CircleCheck size={20} />}
        <span>{visible.texto}</span>
      </div>
    </div>
  );
}
