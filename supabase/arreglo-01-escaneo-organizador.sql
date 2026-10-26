-- =====================================================================
-- Arreglo 01: cuando el ORGANIZADOR escaneaba, el ingreso no quedaba
-- marcado y el mismo QR podía entrar varias veces.
-- Pegar completo en Supabase → SQL Editor → Run (una sola vez).
-- =====================================================================

-- La protección solo aplica a cambios hechos a mano, no al escáner.
create or replace function proteger_ingreso() returns trigger
language plpgsql as $$
begin
  if mi_rol() = 'organizador' and coalesce(current_setting('kopen.validando', true), '') <> 'si' then
    new.ingreso_en := old.ingreso_en;
    new.ingreso_por := old.ingreso_por;
    new.codigo := coalesce(old.codigo, new.codigo);
  end if;
  return new;
end $$;

create or replace function validar_entrada(p_codigo text, p_evento uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_rol rol_usuario := mi_rol();
  v_inv invitados%rowtype;
  v_resultado resultado_escaneo;
  v_por text;
begin
  if v_rol is null then
    raise exception 'No autorizado';
  end if;
  if v_rol <> 'admin' and p_evento is distinct from mi_evento() then
    raise exception 'No autorizado para este evento';
  end if;
  if not evento_abierto(p_evento) then
    raise exception 'El evento no está activo en estas fechas';
  end if;

  select * into v_inv from invitados
   where codigo = trim(p_codigo) and evento_id = p_evento
   for update;

  if not found or (v_inv.tipo = 'preventa' and v_inv.estado_pago <> 'confirmado') then
    v_resultado := 'invalido';
  elsif v_inv.ingreso_en is not null then
    v_resultado := 'usado';
    select nombre into v_por from perfiles where id = v_inv.ingreso_por;
  else
    v_resultado := 'valido';
    perform set_config('kopen.validando', 'si', true);
    update invitados set ingreso_en = now(), ingreso_por = auth.uid()
     where id = v_inv.id
     returning * into v_inv;
    perform set_config('kopen.validando', '', true);
  end if;

  insert into escaneos (evento_id, invitado_id, codigo_leido, resultado, escaneado_por)
  values (p_evento, v_inv.id, left(trim(p_codigo), 200), v_resultado, auth.uid());

  return json_build_object(
    'resultado',  v_resultado,
    'nombre',     v_inv.nombre,
    'tipo',       v_inv.tipo,
    'ingreso_en', v_inv.ingreso_en,
    'ingreso_por', v_por
  );
end $$;

revoke all on function validar_entrada(text, uuid) from public, anon;
grant execute on function validar_entrada(text, uuid) to authenticated;
