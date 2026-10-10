import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyDirectorOfficeReportScope } from '../lib/property-partners-director-report-scope'

test('director sees only matching server-side office entity',()=>{
  const director={requestScope:'office' as const,officeId:'office-a',visibleEntityIds:['office-a']}
  assert.doesNotThrow(()=>verifyDirectorOfficeReportScope(director,'office-a','office-a'))
  assert.throws(()=>verifyDirectorOfficeReportScope(director,'office-b','office-b'),/ACCESS_DENIED/)
  assert.throws(()=>verifyDirectorOfficeReportScope(director,'office-a','office-b'),/OFFICE_MISMATCH/)
  assert.throws(()=>verifyDirectorOfficeReportScope({...director,visibleEntityIds:[]},'office-a','office-a'),/ACCESS_DENIED/)
})
test('seller cannot download director report and global reader requires matched report identity',()=>{
  assert.throws(()=>verifyDirectorOfficeReportScope({requestScope:'self',officeId:null,visibleEntityIds:[]},'office-a','office-a'),/ACCESS_DENIED/)
  assert.doesNotThrow(()=>verifyDirectorOfficeReportScope({requestScope:'global',officeId:null,visibleEntityIds:[]},'office-a','office-a'))
  assert.throws(()=>verifyDirectorOfficeReportScope({requestScope:'global',officeId:null,visibleEntityIds:[]},'office-a',null),/OFFICE_MISMATCH/)
})
