import { redirect } from 'next/navigation'
import { createClient, getServerUser } from '@/lib/supabase/server'
import { AppShell } from '@/components/dashboard/AppShell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  if (!user) {
    redirect('/auth')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('has_completed_onboarding')
    .eq('id', user.id)
    .single()

  if (!profile?.has_completed_onboarding) {
    redirect('/onboarding')
  }

  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  )
}
