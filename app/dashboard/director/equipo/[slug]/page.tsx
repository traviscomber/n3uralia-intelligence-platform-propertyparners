import { DirectorTeamMember } from '@/components/management/director-team-member'

export default async function DirectorTeamMemberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <DirectorTeamMember slug={slug} />
}
