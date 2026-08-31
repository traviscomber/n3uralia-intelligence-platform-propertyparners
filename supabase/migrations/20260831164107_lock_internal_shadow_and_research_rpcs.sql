do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where p.prokind='f'
      and n.nspname='public'
      and p.prosecdef
      and p.proname = any(array[
        'backfill_house_regime_shadow_v1',
        'lo_curro_market_cluster_watch_v1',
        'lo_curro_market_cluster_watch_v2',
        'refresh_lo_curro_multisource_intelligence_v1',
        'refresh_lo_curro_raw_price_history_v1',
        'refresh_valuation_cbrs_barrio_quality_stats_v1',
        'refresh_valuation_cbrs_barrio_quality_stats_v2',
        'valuation_cbrs_comparability_audit_v1',
        'valuation_cbrs_quality_audit_v1',
        'valuation_cbrs_quality_audit_v2',
        'valuation_house_regime_focus_v1',
        'valuation_house_regime_prospective_scoreboard_v1',
        'valuation_house_regime_prospective_scoreboard_v2',
        'valuation_house_regime_resolve_actuals_v1',
        'valuation_house_regime_router_portfolio_v1',
        'valuation_house_regime_router_shadow_v1',
        'valuation_house_regime_router_shadow_v2',
        'valuation_house_regime_walkforward_2025_v1',
        'valuation_house_structure_backtest_v1',
        'valuation_house_structure_backtest_v2',
        'valuation_lo_curro_high_rough_walkforward_weights_v1',
        'valuation_lo_curro_high_rough_weight_sweep_v1',
        'valuation_lo_curro_topography_segment_backtest_v1',
        'valuation_spatial_position_backtest_barrio_v1',
        'valuation_topography_backtest_barrio_v1',
        'valuation_topography_backtest_barrio_v2',
        'valuation_topography_backtest_lo_curro_v1',
        'valuation_road_hierarchy_backtest_lo_curro_v1',
        'valuation_road_hierarchy_backtest_lo_curro_v2'
      ])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end $$;
