import type { ReactNode } from 'react'
import { ValuationSaveRedirect } from './valuation-save-redirect'

export default function ValuationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ValuationSaveRedirect />
      {children}
    </>
  )
}
