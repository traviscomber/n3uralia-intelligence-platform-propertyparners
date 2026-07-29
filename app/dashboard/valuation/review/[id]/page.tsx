import { redirect } from 'next/navigation'

export default async function LegacyValuationReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/valuations/${id}`)
}
