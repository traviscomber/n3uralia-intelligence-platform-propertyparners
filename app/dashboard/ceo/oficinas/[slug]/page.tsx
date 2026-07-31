import { redirect } from 'next/navigation'

export default async function LegacyCeoOfficeRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/dashboard/ceo/oficina/${encodeURIComponent(slug)}`)
}
