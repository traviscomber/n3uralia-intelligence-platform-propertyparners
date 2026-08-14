export type PublicErrorCode =
  | 'DATA_UNAVAILABLE'
  | 'REQUEST_FAILED'
  | 'SAVE_FAILED'
  | 'ACCESS_RESTRICTED'

const publicMessages: Record<PublicErrorCode, string> = {
  DATA_UNAVAILABLE: 'No fue posible consultar toda la información operativa. Reintenta más tarde o informa el incidente al responsable de la plataforma.',
  REQUEST_FAILED: 'La solicitud no pudo completarse. Reintenta más tarde.',
  SAVE_FAILED: 'Los cambios no pudieron guardarse. Revisa los datos e inténtalo nuevamente.',
  ACCESS_RESTRICTED: 'Tu perfil no tiene acceso a esta operación.',
}

export function getPublicErrorMessage(code: PublicErrorCode) {
  return publicMessages[code]
}

export function createIncidentReference(scope: string, occurredAt = new Date()) {
  const safeScope = scope
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'APP'

  const timestamp = occurredAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  return `${safeScope}-${timestamp}`
}
