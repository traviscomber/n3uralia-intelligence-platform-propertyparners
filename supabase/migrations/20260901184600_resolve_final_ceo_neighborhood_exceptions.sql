with targets(source_listing_id, neighborhood_name, method, reason, evidence) as (
  values
    (
      '2147886509',
      'La Llavería',
      'internet_kml_osm_cbrs_v1',
      'El aviso exacto se publica en La Llavería y referencia La Querencia; el trazado público completo de La Querencia cae únicamente dentro de La Llavería en el KML Property Partners.',
      jsonb_build_object(
        'portal_property_code','138844',
        'public_location','Sport Francés - La Querencia, La Llavería, Vitacura',
        'osm_way','24306645',
        'osm_feature','La Querencia',
        'kml_intersection_neighborhood','La Llavería',
        'kml_intersection_line_m',296.2,
        'cbrs_la_querencia_rows',16,
        'cbrs_la_querencia_consistent',16,
        'canonical_write',false
      )
    ),
    (
      '3555694156',
      'Club de Polo',
      'portal_osm_distance_triangulation_v1',
      'Portal publica distancias a tres paraderos georreferenciables; la intersección de las áreas máximas compatibles con esas distancias intersecta únicamente Club de Polo en el KML Property Partners. Engel & Völkers confirma la misma ficha mediante el código T-4201033.',
      jsonb_build_object(
        'portal_internal_code','4201033',
        'engel_property_id','T-4201033',
        'triangulation_stops',jsonb_build_array(
          jsonb_build_object('name','Bartolome de Las Casas / Francisco de Aguirre','lat',-33.3907212,'lon',-70.5912194,'max_distance_m',375),
          jsonb_build_object('name','Escribano Diego Rutal / Francisco de Aguirre','lat',-33.3890034,'lon',-70.5897511,'max_distance_m',413),
          jsonb_build_object('name','El Mercurio / Santa María','lat',-33.3847209,'lon',-70.5934301,'max_distance_m',412)
        ),
        'feasible_region_kml_neighborhood','Club de Polo',
        'feasible_region_overlap_m2',20640.5,
        'canonical_write',false
      )
    ),
    (
      '4367375336',
      'El Aromo',
      'duplicate_listing_osm_kml_v1',
      'Una publicación pública coincidente en precio, dormitorios, baños, superficie útil, estacionamientos y año ubica la propiedad en Las Chacras / Las Tranqueras; el trazado público completo de Las Chacras cae únicamente dentro de El Aromo en el KML Property Partners.',
      jsonb_build_object(
        'matching_public_listing_source','Fuenzalida Propiedades / Yapo',
        'matching_public_listing_price_uf',11900,
        'matching_public_listing_bedrooms',2,
        'matching_public_listing_bathrooms',1,
        'matching_public_listing_useful_area_m2',70,
        'matching_public_listing_parking_spaces',2,
        'matching_public_listing_year',1974,
        'matching_public_listing_total_area_m2',260,
        'public_location','Las Chacras / Las Tranqueras, Vitacura',
        'osm_way','180332964',
        'osm_feature','Las Chacras',
        'kml_intersection_neighborhood','El Aromo',
        'kml_intersection_line_m',135.1,
        'canonical_write',false
      )
    )
)
insert into private.market_neighborhood_resolution_evidence_v1(
  source_listing_id, neighborhood_id, method, reason, evidence
)
select
  t.source_listing_id,
  mn.id,
  t.method,
  t.reason,
  t.evidence
from targets t
join public.market_sources ms
  on ms.code='kml_vitacura_barrios_2026_08_12'
join public.market_neighborhoods mn
  on mn.geometry_source_id=ms.id
 and lower(mn.name)=lower(t.neighborhood_name)
on conflict (source_listing_id) do update
set neighborhood_id=excluded.neighborhood_id,
    method=excluded.method,
    reason=excluded.reason,
    evidence=excluded.evidence,
    updated_at=now();
