-- Freeze a complete valuation expediente in every version row so an issued report
-- never needs to be reconstructed from mutable market/case tables.

create or replace function public.reject_valuation_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Los registros históricos de valorización son inmutables'
    using errcode = '42501';
end;
$$;

create or replace function private.enrich_valuation_case_version_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  current_case public.valuation_cases%rowtype;
  case_payload jsonb;
  prior_decisions jsonb;
  decision_payload jsonb;
  comparable_payload jsonb;
  actor_payload jsonb;
  current_actor jsonb;
  current_transition jsonb;
  core_snapshot jsonb;
  snapshot_hash text;
  current_action text;
begin
  select * into current_case
  from public.valuation_cases vc
  where vc.id = new.valuation_case_id;

  case_payload := coalesce(to_jsonb(current_case), '{}'::jsonb);

  select coalesce(
    jsonb_agg(to_jsonb(c) order by c.rank nulls last, c.created_at, c.id),
    '[]'::jsonb
  ) into comparable_payload
  from public.valuation_comparables c
  where c.valuation_case_id = new.valuation_case_id;

  select coalesce(
    jsonb_agg(
      to_jsonb(d) || jsonb_build_object(
        'actorSnapshot', case when p.id is null then null else jsonb_build_object(
          'id', p.id,
          'name', p.full_name,
          'role', p.role,
          'team', p.team
        ) end
      )
      order by d.created_at, d.id
    ),
    '[]'::jsonb
  ) into prior_decisions
  from public.valuation_decision_log d
  left join public.profiles p on p.id = d.actor_id
  where d.valuation_case_id = new.valuation_case_id;

  select case when p.id is null then null else jsonb_build_object(
    'id', p.id,
    'name', p.full_name,
    'role', p.role,
    'team', p.team
  ) end into current_actor
  from public.profiles p
  where p.id = new.created_by;

  current_action := case
    when new.status = 'draft' and new.snapshot ? 'fromStatus' then 'rejected'
    when new.status = 'draft' then 'case_created'
    when new.status = 'approved' then 'approved'
    when new.status = 'issued' then 'issued'
    when new.status = 'review' then 'submitted_for_review'
    else 'status_changed'
  end;

  current_transition := jsonb_build_object(
    'id', null,
    'action', current_action,
    'actor_id', new.created_by,
    'actorSnapshot', current_actor,
    'reason', nullif(trim(coalesce(new.snapshot->>'reason','')), ''),
    'created_at', coalesce(new.snapshot->>'transitionedAt', now()::text),
    'from_status', new.snapshot->>'fromStatus',
    'to_status', new.status,
    'metadata', jsonb_build_object(
      'atomic', true,
      'snapshotTransition', true,
      'versionNumber', new.version_number
    )
  );

  decision_payload := coalesce(prior_decisions, '[]'::jsonb) || jsonb_build_array(current_transition);

  actor_payload := jsonb_build_object(
    'requestedBy', (
      select jsonb_build_object('id',p.id,'name',p.full_name,'role',p.role,'team',p.team)
      from public.profiles p where p.id = current_case.requested_by
    ),
    'reviewedBy', (
      select jsonb_build_object('id',p.id,'name',p.full_name,'role',p.role,'team',p.team)
      from public.profiles p where p.id = current_case.reviewed_by
    ),
    'approvedBy', (
      select jsonb_build_object('id',p.id,'name',p.full_name,'role',p.role,'team',p.team)
      from public.profiles p where p.id = current_case.approved_by
    ),
    'versionCreatedBy', current_actor
  );

  core_snapshot := coalesce(new.snapshot, '{}'::jsonb) || jsonb_build_object(
    'snapshotSchemaVersion', 'valuation-case-version-v2',
    'capturedAt', now(),
    'valuationCase', case_payload,
    'comparables', coalesce(comparable_payload, '[]'::jsonb),
    'decisionHistory', decision_payload,
    'actors', actor_payload,
    'methodologyVersion', current_case.methodology_version
  );

  snapshot_hash := encode(extensions.digest(core_snapshot::text, 'sha256'), 'hex');
  new.snapshot := core_snapshot || jsonb_build_object(
    'snapshotHashAlgorithm', 'sha256',
    'snapshotSha256', snapshot_hash
  );

  return new;
end;
$$;

-- Recreate the enrichment trigger deterministically.
drop trigger if exists trg_enrich_valuation_case_version_snapshot on public.valuation_case_versions;
create trigger trg_enrich_valuation_case_version_snapshot
before insert on public.valuation_case_versions
for each row execute function private.enrich_valuation_case_version_snapshot();

-- Historical versions, especially issued ones, cannot be modified or deleted.
drop trigger if exists protect_valuation_case_version_mutation on public.valuation_case_versions;
create trigger protect_valuation_case_version_mutation
before update or delete on public.valuation_case_versions
for each row execute function public.reject_valuation_audit_mutation();
