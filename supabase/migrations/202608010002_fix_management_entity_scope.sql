-- Ensure directors and subdirectors can read their own office root as well as descendants.

CREATE OR REPLACE FUNCTION public.can_access_management_entity(target_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH RECURSIVE ancestors AS (
  SELECT e.id, e.parent_id, e.profile_id, e.name, e.entity_type, e.metadata
  FROM public.management_entities e
  WHERE e.id = target_entity_id

  UNION ALL

  SELECT parent.id, parent.parent_id, parent.profile_id, parent.name, parent.entity_type, parent.metadata
  FROM public.management_entities parent
  JOIN ancestors child ON child.parent_id = parent.id
),
current_profile AS (
  SELECT lower(coalesce(role, '')) AS role, team
  FROM public.profiles
  WHERE id = auth.uid()
)
SELECT coalesce((
  SELECT
    current_profile.role IN ('admin', 'ceo')
    OR EXISTS (
      SELECT 1
      FROM ancestors ancestor
      WHERE ancestor.profile_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.management_entity_assignments assignment
      JOIN ancestors ancestor ON ancestor.id = assignment.entity_id
      WHERE assignment.profile_id = auth.uid()
        AND assignment.active
    )
    OR (
      current_profile.role IN ('director', 'subdirector')
      AND EXISTS (
        SELECT 1
        FROM ancestors ancestor
        WHERE public.normalize_management_text(ancestor.name) = public.normalize_management_text(current_profile.team)
           OR public.normalize_management_text(nullif(ancestor.metadata ->> 'team', '')) = public.normalize_management_text(current_profile.team)
           OR public.normalize_management_text(nullif(ancestor.metadata ->> 'office', '')) = public.normalize_management_text(current_profile.team)
      )
    )
  FROM current_profile
), false)
$function$;

REVOKE ALL ON FUNCTION public.can_access_management_entity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_management_entity(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_management_entity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_management_entity(uuid) TO service_role;
