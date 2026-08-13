import { redirect } from 'next/navigation'

export default function LegacyCbrsImportLayout({ children: _children }: Readonly<{ children: React.ReactNode }>) {
  redirect('/dashboard/market/import-cbrs-canonical')
}
