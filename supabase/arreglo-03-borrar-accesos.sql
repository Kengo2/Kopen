-- =====================================================================
-- Arreglo 03: "Database error deleting user" al eliminar un acceso o un
-- evento. Las reglas de la tabla invitados no encontraban sus funciones
-- cuando Supabase borra usuarios desde su sección interna.
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez).
-- =====================================================================

create or replace function emitir_codigo() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if new.tipo = 'especial' then
    new.estado_pago := 'no_aplica';
    new.metodo_pago := null;
    new.monto := 0;
  elsif new.estado_pago = 'no_aplica' then
    new.estado_pago := 'pendiente';
  end if;

  if new.codigo is null and (new.tipo = 'especial' or new.estado_pago = 'confirmado') then
    new.codigo := translate(encode(gen_random_bytes(12), 'base64'), '+/=', '-_');
  end if;
  return new;
end $$;

create or replace function proteger_ingreso() returns trigger
language plpgsql set search_path = public, extensions as $$
begin
  if public.mi_rol() = 'organizador' and coalesce(current_setting('kopen.validando', true), '') <> 'si' then
    new.ingreso_en := old.ingreso_en;
    new.ingreso_por := old.ingreso_por;
    new.codigo := coalesce(old.codigo, new.codigo);
  end if;
  return new;
end $$;
