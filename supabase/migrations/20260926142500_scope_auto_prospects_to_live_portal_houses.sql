create or replace function public.refresh_property_prospect_leads_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_eligible integer := 0;
  v_inserted integer := 0;
begin
  with latest_listing as materialized (
    select distinct on (l.property_id)
      l.property_id,
      p.neighborhood_id,
      t.director_key,
      l.source_listing_id,
      l.url,
      l.observed_at
    from public.market_current_listings l
    join public.market_sources s
      on s.id = l.source_id
     and s.code = 'portal-inmobiliario-vitacura-portal-houses'
    join public.market_properties p
      on p.id = l.property_id
    join public.market_neighborhood_director_assignments t
      on t.neighborhood_id = p.neighborhood_id
     and t.active
     and t.valid_to is null
    join public.property_director_directory d
      on d.director_key = t.director_key
     and d.active
    where l.property_id is not null
      and p.neighborhood_id is not null
      and l.status in ('active','observed')
      and lower(btrim(coalesce(l.operation,''))) in ('sale','venta','sell')
    order by l.property_id, l.observed_at desc nulls last, l.created_at desc
  ), eligible as (
    select ll.*
    from latest_listing ll
    where not exists (
      select 1
      from public.property_prospect_leads lead
      where lead.property_id = ll.property_id
    )
  ), counted as (
    select count(*)::integer as n from eligible
  ), inserted as (
    insert into public.property_prospect_leads (
      property_id,
      neighborhood_id,
      director_key,
      source_listing_id,
      source_url,
      lead_reason,
      status,
      priority,
      detected_at,
      assigned_at,
      created_at,
      updated_at
    )
    select
      e.property_id,
      e.neighborhood_id,
      e.director_key,
      e.source_listing_id,
      e.url,
      'Publicación vigente vinculada a propiedad canónica con territorio de dirección confirmado.',
      'assigned',
      'normal',
      now(),
      now(),
      now(),
      now()
    from eligible e
    on conflict (property_id) do nothing
    returning id, property_id, neighborhood_id, director_key, source_listing_id, source_url
  ), lead_events as (
    insert into public.property_prospect_events (
      lead_id,
      property_id,
      event_type,
      actor_id,
      to_status,
      note,
      metadata,
      occurred_at
    )
    select
      i.id,
      i.property_id,
      'lead_created',
      null::uuid,
      'assigned',
      'Lead creado automáticamente desde publicación vigente + identidad canónica + territorio confirmado.',
      jsonb_build_object(
        'sourceListingId', i.source_listing_id,
        'sourceUrl', i.source_url,
        'neighborhoodId', i.neighborhood_id,
        'directorKey', i.director_key,
        'pipeline', 'property_prospect_auto_v1'
      ),
      now()
    from inserted i
    union all
    select
      i.id,
      i.property_id,
      'director_assigned',
      null::uuid,
      'assigned',
      'Dirección responsable heredada del territorio confirmado del barrio.',
      jsonb_build_object(
        'neighborhoodId', i.neighborhood_id,
        'directorKey', i.director_key,
        'pipeline', 'property_prospect_auto_v1'
      ),
      now()
    from inserted i
    returning id
  )
  select
    coalesce((select n from counted), 0),
    coalesce((select count(*) from inserted), 0)
  into v_eligible, v_inserted;

  return jsonb_build_object(
    'eligible', v_eligible,
    'inserted', v_inserted,
    'generated_at', now()
  );
end;
$$;

revoke all on function public.refresh_property_prospect_leads_v1() from public;
revoke all on function public.refresh_property_prospect_leads_v1() from anon;
revoke all on function public.refresh_property_prospect_leads_v1() from authenticated;
grant execute on function public.refresh_property_prospect_leads_v1() to service_role;


