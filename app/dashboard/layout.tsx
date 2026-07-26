import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import Topbar from '@/components/layout/topbar'
import { CEOAIAssistantWidget } from '@/components/ceo/ceo-ai-assistant-widget'
import { DirectorAIAssistantWidget } from '@/components/director/director-ai-assistant-widget'
import { PartnerAIAssistantWidget } from '@/components/partner/partner-ai-assistant-widget'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  const role = String(profile?.role ?? '').toLowerCase()

  return (
    <div className="dashboard-shell flex h-screen overflow-hidden bg-[var(--n3-black)] text-[var(--n3-text-light)]">
      <Sidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar user={user} profile={profile} />
        <main className="dashboard-content flex-1 overflow-y-auto bg-[var(--n3-black)] p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Role-scoped AI Assistant Widgets */}
      {role === 'ceo' && <CEOAIAssistantWidget />}
      {role === 'director' && <DirectorAIAssistantWidget />}
      {role === 'partner' && <PartnerAIAssistantWidget />}
    </div>
  )
}
