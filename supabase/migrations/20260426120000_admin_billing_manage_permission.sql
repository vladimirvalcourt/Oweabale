-- Allow support/ops to manage product access and Stripe-assisted actions without full super-admin.
-- Super admins still bypass via isSuperAdmin in admin-actions requirePermission().

INSERT INTO public.admin_permissions (key, label)
VALUES (
  'billing.manage',
  'Manage billing access: Full Suite grants, coupons, and subscription trials'
)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE p.key = 'billing.manage'
  AND r.key IN ('super_admin', 'support_agent', 'developer_ops')
ON CONFLICT DO NOTHING;
