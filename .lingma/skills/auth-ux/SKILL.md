---
name: auth-ux
description: Design and improve authentication flows — login, signup, password reset, and magic link — with clear error states, trust signals, and minimal friction.
user-invokable: true
args:
  - name: target
    description: The auth page or flow to improve (optional — login, signup, reset)
    required: false
---

Audit and improve authentication experiences — login, signup, email verification, and password reset flows — to minimize friction, maximize trust, and handle all error states gracefully.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

1. Read the existing auth pages (`app/login`, `app/signup`, `app/auth`, etc.)
2. What auth provider is used? (Supabase, NextAuth, Clerk, custom JWT?)
3. What auth methods are supported? (Email/password, magic link, Google OAuth, etc.)
4. Is there email verification required after signup?

If the auth stack is unknown, **STOP** and check with `AskUserQuestion` — auth errors can lock users out entirely.

### Use frontend-design skill

Run the `frontend-design` skill before proceeding.

---

## Assess Auth UX Quality

1. **Login form**:
   - Is autofill supported? (Don't `autocomplete="off"` unless required by security policy)
   - Does "Sign in with Google" stand out if available?
   - Is there a "Show password" toggle?
   - Is "Forgot password?" link immediately visible?

2. **Signup form**:
   - Is the minimum required? (Email + password, not 10 fields)
   - Is password strength indicated?
   - Are password requirements shown before submission?

3. **Error states**:
   - Are login errors specific but not a security leak? (Don't say "Email not found" — says "Invalid email or password")
   - Are network errors handled?

4. **Loading states**: Does the button show a loading state while auth is in progress?

5. **Post-auth flow**: Where do users land after login/signup? Is it the right place?

6. **Password reset**: Is the flow clear? Does the email arrive promptly? Is the reset link expiry communicated?

7. **Trust**: Does the page feel secure? Any trust signals (padlock, "We never share your data")?

---

## Plan Auth Strategy

**Login page layout:**
- Social auth buttons (Google, GitHub) at top if available
- Divider "or continue with email"
- Email + password form
- Forgot password link
- Sign up link at bottom

**Signup page layout:**
- Social auth at top
- Minimal fields (email + password only to start)
- Password requirements visible
- Terms acknowledgment
- Sign in link at bottom

**Error message strategy:**
- Invalid credentials: "Invalid email or password" (never specify which is wrong)
- Email already exists: "An account with this email already exists. Sign in instead."
- Weak password: Show inline requirements
- Network error: "Something went wrong. Please try again."
- Rate limited: "Too many attempts. Please wait a moment."

---

## Implement

### 1. Login Page
```tsx
<div className="min-h-screen flex items-center justify-center p-4">
  <div className="w-full max-w-sm space-y-6">
    <div className="text-center">
      <Logo className="h-8 mx-auto mb-4" />
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
    </div>

    {/* Social auth */}
    <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
      <GoogleIcon className="mr-2 h-4 w-4" />
      Continue with Google
    </Button>

    <div className="relative">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-background px-2">or</span></div>
    </div>

    <form onSubmit={handleSignIn} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="password">Password</Label>
          <Link href="/auth/reset-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" required />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in"}
      </Button>
    </form>

    <p className="text-center text-sm text-muted-foreground">
      Don't have an account?{" "}
      <Link href="/signup" className="text-foreground font-medium hover:underline">Sign up</Link>
    </p>
  </div>
</div>
```

### 2. Password Input with Show/Hide
```tsx
function PasswordInput({ ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
```

### 3. Password Strength Indicator
```tsx
function PasswordStrength({ password }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains uppercase", pass: /[A-Z]/.test(password) },
  ]
  return (
    <ul className="space-y-1 mt-2">
      {checks.map(check => (
        <li key={check.label} className={cn("text-xs flex items-center gap-1.5", check.pass ? "text-emerald-600" : "text-muted-foreground")}>
          {check.pass ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
          {check.label}
        </li>
      ))}
    </ul>
  )
}
```

### 4. Password Reset Flow
**Step 1** — Request reset: Email input + "Send reset link" button
**Step 2** — Confirmation: "Check your inbox — we sent a reset link to [email]"
**Step 3** — Reset form: New password + confirm password + strength indicator
**Step 4** — Success: "Password updated. Sign in with your new password." + link to login

---

## Verify

- [ ] `autocomplete` attributes set correctly on all inputs (email, password, new-password)
- [ ] Password has a show/hide toggle
- [ ] "Forgot password?" link is visible on the login form (not hidden after scroll)
- [ ] Error messages are helpful but don't reveal whether email exists
- [ ] Button shows loading state and is disabled during auth request
- [ ] Social auth buttons are prominent if available
- [ ] Successful login redirects to the correct post-auth destination
- [ ] Password reset email includes clear expiry time
- [ ] Works on mobile — full-width inputs, large buttons

---

## Anti-patterns

**NEVER** say "Email not found" — it confirms which emails have accounts (security leak).

**NEVER** use `autocomplete="off"` — it prevents password managers from working (which are more secure).

**NEVER** show password requirements only after a failed submission — show them inline as the user types.

**NEVER** redirect to the homepage after login — redirect to the intended destination (or dashboard).

**NEVER** make the forgot password link hard to find — it must be visible on the login form.
