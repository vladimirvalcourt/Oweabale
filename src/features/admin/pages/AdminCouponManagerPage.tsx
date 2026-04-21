import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Loader2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { useAdminPermissions } from '../shared/useAdminPermissions';

type DiscountType = 'percent' | 'fixed';

type CouponRow = {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_until: string | null;
  active: boolean;
  created_at: string;
};

export default function AdminCouponManagerPage() {
  const { isSuperAdmin, hasPermission } = useAdminPermissions();
  const canManage = isSuperAdmin || hasPermission('billing.manage');
  const qc = useQueryClient();

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Manual grant state
  const [grantEmail, setGrantEmail] = useState('');
  const [grantFeature, setGrantFeature] = useState('pro');
  const [grantDays, setGrantDays] = useState('30');
  const [isGranting, setIsGranting] = useState(false);

  // Trial extension
  const [extendEmail, setExtendEmail] = useState('');
  const [extendDays, setExtendDays] = useState('7');
  const [isExtending, setIsExtending] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, discount_type, discount_value, max_uses, uses_count, valid_until, active, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [] as CouponRow[];
      return (data ?? []) as CouponRow[];
    },
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    setCode(
      `OWE-${[...Array(8)].map(() => chars[Math.floor(Math.random() * chars.length)]).join('')}`
    );
  };

  const handleCreateCoupon = async () => {
    if (!code.trim()) { toast.error('Code is required'); return; }
    if (!discountValue || Number(discountValue) <= 0) { toast.error('Enter a valid discount value'); return; }
    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'create_coupon',
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          maxUses: maxUses ? Number(maxUses) : null,
          validUntil: validUntil || null,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast.success(`Coupon ${code.trim().toUpperCase()} created.`);
      setCode(''); setDiscountValue(''); setMaxUses(''); setValidUntil('');
      await qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Failed to create coupon');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!grantEmail.trim()) { toast.error('Email required'); return; }
    setIsGranting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'grant_entitlement_by_email',
          email: grantEmail.trim().toLowerCase(),
          featureKey: grantFeature,
          durationDays: Number(grantDays),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast.success(`${grantDays}-day ${grantFeature} access granted to ${grantEmail}`);
      setGrantEmail('');
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Failed to grant access');
    } finally {
      setIsGranting(false);
    }
  };

  const handleExtendTrial = async () => {
    if (!extendEmail.trim()) { toast.error('Email required'); return; }
    setIsExtending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const { error } = await supabase.functions.invoke('admin-actions', {
        body: {
          action: 'extend_trial',
          email: extendEmail.trim().toLowerCase(),
          additionalDays: Number(extendDays),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast.success(`Trial extended by ${extendDays} days for ${extendEmail}`);
      setExtendEmail('');
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Failed to extend trial');
    } finally {
      setIsExtending(false);
    }
  };

  const toggleCoupon = async (coupon: CouponRow) => {
    if (!canManage) return;
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    await qc.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    toast.success(`Coupon ${coupon.code} ${coupon.active ? 'deactivated' : 'activated'}.`);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-brand-cta" />
          <h1 className="text-lg font-semibold text-content-primary">Coupon & Access Manager</h1>
        </div>
        <p className="mt-1 text-xs text-content-tertiary">
          Create promo codes, manually grant entitlements, and extend user trials.
        </p>
      </header>

      {!canManage ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          You need super-admin or billing.manage permission to use this tool.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Create coupon */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Create Coupon</p>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="OWE-ABCD1234"
              className="focus-app-field flex-1 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs font-mono text-content-primary"
            />
            <button
              type="button"
              onClick={generateCode}
              className="rounded-lg border border-surface-border bg-surface-raised px-2.5 py-2 text-[11px] text-content-secondary"
            >
              Generate
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-content-tertiary">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-content-primary"
              >
                <option value="percent">% off</option>
                <option value="fixed">$ off</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-content-tertiary">Value</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '20' : '5.00'}
                className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-content-tertiary">Max uses (blank = unlimited)</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="—"
                className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wide text-content-tertiary">Expires</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="focus-app-field w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={!canManage || isCreating}
            onClick={() => void handleCreateCoupon()}
            className="interactive-press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-cta px-4 py-2 text-xs font-semibold text-surface-base disabled:opacity-40"
          >
            {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create coupon
          </button>
        </div>

        {/* Grant + Trial */}
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary flex items-center gap-1.5">
              <Gift className="h-3.5 w-3.5" /> Manual access grant
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={grantEmail}
                onChange={(e) => setGrantEmail(e.target.value)}
                placeholder="user@example.com"
                className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
              <select
                value={grantFeature}
                onChange={(e) => setGrantFeature(e.target.value)}
                className="focus-app-field rounded-lg border border-surface-border bg-surface-base px-2 py-2 text-xs text-content-primary"
              >
                <option value="pro">Pro</option>
                <option value="lifetime">Lifetime</option>
                <option value="credit_workshop">Credit Workshop</option>
                <option value="academy">Academy</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(e.target.value)}
                placeholder="Days"
                className="focus-app-field w-24 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
              <button
                type="button"
                disabled={!canManage || isGranting}
                onClick={() => void handleGrantAccess()}
                className="interactive-press flex-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40"
              >
                {isGranting ? 'Granting…' : 'Grant access'}
              </button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">Extend trial</p>
            <div className="flex gap-2">
              <input
                value={extendEmail}
                onChange={(e) => setExtendEmail(e.target.value)}
                placeholder="user@example.com"
                className="focus-app-field flex-1 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
              <input
                type="number"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                placeholder="Days"
                className="focus-app-field w-20 rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs text-content-primary"
              />
              <button
                type="button"
                disabled={!canManage || isExtending}
                onClick={() => void handleExtendTrial()}
                className="interactive-press rounded-lg bg-sky-500/15 border border-sky-500/40 px-3 py-2 text-xs font-semibold text-sky-200 disabled:opacity-40"
              >
                {isExtending ? '…' : '+Days'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon table */}
      <div className="rounded-2xl border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-semibold text-content-primary">Active coupons</h2>
        </div>
        {isLoading ? <p className="p-4 text-xs text-content-muted">Loading coupons…</p> : null}
        {!isLoading && coupons.length === 0 ? <p className="p-4 text-xs text-content-muted">No coupons created yet.</p> : null}
        {!isLoading && coupons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-base text-content-tertiary">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
                  <th className="px-3 py-2 font-medium">Uses</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Toggle</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t border-surface-border/50">
                    <td className="px-3 py-2 font-mono text-content-primary">{c.code}</td>
                    <td className="px-3 py-2 text-content-secondary">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`}
                    </td>
                    <td className="px-3 py-2 text-content-tertiary">
                      {c.uses_count} {c.max_uses ? `/ ${c.max_uses}` : ''}
                    </td>
                    <td className="px-3 py-2 text-content-tertiary">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        c.active
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-surface-border bg-surface-elevated text-content-muted'
                      }`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        disabled={!canManage}
                        onClick={() => void toggleCoupon(c)}
                        className="rounded px-2 py-1 text-[10px] border border-surface-border text-content-tertiary hover:text-content-secondary disabled:opacity-30"
                      >
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
