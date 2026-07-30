-- Recalcula métricas mensuales del Módulo I desde datos canónicos.

create or replace function refresh_market_metric_snapshot(
  p_period_start date,
  p_period_end date,
  p_methodology_version text default 'market-v1'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into market_metric_snapshots (
    period_start,
    period_end,
    neighborhood_id,
    property_type,
    active_inventory,
    new_listings,
    removed_listings,
    confirmed_sales,
    median_days_on_market,
    absorption_rate,
    offer_to_sales_ratio,
    source_ids,
    methodology_version,
    generated_at
  )
  select
    p_period_start,
    p_period_end,
    null,
    null,
    count(distinct l.property_id) filter (
      where l.status = 'active'
        and l.observed_at::date <= p_period_end
        and (l.removed_at is null or l.removed_at::date > p_period_end)
    )::integer as active_inventory,
    count(distinct l.source_id::text || ':' || l.source_listing_id) filter (
      where l.observed_at::date between p_period_start and p_period_end
    )::integer as new_listings,
    count(distinct l.source_id::text || ':' || l.source_listing_id) filter (
      where l.removed_at::date between p_period_start and p_period_end
    )::integer as removed_listings,
    count(distinct t.id) filter (
      where t.transaction_date between p_period_start and p_period_end
        and t.property_id is not null
    )::integer as confirmed_sales,
    percentile_cont(0.5) within group (order by lifecycle.days_on_market)
      filter (where lifecycle.first_confirmed_sale_date between p_period_start and p_period_end) as median_days_on_market,
    case
      when count(distinct l.property_id) filter (
        where l.status = 'active'
          and l.observed_at::date <= p_period_end
          and (l.removed_at is null or l.removed_at::date > p_period_end)
      ) > 0
      then round(
        count(distinct t.id) filter (
          where t.transaction_date between p_period_start and p_period_end
            and t.property_id is not null
        )::numeric
        /
        count(distinct l.property_id) filter (
          where l.status = 'active'
            and l.observed_at::date <= p_period_end
            and (l.removed_at is null or l.removed_at::date > p_period_end)
        )::numeric,
        4
      )
      else null
    end as absorption_rate,
    case
      when count(distinct t.id) filter (
        where t.transaction_date between p_period_start and p_period_end
          and t.property_id is not null
      ) > 0
      then round(
        count(distinct l.property_id) filter (
          where l.status = 'active'
            and l.observed_at::date <= p_period_end
            and (l.removed_at is null or l.removed_at::date > p_period_end)
        )::numeric
        /
        count(distinct t.id) filter (
          where t.transaction_date between p_period_start and p_period_end
            and t.property_id is not null
        )::numeric,
        4
      )
      else null
    end as offer_to_sales_ratio,
    array(
      select distinct source_id from (
        select source_id from market_listings
        union all
        select source_id from market_transactions
      ) source_union
    ) as source_ids,
    p_methodology_version,
    now()
  from market_listings l
  full join market_transactions t on false
  left join market_property_lifecycle lifecycle on lifecycle.property_id = t.property_id
  on conflict (period_start, period_end, neighborhood_id, property_type, methodology_version)
  do update set
    active_inventory = excluded.active_inventory,
    new_listings = excluded.new_listings,
    removed_listings = excluded.removed_listings,
    confirmed_sales = excluded.confirmed_sales,
    median_days_on_market = excluded.median_days_on_market,
    absorption_rate = excluded.absorption_rate,
    offer_to_sales_ratio = excluded.offer_to_sales_ratio,
    source_ids = excluded.source_ids,
    generated_at = now();
end;
$$;

revoke all on function refresh_market_metric_snapshot(date, date, text) from public;
grant execute on function refresh_market_metric_snapshot(date, date, text) to service_role;
