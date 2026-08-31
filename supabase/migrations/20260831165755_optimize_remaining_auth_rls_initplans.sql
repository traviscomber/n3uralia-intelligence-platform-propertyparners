set lock_timeout='3s';
set statement_timeout='20s';

do $$
declare r record; q text; c text;
begin
  for r in
    with target(table_name,policy_name) as (values
      ('ai_reports','reports_authenticated_read'),('ai_reports','reports_insert_authenticated'),
      ('knowledge_documents','knowledge_authenticated_read'),('data_sources','data_sources_authenticated_read'),('recommendations','recommendations_authenticated_read'),
      ('images','Users can read own images'),('images','Users can insert own images'),('images','Users can update own images'),
      ('comparisons','Users can read own comparisons'),('comparisons','Users can insert own comparisons'),
      ('usage_logs','Users can read own logs'),('usage_logs','Users can insert own logs'),
      ('api_keys','Users view org api keys'),('portal_comparisons','Users view org portal comparisons'),
      ('search_history','Users view own search history'),('search_history','Users insert own search history'),
      ('agent_evaluations','agent_evaluations_insert_authenticated'),('agent_evaluations','agent_evaluations_read_authorized'),('agent_evaluations','agent_evaluations_update_own'),
      ('agent_runs','agent_runs_insert_authorized'),('agent_runs','agent_runs_update_authorized'),('agent_approvals','agent_approvals_insert_reviewer'),
      ('agent_notifications','agent_notifications_read_own'),('agent_notifications','agent_notifications_update_own'),
      ('copilot_feedback','CEO users can insert own copilot feedback'),('copilot_feedback','Users can read own copilot feedback'),
      ('management_report_runs','management leaders update management reports'),
      ('market_neighborhood_review_events','market neighborhood review events insert admin aal2'),
      ('market_neighborhood_review_items','market neighborhood review update leaders aal2'),
      ('documents','documents_ceo_director_create'),('documents','documents_ceo_director_view'),('documents','documents_ceo_director_update'),
      ('document_schedules','schedules_ceo_director_manage'),('document_recipients','document_recipients_ceo_director_manage')
    )
    select n.nspname schema_name,cl.relname table_name,p.polname,
           pg_get_expr(p.polqual,p.polrelid) qual,
           pg_get_expr(p.polwithcheck,p.polrelid) chk
    from pg_policy p
    join pg_class cl on cl.oid=p.polrelid
    join pg_namespace n on n.oid=cl.relnamespace
    join target t on t.table_name=cl.relname and t.policy_name=p.polname
    where n.nspname='public'
  loop
    q:=r.qual; c:=r.chk;
    if q is not null then
      q:=replace(q,'( SELECT auth.uid() AS uid)','__AUTH_UID_INITPLAN__');
      q:=replace(q,'( SELECT (auth.jwt() ->> ''aal''::text))','__AUTH_AAL_INITPLAN__');
      q:=replace(q,'auth.uid()','(select auth.uid())');
      q:=replace(q,'auth.jwt()','(select auth.jwt())');
      q:=replace(q,'auth.role()','(select auth.role())');
      q:=replace(q,'__AUTH_UID_INITPLAN__','( SELECT auth.uid() AS uid)');
      q:=replace(q,'__AUTH_AAL_INITPLAN__','((select auth.jwt()) ->> ''aal''::text)');
    end if;
    if c is not null then
      c:=replace(c,'( SELECT auth.uid() AS uid)','__AUTH_UID_INITPLAN__');
      c:=replace(c,'( SELECT (auth.jwt() ->> ''aal''::text))','__AUTH_AAL_INITPLAN__');
      c:=replace(c,'auth.uid()','(select auth.uid())');
      c:=replace(c,'auth.jwt()','(select auth.jwt())');
      c:=replace(c,'auth.role()','(select auth.role())');
      c:=replace(c,'__AUTH_UID_INITPLAN__','( SELECT auth.uid() AS uid)');
      c:=replace(c,'__AUTH_AAL_INITPLAN__','((select auth.jwt()) ->> ''aal''::text)');
    end if;
    if q is not null and c is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)',r.polname,r.schema_name,r.table_name,q,c);
    elsif q is not null then
      execute format('alter policy %I on %I.%I using (%s)',r.polname,r.schema_name,r.table_name,q);
    elsif c is not null then
      execute format('alter policy %I on %I.%I with check (%s)',r.polname,r.schema_name,r.table_name,c);
    end if;
  end loop;
end $$;
