drop policy if exists agent_artifacts_write_authorized on public.agent_artifacts;
create policy agent_artifacts_insert_authorized on public.agent_artifacts for insert to authenticated with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_artifacts_update_authorized on public.agent_artifacts for update to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text])) with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_artifacts_delete_authorized on public.agent_artifacts for delete to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));

drop policy if exists agent_findings_write_authorized on public.agent_findings;
create policy agent_findings_insert_authorized on public.agent_findings for insert to authenticated with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_findings_update_authorized on public.agent_findings for update to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text])) with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_findings_delete_authorized on public.agent_findings for delete to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));

drop policy if exists agent_metric_snapshots_write_executive on public.agent_metric_snapshots;
create policy agent_metric_snapshots_insert_executive on public.agent_metric_snapshots for insert to authenticated with check (current_profile_role() = any (array['admin'::text,'ceo'::text]));
create policy agent_metric_snapshots_update_executive on public.agent_metric_snapshots for update to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text])) with check (current_profile_role() = any (array['admin'::text,'ceo'::text]));
create policy agent_metric_snapshots_delete_executive on public.agent_metric_snapshots for delete to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text]));

drop policy if exists agent_schedules_write_executive on public.agent_schedules;
create policy agent_schedules_insert_executive on public.agent_schedules for insert to authenticated with check (current_profile_role() = any (array['admin'::text,'ceo'::text]));
create policy agent_schedules_update_executive on public.agent_schedules for update to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text])) with check (current_profile_role() = any (array['admin'::text,'ceo'::text]));
create policy agent_schedules_delete_executive on public.agent_schedules for delete to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text]));

drop policy if exists agent_sources_write_authorized on public.agent_sources;
create policy agent_sources_insert_authorized on public.agent_sources for insert to authenticated with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_sources_update_authorized on public.agent_sources for update to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text])) with check (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));
create policy agent_sources_delete_authorized on public.agent_sources for delete to authenticated using (current_profile_role() = any (array['admin'::text,'ceo'::text,'director'::text,'analyst'::text]));

drop policy if exists thor_admin_claims on public.thor_claims;
create policy thor_admin_claims_insert on public.thor_claims for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_claims_update on public.thor_claims for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text]))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_claims_delete on public.thor_claims for delete to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));

drop policy if exists thor_admin_questions on public.thor_questions;
create policy thor_admin_questions_insert on public.thor_questions for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_questions_update on public.thor_questions for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text]))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_questions_delete on public.thor_questions for delete to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));

drop policy if exists thor_admin_sources on public.thor_source_registry;
create policy thor_admin_sources_insert on public.thor_source_registry for insert to authenticated with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_sources_update on public.thor_source_registry for update to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text]))) with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
create policy thor_admin_sources_delete on public.thor_source_registry for delete to authenticated using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(coalesce(p.role,'')) = any (array['admin'::text,'ceo'::text])));
