export default function Avisos({ ok, error }: { ok?: string; error?: string }) {
  return (
    <>
      {error && <div className="aviso error">{error}</div>}
      {ok && <div className="aviso ok">{ok}</div>}
    </>
  );
}
