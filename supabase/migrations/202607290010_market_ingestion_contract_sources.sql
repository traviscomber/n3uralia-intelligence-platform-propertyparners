alter table market_ingestion_runs drop constraint if exists market_ingestion_runs_dataset_kind_check;
alter table market_ingestion_runs add constraint market_ingestion_runs_dataset_kind_check check (dataset_kind in ('portal_apartments','portal_houses','portal_projects','registered_sales','client_sales','kml_neighborhoods'));
alter table market_ingestion_runs drop constraint if exists market_ingestion_runs_source_system_check;
alter table market_ingestion_runs add constraint market_ingestion_runs_source_system_check check (source_system in ('portal_inmobiliario','cbrs','client','kml','manual_import'));
