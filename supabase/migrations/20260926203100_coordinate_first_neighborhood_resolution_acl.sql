-- Keep the coordinate-first resolver private after the production replacement.
revoke all on function private.resolve_market_neighborhood_signal_v2(uuid) from public,anon,authenticated;
