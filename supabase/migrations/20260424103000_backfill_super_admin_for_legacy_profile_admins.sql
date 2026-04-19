-- Legacy admins used profiles.is_admin alone. After RBAC hardening, Edge admin-actions
-- requires a role row; grant super_admin to every profile still marked admin so invokes succeed.

INSERT INTO public.admin_user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.admin_roles r ON r.key = 'super_admin'
WHERE p.is_admin = true
ON CONFLICT (user_id, role_id) DO NOTHING;
