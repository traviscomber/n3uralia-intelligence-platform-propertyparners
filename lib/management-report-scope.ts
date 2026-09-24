export function managementReportEntityScopes(role: string, entityIds: string[]): Array<string | null> {
  const normalizedRole = role.trim().toLowerCase()
  if (normalizedRole === 'admin' || normalizedRole === 'ceo') return [null]
  if (normalizedRole === 'director' || normalizedRole === 'subdirector') return [...new Set(entityIds)]
  return []
}

export function metricsForManagementReportScope<T extends { entity_id: string }>(
  metrics: T[],
  entityId: string | null,
): T[] {
  return entityId === null ? metrics : metrics.filter((metric) => metric.entity_id === entityId)
}
