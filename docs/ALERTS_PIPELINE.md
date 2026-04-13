# Alerts pipeline (planned architecture)

End-to-end path from **Settings → scheduler → delivery**, aligned with current UI (notification toggles) and future backend work.

## Today (client)

- **Settings → Notifications**: toggles for email, push, and “Smart alerts” are stored in **`localStorage`** under `oweable_notification_prefs_v1` (see `src/pages/Settings.tsx`).
- **No server-side jobs** yet send email or push based on these flags.

## Target architecture

### 1. Preferences (source of truth)

| Phase | Storage | Notes |
|-------|---------|--------|
| **Now** | `localStorage` | Per-browser; good for UX continuity. |
| **Next** | `profiles` (or `user_settings`) row in **Supabase** | Same keys as today; RLS so `auth.uid()` only reads/writes own row. |

### 2. Scheduler (single source of truth)

- **Supabase Edge Function** or **pg_cron** invoking a small worker, **daily** (and optionally hourly for “day-of” alerts).
- Input: users who opted in and have relevant data (bills with `dueDate`, subscriptions with `nextBillingDate`, etc.).

### 3. Evaluation

- Load user prefs → skip channel if disabled.
- For **bill reminders** (e.g. 3 days before): query bills where `dueDate − today ∈ {3}` and `status !== 'paid'`.
- For **push** channels: require a registered **Web Push** subscription or mobile device token (future).

### 4. Delivery

| Channel | Mechanism |
|---------|-----------|
| **Email** | Resend / SendGrid / SES from Edge Function with template + unsubscribe link. |
| **Web push** | Service worker + VAPID keys; send from Edge Function. |
| **In-app** | Optional: insert into `notifications` table and poll or Realtime. |

### 5. Idempotency & safety

- Store `notification_sent(id, user_id, bill_id, channel, fire_date)` or use a hash key to avoid duplicate sends.
- Rate-limit per user.

## Mapping: Settings keys → jobs

- `bill-reminders` → cron: upcoming bill digest / N days before due.
- `weekly-summary` → weekly cron: spending + upcoming bills.
- `new-login` → trigger on auth session from new device (Supabase Auth hooks or `auth.audit`).
- `push-reminders` / `push-payments` → day-of and payment-recorded events (when those features exist).
- `sniper-*` / `detonator-*` → subscription price change detection and debt milestone hooks (app or cron reading stored data).

## References

- Repo code: `src/pages/Settings.tsx` (prefs), bill/subscription models in `src/store/useStore.ts`.
