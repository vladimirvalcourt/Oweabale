---
name: a11y
description: Audit and fix accessibility issues — contrast ratios, focus states, keyboard navigation, ARIA labels, and touch targets — to meet WCAG AA standards.
user-invokable: true
args:
  - name: target
    description: The page or component to audit and fix (optional)
    required: false
---

Systematically identify and fix accessibility barriers: color contrast, keyboard navigation, focus management, ARIA semantics, and touch target sizes — ensuring the interface works for all users.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

1. Read the target component/page to understand the current HTML structure and interactive elements.
2. Check what UI component library is used (shadcn/ui, Radix UI, MUI) — these have varying baseline accessibility.
3. Identify the primary user interaction patterns: forms, modals, dropdowns, navigation, data tables?

If unsure about the priority of fixes (legal compliance vs. general improvement), **STOP** and use `AskUserQuestion`. WCAG AA is the standard minimum — AAA is aspirational.

### Use frontend-design skill

Run the `frontend-design` skill for context before proceeding.

---

## Assess Accessibility

### 1. Color Contrast
Check contrast ratios using browser DevTools or an online checker:
- **Normal text** (< 18px regular or < 14px bold): minimum 4.5:1
- **Large text** (≥ 18px regular or ≥ 14px bold): minimum 3:1
- **UI components and graphical elements**: minimum 3:1

Common failures:
- Light gray text on white backgrounds (`text-gray-400` on white = ~3.5:1 — FAIL)
- Muted text in forms, placeholders, captions
- Colored text on colored backgrounds

### 2. Focus Indicators
Every interactive element needs a visible focus ring:
- Is `outline: none` or `outline: 0` set without a replacement?
- Tab through the page — can you see where focus is at all times?
- Tailwind's `focus-visible:ring-2` pattern is correct — check it's applied everywhere

### 3. Keyboard Navigation
Tab through the entire page:
- Can all interactive elements be reached by keyboard?
- Are custom components (dropdowns, modals, date pickers) keyboard-operable?
- Does modal open/close with Enter/Escape? Does focus trap correctly?
- Are skip links present for pages with long nav?

### 4. ARIA Semantics
- Do buttons contain only icons with no visible text? They need `aria-label`.
- Do images have `alt` text? Decorative images need `alt=""`.
- Do form inputs have associated labels (`htmlFor`/`id` or `aria-label`)?
- Do dynamic regions use `aria-live` for screen reader announcements?
- Are `role="button"` used on non-button elements that act as buttons? Use `<button>` instead.

### 5. Touch Targets
- Are all buttons and links at least 44×44px clickable area? (iOS HIG minimum)
- Are tightly packed small icons tapable on mobile?

### 6. Semantic HTML
- Are page landmarks present: `<header>`, `<main>`, `<nav>`, `<footer>`?
- Are headings in logical order (h1 → h2 → h3, never skip levels)?
- Are lists using `<ul>`/`<ol>` not just `<div>` stacks?

---

## Plan Accessibility Fixes

Prioritize by severity:
1. **Critical** (WCAG A): No alt text, no keyboard access, form inputs without labels
2. **Important** (WCAG AA): Contrast failures, missing focus rings, touch targets too small
3. **Enhancement** (WCAG AAA): Better error recovery, skip links, enhanced ARIA

Work through Critical → Important → Enhancement.

---

## Implement

### 1. Fix Contrast
Replace low-contrast text colors:
- `text-gray-400` on white → `text-gray-500` minimum (check in DevTools)
- `text-muted-foreground` should be ≥ 4.5:1 against background — verify the token value
- For placeholder text: `placeholder:text-gray-400` is typically borderline — use `placeholder:text-gray-500`

### 2. Fix Focus Rings
Ensure all interactive elements have visible focus:
```tsx
// Button: ensure ring is visible
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Input
className="... focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

// Link
className="... focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
```
Never use `outline-none` without a `focus-visible:ring-*` replacement.

### 3. Fix Icon-Only Buttons
```tsx
// Wrong
<Button size="icon"><Trash2 /></Button>

// Correct
<Button size="icon" aria-label="Delete post"><Trash2 aria-hidden="true" /></Button>
```

### 4. Fix Image Alt Text
```tsx
// Content image
<img src="..." alt="Description of what the image shows" />

// Decorative image
<img src="..." alt="" role="presentation" />

// Next.js Image
<Image src="..." alt="Description" width={...} height={...} />
```

### 5. Fix Touch Targets
For small interactive elements, add a larger click target without changing visual size:
```tsx
// Increase tap target with padding
<button className="p-2 -m-2">
  <XIcon className="h-4 w-4" />
</button>
```
Or use minimum height/width: `min-h-[44px] min-w-[44px]`.

### 6. Fix Form Accessibility
```tsx
<div className="space-y-1.5">
  <Label htmlFor="name">Full name</Label>
  <Input
    id="name"
    aria-required="true"
    aria-describedby={error ? "name-error" : "name-hint"}
  />
  <p id="name-hint" className="text-xs text-muted-foreground">
    As it appears on your ID
  </p>
  {error && (
    <p id="name-error" role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )}
</div>
```

### 7. Add Semantic Landmarks
Wrap page sections in semantic HTML:
```tsx
<header>...</header>
<nav aria-label="Main navigation">...</nav>
<main>
  <h1>Page title</h1>
  ...
</main>
<footer>...</footer>
```

### 8. Fix Heading Order
Audit heading levels — they must descend logically:
- One `<h1>` per page
- `<h2>` for major sections
- `<h3>` for sub-sections within `<h2>` sections
- Never skip a level (no h1 → h3)

---

## Verify

Before finishing, confirm:

- [ ] All text passes WCAG AA contrast (4.5:1 normal, 3:1 large text)
- [ ] Tab through the page — focus is always visible on interactive elements
- [ ] No `outline-none` without a `focus-visible:ring` replacement
- [ ] All icon-only buttons have `aria-label`
- [ ] All images have `alt` text (or `alt=""` if decorative)
- [ ] All form inputs have associated labels
- [ ] All interactive elements are reachable and operable by keyboard
- [ ] Modals/dialogs trap focus and close with Escape
- [ ] Touch targets are at least 44×44px
- [ ] Semantic landmarks present (`<main>`, `<nav>`, `<header>`, `<footer>`)
- [ ] Heading levels are in logical order, no skipped levels

---

## Anti-patterns

**NEVER** remove focus rings without a replacement — it makes the interface unusable for keyboard users.

**NEVER** use color alone to convey information — always pair color with text or icon.

**NEVER** use `<div>` or `<span>` with `onClick` as a button — use `<button>` which is keyboard-accessible by default.

**NEVER** use placeholder text as a label — it disappears and has insufficient contrast in most browsers.

**NEVER** add `aria-label` to elements that already have visible text — it creates redundant announcements.

**NEVER** use `role="button"` on a `<div>` — just use `<button>` and style it.

**NEVER** make interactive elements smaller than 44×44px on touch interfaces.
