/** Scope guard for the office/directora report. The requester's access is checked
 * against server-resolved management entity IDs, never a client-provided name. */
export type OfficeReportScope={
  requestScope:'global'|'office'|'self'
  officeId:string|null
  visibleEntityIds:readonly string[]
}
export function verifyDirectorOfficeReportScope(scope:OfficeReportScope, reportEntityId:string|null, snapshotOfficeEntityId:string|null):void {
  if(!reportEntityId || !snapshotOfficeEntityId || reportEntityId!==snapshotOfficeEntityId) throw new Error('DIRECTOR_REPORT_OFFICE_MISMATCH')
  if(scope.requestScope==='self') throw new Error('DIRECTOR_REPORT_ACCESS_DENIED')
  if(scope.requestScope==='office' && (scope.officeId!==reportEntityId || !scope.visibleEntityIds.includes(reportEntityId))) throw new Error('DIRECTOR_REPORT_ACCESS_DENIED')
}
