update private.valuation_ml_models
set baseline_methodology = 'property-partners-house-champion-v5',
    metrics = coalesce(metrics, '{}'::jsonb) || jsonb_build_object(
      'baseline_mape_2025', 12.78,
      'baseline_within_15_2025', 68.3,
      'baseline_within_20_2025', 77.6,
      'baseline_auto_coverage_2025', 89.3,
      'baseline_source', 'champion_v5_temporal_lab'
    ),
    config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
      'baseline_selection', 'pp_kml_then_physical_0.70_1.43',
      'baseline_estimator', 'geo50_mean30_median20_similarity_squared',
      'land_dominant_ratio', 5,
      'land_dominant_bonus', 0.30,
      'tight_guard_barrios', jsonb_build_array('Tabancura', 'El Aromo'),
      'tight_guard_ratio', jsonb_build_array(0.80, 1.50)
    ),
    updated_at = now()
where model_version = 'pp-house-hybrid-ml-v1';
