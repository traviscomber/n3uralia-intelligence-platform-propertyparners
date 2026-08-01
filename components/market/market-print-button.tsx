'use client'

import { Printer } from 'lucide-react'

export function MarketPrintButton() {
  return <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><Printer size={16} />Imprimir o guardar PDF</button>
}
