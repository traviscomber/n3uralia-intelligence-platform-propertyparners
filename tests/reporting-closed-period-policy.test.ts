import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lastClosedMonth, lastClosedWeek, reportPeriodState, selectLastExportable } from '../lib/reporting/closed-period-policy'

test('weekly cuts use Monday to Sunday and never include current week', () => {
  assert.deepEqual([lastClosedWeek(new Date('2026-10-10T15:00:00Z')).start,lastClosedWeek(new Date('2026-10-10T15:00:00Z')).end],['2026-09-28','2026-10-04'])
  assert.equal(lastClosedWeek(new Date('2026-10-12T15:00:00Z')).end, '2026-10-11')
})
test('monthly cut uses last ended calendar month in Chile', () => {
  assert.deepEqual([lastClosedMonth(new Date('2026-10-10T15:00:00Z')).start,lastClosedMonth(new Date('2026-10-10T15:00:00Z')).end],['2026-09-01','2026-09-30'])
})
test('do not publish unapproved or partial reporting periods', () => {
  const ready={periodClosed:true,requiredVerified:true,sourceCutoffValid:true,approved:true}
  assert.equal(reportPeriodState(ready),'closed')
  for(const key of Object.keys(ready) as Array<keyof typeof ready>){
    assert.equal(reportPeriodState({...ready,[key]:false}),'incomplete')
  }
})
test('fallback selects last actually closed snapshot; never a partial newer one', () => {
  const reports=[
    {period_end:'2026-10-04',state:'incomplete' as const,id:'bad'},
    {period_end:'2026-09-28',state:'closed' as const,id:'approved'},
    {period_end:'2026-09-21',state:'closed' as const,id:'older'}
  ]
  assert.equal(selectLastExportable(reports,'2026-10-04')?.id,'approved')
  assert.equal(selectLastExportable(reports,'2026-09-22')?.id,'older')
  assert.equal(selectLastExportable(reports,'2026-09-01'),null)
})
