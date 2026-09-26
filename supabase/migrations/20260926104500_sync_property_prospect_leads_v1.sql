create or replace function public.sync_property_prospect_leads_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_inserted integer := 0;
  v_events integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  with source as (
    select id
    from public.market_sources
    where code = 'portal-inmobiliario-vitacura-portal-houses'
    limit 1
  ), eligible as materialized (
    select distinct on (ml.property_id)
      ml.property_id,
      mp.neighborhood_id,
      territory.director_key,
      ml.source_listing_id,
      ml.url,
      ml.observed_at
    from public.market_current_listings ml
    join source s on s.id = ml.source_id
    join public.market_properties mp on mp.id = ml.property_id
    join public.market_neighborhood_director_assignments territory
      on territory.neighborhood_id = mp.neighborhood_id
     and territory.active
     and territory.valid_to is null
    where ml.property_id is not null
      and mp.neighborhood_id is not null
      and ml.status in ('active','observed')
      and lower(coalesce(ml.operation,'')) in ('sale','venta','sell')
    order by ml.property_id, ml.observed_at desc nulls last, ml.created_at desc
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
      created_by,
      updated_by
    )
    select
      e.property_id,
      e.neighborhood_id,
      e.director_key,
      e.source_listing_id,
      e.url,
      'Publicación live de Portal vinculada a propiedad canónica y territorio confirmado.',
      'assigned',
      'normal',
      coalesce(e.observed_at, now()),
      now(),
      null,
      null
    from eligible e
    where not exists (
      select 1
      from public.property_prospect_leads l
      where l.property_id = e.property_id
    )
    on conflict (property_id) do nothing
    returning id,property_id,neighborhood_id,director_key,source_listing_id,source_url
  ), event_rows as (
    insert into public.property_prospect_events (
      lead_id,
      property_id,
      event_type,
      actor_id,
      to_status,
      note,
      metadata
    )
    select
      i.id,
      i.property_id,
      event_type,
      null,
      'assigned',
      case
        when event_type = 'lead_created'
          then 'Lead creado automáticamente desde publicación live con territorio confirmado.'
        else 'Dirección territorial aplicada automáticamente desde asignación confirmada de barrio.'
      end,
      jsonb_build_object(
        'source','automatic-portal-territory-sync-v1',
        'sourceListingId',i.source_listing_id,
        'sourceUrl',i.source_url,
        'directorKey',i.director_key,
        'neighborhoodId',i.neighborhood_id
      )
    from inserted i
    cross join (values ('lead_created'::text),('director_assigned'::text)) events(event_type)
    returning id
  )
  select
    (select count(*) from inserted),
    (select count(*) from event_rows)
  into v_inserted,v_events;

  return jsonb_build_object(
    'insertedLeads',v_inserted,
    'insertedEvents',v_events,
    'generatedAt',now(),
    'source','automatic-portal-territory-sync-v1'
  );
end;
$$;

revoke all on function public.sync_property_prospect_leads_v1() from public;
revoke all on function public.sync_property_prospect_leads_v1() from anon;
revoke all on function public.sync_property_prospect_leads_v1() from authenticated;
grant execute on function public.sync_property_prospect_leads_v1() to service_role;
