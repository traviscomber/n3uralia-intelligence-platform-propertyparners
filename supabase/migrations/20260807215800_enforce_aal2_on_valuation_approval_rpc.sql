do $$
declare
  ddl text;
  needle text := 'if target_status in (''approved'',''issued'') and actor_profile.role <> ''ceo'' then raise exception ''Solo CEO puede aprobar o emitir''; end if;';
  replacement text := needle || E'\n  if target_status in (''approved'',''issued'') and coalesce(auth.jwt()->>''aal'',''aal1'') <> ''aal2'' then raise exception ''MFA nivel 2 requerido para aprobar o emitir'' using errcode=''42501''; end if;';
begin
  select pg_get_functiondef('public.transition_valuation_case_atomic(uuid,text,text)'::regprocedure) into ddl;
  if position(needle in ddl) = 0 then
    raise exception 'Expected valuation authorization guard not found; migration aborted';
  end if;
  if position('MFA nivel 2 requerido para aprobar o emitir' in ddl) > 0 then
    return;
  end if;
  ddl := replace(ddl, needle, replacement);
  execute ddl;
end $$;
