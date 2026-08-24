create index if not exists market_listing_territory_reviews_neighborhood_id_idx
  on private.market_listing_territory_reviews (neighborhood_id)
  where neighborhood_id is not null;

create index if not exists market_listing_territory_reviews_reviewed_by_idx
  on private.market_listing_territory_reviews (reviewed_by);
