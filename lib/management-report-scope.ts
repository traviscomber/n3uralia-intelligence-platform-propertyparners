export function managementReportEntityScopes(role: string, entityIds: string[]): Array<string | null> {
  const normalizedRole = role.trim().toLowerCase()
  const uniqueEntityIds = [...new Set(entityIds)]
  if (normalizedRole === 'admin' || normalizedRole === 'ceo') return [null, ...uniqueEntityIds]
  if (normalizedRole === 'director' || normalizedRole === 'subdirector') return uniqueEntityIds
  return []
}

export function metricsForManagementReportScope<T extends { entity_id: string }>(
  metrics: T[],
  entityId: string | null,
): T[] {
  return entityId === null ? metrics : metrics.filter((metric) => metric.entity_id === entityId)
}
