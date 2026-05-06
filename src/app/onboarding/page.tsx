'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Receipt, Wallet, CheckCircle2, ArrowRight, Loader2, Sparkles, ChevronRight, SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const steps = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'bill', label: 'First Bill', icon: Receipt },
  { id: 'income', label: 'Income', icon: Wallet },
  { id: 'done', label: 'All Set', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [skipping, setSkipping] = React.useState(false)

  // Bill form state
  const [biller, setBiller] = React.useState('')
  const [billAmount, setBillAmount] = React.useState('')
  const [billDueDate, setBillDueDate] = React.useState('')
  const [billFrequency, setBillFrequency] = React.useState('monthly')

  // Income form state
  const [incomeSource, setIncomeSource] = React.useState('')
  const [incomeAmount, setIncomeAmount] = React.useState('')
  const [incomeFrequency, setIncomeFrequency] = React.useState('monthly')

  const currentStep = steps[step]

  const handleSaveBill = async () => {
    if (!biller || !billAmount || !billDueDate) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('bills').insert({
        user_id: user.id,
        biller,
        amount: Number(billAmount),
        due_date: billDueDate,
        frequency: billFrequency,
        status: 'active',
      })
      if (error) throw error
      toast.success('Bill added')
      setStep(2)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveIncome = async () => {
    if (!incomeSource || !incomeAmount) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('incomes').insert({
        user_id: user.id,
        source: incomeSource,
        amount: Number(incomeAmount),
        frequency: incomeFrequency,
        status: 'active',
      })
      if (error) throw error
      toast.success('Income added')
      setStep(3)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id)
      if (error) throw error
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to finish')
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (step === 1) {
      setSkipping(true)
      setStep(2)
      setSkipping(false)
    } else if (step === 2) {
      setSkipping(true)
      setStep(3)
      setSkipping(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-(--color-surface) px-6 py-12">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                i <= step
                  ? 'border-(--color-accent) bg-(--color-accent) text-white'
                  : 'border-(--color-surface-border) bg-(--color-surface-raised) text-(--color-content-tertiary)'
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 rounded-full transition-colors ${
                  i < step ? 'bg-(--color-accent)' : 'bg-(--color-surface-border)'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* Welcome */}
        {currentStep.id === 'welcome' && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-(--color-accent-muted) bg-(--color-accent-muted)">
              <Sparkles className="h-6 w-6 text-(--color-accent)" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-(--color-content)">Welcome to Oweable</h1>
            <p className="mt-2 text-sm leading-relaxed text-(--color-content-secondary)">
              Let&apos;s add a couple things so you can see what this app does. It takes about 90 seconds.
            </p>
            <div className="mt-8 space-y-3">
              <Button
                onClick={() => setStep(1)}
                className="w-full"
              >
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Bill Step */}
        {currentStep.id === 'bill' && (
          <div>
            <div className="mb-1 text-center">
              <Receipt className="mx-auto h-8 w-8 text-(--color-accent)" />
              <h2 className="mt-3 text-xl font-semibold text-(--color-content)">Add your first bill</h2>
              <p className="mt-1 text-sm text-(--color-content-secondary)">
                This is the fastest way to see what Oweable does best.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-(--color-content-secondary)">Biller name</label>
                <input
                  value={biller}
                  onChange={(e) => setBiller(e.target.value)}
                  placeholder="e.g. Rent, Electric, Internet"
                  className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-(--color-content-secondary)">Amount</label>
                  <input
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-(--color-content-secondary)">Frequency</label>
                  <select
                    value={billFrequency}
                    onChange={(e) => setBillFrequency(e.target.value)}
                    className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-(--color-content-secondary)">Next due date</label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={skipping}
                  className="flex-1 border-(--color-surface-border) text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
                >
                  {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="mr-1.5 h-4 w-4" />}
                  Skip
                </Button>
                <Button
                  onClick={handleSaveBill}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Continue'}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Income Step */}
        {currentStep.id === 'income' && (
          <div>
            <div className="mb-1 text-center">
              <Wallet className="mx-auto h-8 w-8 text-(--color-success)" />
              <h2 className="mt-3 text-xl font-semibold text-(--color-content)">Add your income</h2>
              <p className="mt-1 text-sm text-(--color-content-secondary)">
                This unlocks Safe Spend — your daily discretionary budget.
              </p>
            </div>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-(--color-content-secondary)">Income source</label>
                <input
                  value={incomeSource}
                  onChange={(e) => setIncomeSource(e.target.value)}
                  placeholder="e.g. Salary, Freelance"
                  className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-(--color-content-secondary)">Amount</label>
                  <input
                    type="number"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) placeholder:text-(--color-content-tertiary) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-(--color-content-secondary)">Frequency</label>
                  <select
                    value={incomeFrequency}
                    onChange={(e) => setIncomeFrequency(e.target.value)}
                    className="mt-1 w-full rounded-md border border-(--color-surface-border) bg-(--color-surface-raised) px-3 py-2 text-sm text-(--color-content) focus:outline-none focus:ring-2 focus:ring-(--color-accent)"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={skipping}
                  className="flex-1 border-(--color-surface-border) text-(--color-content-secondary) hover:bg-(--color-surface-raised)"
                >
                  {skipping ? <Loader2 className="h-4 w-4 animate-spin" /> : <SkipForward className="mr-1.5 h-4 w-4" />}
                  Skip
                </Button>
                <Button
                  onClick={handleSaveIncome}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Continue'}
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Done Step */}
        {currentStep.id === 'done' && (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-(--color-success-border) bg-(--color-success-bg)">
              <CheckCircle2 className="h-6 w-6 text-(--color-success)" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-(--color-content)">You&apos;re all set</h2>
            <p className="mt-2 text-sm text-(--color-content-secondary)">
              Head to your dashboard to see everything in one place. You can add more bills, debts, subscriptions, and goals anytime.
            </p>
            <div className="mt-8">
              <Button
                onClick={handleFinish}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go to Dashboard'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
