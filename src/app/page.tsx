import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase/server'
import { LandingPage } from './LandingPage'

export default async function Home() {
  const user = await getServerUser()
  if (user) redirect('/dashboard')
  return <LandingPage />
}
