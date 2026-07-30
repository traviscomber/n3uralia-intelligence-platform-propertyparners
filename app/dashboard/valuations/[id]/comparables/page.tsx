import { redirect } from 'next/navigation'

export default async function LegacyComparableWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/valuations/${id}`)
}
