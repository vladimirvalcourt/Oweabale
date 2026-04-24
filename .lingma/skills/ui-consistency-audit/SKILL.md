---
name: ui-consistency-audit
description: >-
  Comprehensive UI consistency auditing skill that detects and fixes spacing, 
  padding, positioning, sizing, typography, color, and layout issues. Ensures 
  design system compliance, proper touch targets, consistent visual hierarchy, 
  and accessibility standards. Use when reviewing UI components, auditing pages, 
  or ensuring design consistency across the application.
domain: frontend-quality
subdomain: ui-audit
tags:
  - ui-consistency
  - spacing
  - typography
  - color-system
  - accessibility
  - design-tokens
  - layout
  - visual-hierarchy
version: "1.0.0"
author: vladimirvalcourt
license: Apache-2.0
---

# Skill: UI Consistency Audit & Fix

## Trigger
Load this skill whenever:
- Auditing UI components for consistency issues
- Reviewing spacing, padding, margins, or layout problems
- Checking typography scale and text hierarchy
- Validating color usage against design tokens
- Ensuring proper touch targets (48dp minimum)
- Detecting hardcoded values instead of design tokens
- Reviewing component sizing and proportions
- Checking responsive layout behavior
- Auditing for visual hierarchy issues
- Before deploying UI changes to production

## Type
**Rigid** — All UI must follow established design system tokens and patterns. Never allow hardcoded spacing, colors, or sizes when tokens exist.

## Instructions

1. **Audit systematically:** Check all six categories (Spacing, Typography, Color, Sizing, Positioning, Accessibility)
2. **Token-first approach:** Flag any hardcoded values that should use design tokens
3. **Fix immediately:** Provide exact code replacements for all issues found
4. **Maintain consistency:** Ensure similar elements use identical patterns
5. **Verify accessibility:** Check contrast ratios, focus states, and touch targets
6. **Document findings:** Create audit report with before/after examples

---

## Part 1: Spacing & Padding Issues

### 1.1 Common Spacing Problems

| Issue | Detection Pattern | Fix |
|-------|------------------|-----|
| Inconsistent padding | Mixed `p-4`, `p-5`, `p-6` in similar cards | Standardize to single value |
| Arbitrary spacing | `mt-[13px]`, `mb-[7px]` | Use Tailwind scale: `mt-3`, `mb-2` |
| Missing spacing | Elements touching without gap | Add `gap-*` or `space-y-*` |
| Excessive spacing | `p-12` on small cards | Reduce to `p-6` or `p-8` |
| Asymmetric padding | `px-4 py-6` vs `px-6 py-4` | Make symmetric or intentional |

### 1.2 Spacing Scale Reference

**Tailwind Spacing Scale:**
```
0 = 0px
1 = 4px
2 = 8px
3 = 12px
4 = 16px
5 = 20px
6 = 24px
7 = 28px
8 = 32px
10 = 40px
12 = 48px
16 = 64px
20 = 80px
24 = 96px
```

**Rules:**
- ✅ Use scale values: `p-4`, `m-6`, `gap-3`
- ❌ Never use arbitrary: `p-[17px]`, `m-[23px]`
- ✅ Card padding: `p-6` (24px) standard, `p-8` for premium
- ✅ Section spacing: `py-16` to `py-24`
- ✅ Component gaps: `gap-4` to `gap-6`

### 1.3 Detection Examples

```tsx
// ❌ BAD: Inconsistent spacing
<Card className="p-4">Content</Card>
<Card className="p-6">Content</Card>
<Card className="p-5">Content</Card>

// ✅ GOOD: Consistent spacing
<Card className="p-6">Content</Card>
<Card className="p-6">Content</Card>
<Card className="p-6">Content</Card>
```

```tsx
// ❌ BAD: Arbitrary values
<div className="mt-[13px] mb-[7px] ml-[19px]">

// ✅ GOOD: Scale values
<div className="mt-3 mb-2 ml-5">
```

---

## Part 2: Typography Issues

### 2.1 Common Typography Problems

| Issue | Detection Pattern | Fix |
|-------|------------------|-----|
| Inconsistent font sizes | `text-[13px]`, `text-[15px]` | Use scale: `text-sm`, `text-base` |
| Wrong weight hierarchy | Body text bold, headings regular | Follow hierarchy specs |
| Missing line height | `text-lg` without leading | Add `leading-relaxed` |
| Inconsistent tracking | Mixed letter-spacing | Standardize per role |
| Wrong case usage | Title Case in buttons | Use sentence case |

### 2.2 Typography Scale

**Font Sizes:**
```
text-xs   = 12px  (labels, captions)
text-sm   = 14px  (body text, buttons)
text-base = 16px  (default body)
text-lg   = 18px  (emphasized body)
text-xl   = 20px  (small headings)
text-2xl  = 24px  (section headings)
text-3xl  = 30px  (page headings)
text-4xl  = 36px  (hero headings)
text-5xl  = 48px  (large hero)
```

**Font Weights:**
```
font-normal  = 400 (body text)
font-medium  = 500 (labels, emphasis)
font-semibold = 600 (headings, buttons)
font-bold    = 700 (strong emphasis)
```

**Line Heights:**
```
leading-tight    = 1.25 (headings)
leading-snug     = 1.375
leading-normal   = 1.5 (body text)
leading-relaxed  = 1.625 (long-form)
leading-loose    = 2 (very spacious)
```

**Letter Spacing:**
```
tracking-tighter  = -0.05em (large display)
tracking-tight    = -0.025em (headings)
tracking-normal   = 0em (body)
tracking-wide     = 0.025em (labels)
tracking-wider    = 0.05em (uppercase labels)
tracking-widest   = 0.1em (micro labels)
```

### 2.3 Text Hierarchy Rules

**Heading Hierarchy:**
```tsx
// Page title
<h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">

// Section heading
<h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">

// Subsection
<h3 className="text-xl font-semibold">

// Card title
<h4 className="text-lg font-semibold">
```

**Body Text:**
```tsx
// Primary body
<p className="text-base leading-relaxed text-content-primary">

// Secondary/muted
<p className="text-sm text-content-secondary">

// Captions/labels
<span className="text-xs uppercase tracking-wider text-content-tertiary">
```

**Buttons & Interactive:**
```tsx
// Button text
<button className="text-sm font-medium">

// Navigation links
<a className="text-sm font-medium">

// Micro labels
<span className="text-xs font-medium uppercase tracking-wider">
```

### 2.4 Sentence Case Rule

**All UI text uses sentence case:**
- ✅ "Save changes", "Create account", "Mark as paid"
- ❌ "Save Changes", "CREATE ACCOUNT", "Mark As Paid"

**Exceptions:**
- Brand names (Oweable)
- Proper nouns
- Acronyms (FAQ, API, URL)

---

## Part 3: Color Issues

### 3.1 Common Color Problems

| Issue | Detection Pattern | Fix |
|-------|------------------|-----|
| Hardcoded hex values | `bg-[#1a1a1a]`, `text-[#ffffff]` | Use tokens: `bg-surface-raised` |
| Inconsistent brand colors | Mixed green shades for profit | Use `text-brand-profit` |
| Poor contrast | Light gray on white | Check WCAG AA (4.5:1) |
| Wrong semantic color | Error state using red-500 | Use `text-brand-expense` |
| Missing dark mode | Only works in one theme | Test both themes |

### 3.2 Color Token System

**Surface Colors:**
```css
surface-base         /* Main background */
surface-raised       /* Cards, panels */
surface-elevated     /* Higher elevation */
surface-highlight    /* Subtle highlights */
surface-border       /* Borders */
surface-border-subtle /* Subtle borders */
```

**Content Colors:**
```css
content-primary      /* Main text */
content-secondary    /* Supporting text */
content-tertiary     /* Labels, hints */
content-muted        /* Disabled text */
```

**Brand Colors:**
```css
brand-indigo         /* Primary accent */
brand-violet         /* Secondary accent */
brand-cta            /* Call-to-action buttons */
brand-profit         /* Positive/income (green) */
brand-expense        /* Negative/expense (red) */
brand-tax            /* Tax-related (gray) */
```

### 3.3 Color Usage Rules

**Text Colors:**
```tsx
// Primary content
<h2 className="text-content-primary">

// Secondary/metadata
<p className="text-content-secondary">

// Labels/hints
<span className="text-content-tertiary">

// Status indicators
<span className="text-brand-profit">+ $1,234</span>
<span className="text-brand-expense">- $567</span>
```

**Background Colors:**
```tsx
// Page background
<div className="bg-surface-base">

// Cards/containers
<div className="bg-surface-raised">

// Elevated surfaces
<div className="bg-surface-elevated">

// Subtle highlights
<div className="bg-surface-highlight">
```

**Border Colors:**
```tsx
// Standard borders
<div className="border border-surface-border">

// Subtle borders
<div className="border border-surface-border-subtle">
```

### 3.4 Contrast Requirements

**WCAG AA Standards:**
- Normal text (< 18px): 4.5:1 minimum ratio
- Large text (≥ 18px): 3:1 minimum ratio
- UI components: 3:1 minimum ratio

**Check with:**
```bash
# Use browser devtools or online tools
# Current system has WCAG adjustments in index.css
```

---

## Part 4: Sizing & Dimensions

### 4.1 Common Sizing Problems

| Issue | Detection Pattern | Fix |
|-------|------------------|-----|
| Touch targets < 48px | `h-9 w-9` (36px) | Change to `h-12 w-12` (48px) |
| Inconsistent button heights | Mixed `h-10`, `h-11`, `h-12` | Standardize to scale |
| Fixed widths breaking responsive | `w-[350px]` | Use `max-w-md` or percentages |
| Images without aspect ratio | `<img>` without constraints | Add `aspect-video` or explicit size |
| Icons too small/large | `h-3 w-3` or `h-8 w-8` | Use standard: 16/18/20/24px |

### 4.2 Touch Target Standards

**Minimum 48×48dp for ALL interactive elements:**

```tsx
// ❌ BAD: Too small
<button className="h-9 w-9">Icon</button>  // 36px

// ✅ GOOD: Meets minimum
<button className="h-12 w-12">Icon</button>  // 48px

// ✅ GOOD: With invisible padding
<button className="h-8 w-8 p-2">  // Visual 32px, touch 48px
  <Icon className="h-4 w-4" />
</button>
```

**Button Height Scale:**
```tsx
btn-sm  = 40px  (compact buttons)
btn-md  = 48px  (standard buttons) ← RECOMMENDED
btn-lg  = 56px  (prominent CTAs)
```

### 4.3 Icon Size Standards

```tsx
// Small icons (badges, inline)
<Icon className="h-4 w-4" />  // 16px

// Medium icons (buttons, navigation)
<Icon className="h-5 w-5" />  // 20px

// Large icons (feature sections)
<Icon className="h-6 w-6" />  // 24px

// Extra large (hero sections)
<Icon className="h-8 w-8" />  // 32px
```

### 4.4 Container Widths

**Responsive Max Widths:**
```tsx
// Narrow content
<div className="max-w-2xl">  // 672px

// Standard content
<div className="max-w-4xl">  // 896px

// Wide content
<div className="max-w-6xl">  // 1152px

// Full width with padding
<div className="max-w-7xl mx-auto px-6">  // 1280px
```

---

## Part 5: Positioning & Layout

### 5.1 Common Positioning Problems

| Issue | Detection Pattern | Fix |
|-------|------------------|-----|
| Absolute without relative parent | `absolute` floating | Add `relative` to parent |
| Z-index chaos | `z-[9999]`, `z-[100]` | Use scale: `z-10`, `z-50` |
| Overlapping elements | Content hidden behind others | Adjust z-index or structure |
| Fixed positioning issues | `fixed` covering content | Add proper offsets |
| Flex/Grid misalignment | Items not aligned | Add `items-center`, `justify-between` |

### 5.2 Z-Index Scale

```tsx
z-0    = 0     (default)
z-10   = 10    (dropdowns, tooltips)
z-20   = 20    (modals)
z-30   = 30    (navigation)
z-40   = 40    (overlays)
z-50   = 50    (toast notifications)

// ❌ NEVER use arbitrary: z-[999], z-[10000]
```

### 5.3 Flexbox Patterns

**Common Layouts:**
```tsx
// Centered content
<div className="flex items-center justify-center">

// Space between
<div className="flex items-center justify-between">

// Vertical stack with gap
<div className="flex flex-col gap-4">

// Horizontal row with wrap
<div className="flex flex-wrap gap-3">

// Sticky header
<header className="sticky top-0 z-30">
```

### 5.4 Grid Patterns

**Responsive Grids:**
```tsx
// Auto-fit grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

// Fixed columns
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-12 lg:col-span-8">Main</div>
  <div className="col-span-12 lg:col-span-4">Sidebar</div>
</div>
```

---

## Part 6: Accessibility Issues

### 6.1 Critical Accessibility Checks

| Check | Requirement | How to Verify |
|-------|------------|---------------|
| Touch targets | ≥ 48×48px | Measure button/link dimensions |
| Focus rings | Visible on all interactive | Tab through page |
| Color contrast | 4.5:1 normal, 3:1 large | Use contrast checker |
| Alt text | All images have alt | Check `<img>` tags |
| ARIA labels | Icon-only buttons | Verify `aria-label` |
| Heading hierarchy | h1 → h2 → h3 order | Check heading levels |
| Form labels | All inputs labeled | Check `<label>` or `aria-label` |

### 6.2 Focus Ring Standards

**All interactive elements must have visible focus:**

```tsx
// Standard focus ring
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2"

// Applied to:
- Buttons
- Links
- Input fields
- Select dropdowns
- Checkboxes/radios
- Custom interactive elements
```

### 6.3 ARIA Label Requirements

**Icon-only buttons MUST have aria-label:**

```tsx
// ❌ BAD: No label
<button><X className="h-5 w-5" /></button>

// ✅ GOOD: With label
<button aria-label="Close dialog"><X className="h-5 w-5" /></button>

// ✅ GOOD: With title (tooltip)
<button aria-label="Delete item" title="Delete"><Trash /></button>
```

---

## Part 7: Audit Workflow

### Step 1: Scan for Hardcoded Values

```bash
# Search for arbitrary values
grep -r "h-\[" src/components/
grep -r "w-\[" src/components/
grep -r "p-\[" src/components/
grep -r "m-\[" src/components/
grep -r "text-\[" src/components/
grep -r "bg-\[#\|text-\[#\|border-\[#" src/
```

### Step 2: Check Touch Targets

```tsx
// Look for interactive elements < 48px
// Pattern: h-9 (36px), h-10 (40px), h-11 (44px)
// Fix: Change to h-12 (48px) or add padding
```

### Step 3: Verify Color Tokens

```tsx
// Find hardcoded colors
// Pattern: bg-[#...], text-[#...], border-[#...]
// Replace with: bg-surface-*, text-content-*, etc.
```

### Step 4: Review Typography

```tsx
// Check for inconsistent text sizes
// Pattern: text-[13px], text-[15px], text-[17px]
// Replace with: text-xs, text-sm, text-base, text-lg
```

### Step 5: Test Responsiveness

```tsx
// Verify layouts work at breakpoints:
// - Mobile: < 640px
// - Tablet: 640px - 1024px
// - Desktop: > 1024px
```

---

## Part 8: Quick Fix Patterns

### 8.1 Spacing Fixes

```tsx
// Before: Inconsistent padding
<Card className="p-4">...</Card>
<Card className="p-6">...</Card>

// After: Consistent
<Card className="p-6">...</Card>
<Card className="p-6">...</Card>
```

### 8.2 Typography Fixes

```tsx
// Before: Arbitrary sizes
<h2 className="text-[22px] font-[600]">Title</h2>
<p className="text-[15px]">Body text</p>

// After: Scale values
<h2 className="text-2xl font-semibold">Title</h2>
<p className="text-sm">Body text</p>
```

### 8.3 Color Fixes

```tsx
// Before: Hardcoded colors
<div className="bg-[#0a0a0a] text-[#ffffff] border-[#333333]">

// After: Design tokens
<div className="bg-surface-raised text-content-primary border-surface-border">
```

### 8.4 Touch Target Fixes

```tsx
// Before: Too small
<button className="h-9 w-9"><Icon /></button>

// After: Proper size
<button className="h-12 w-12"><Icon className="h-5 w-5" /></button>
```

---

## Part 9: Verification Checklist

Before declaring UI consistent, verify:

### Spacing & Layout
- [ ] No arbitrary spacing values (`-[13px]`)
- [ ] Consistent padding in similar components
- [ ] Proper gaps between elements
- [ ] Responsive layouts work at all breakpoints

### Typography
- [ ] Font sizes use scale (not arbitrary)
- [ ] Heading hierarchy is correct (h1 → h2 → h3)
- [ ] Line heights are appropriate
- [ ] Sentence case used throughout

### Color
- [ ] No hardcoded hex values
- [ ] Using semantic color tokens
- [ ] Contrast ratios meet WCAG AA
- [ ] Both light/dark modes tested

### Sizing
- [ ] All touch targets ≥ 48×48px
- [ ] Button heights consistent
- [ ] Icon sizes follow standards (16/20/24px)
- [ ] Images have proper aspect ratios

### Positioning
- [ ] Z-index uses scale (not arbitrary)
- [ ] No unexpected overlaps
- [ ] Absolute positioning has relative parent
- [ ] Sticky/fixed elements don't cover content

### Accessibility
- [ ] Focus rings visible on all interactive elements
- [ ] ARIA labels on icon-only buttons
- [ ] Alt text on all images
- [ ] Form inputs have labels
- [ ] Keyboard navigation works

---

## Part 10: Common Issues Database

### Issue: Pill/Toggle Too Wide

**Detection:** Segmented controls or toggle pills with excessive padding

**Example:**
```tsx
// ❌ BAD: Too wide
<div className="p-1">
  <button className="px-4 py-2">Monthly</button>
  <button className="px-4 py-2">Yearly</button>
</div>

// ✅ GOOD: Compact
<div className="p-0.5">
  <button className="px-3 py-1.5 text-xs">Monthly</button>
  <button className="px-3 py-1.5 text-xs">Yearly</button>
</div>
```

**Fix:**
- Reduce container padding: `p-1` → `p-0.5`
- Reduce button padding: `px-4 py-2` → `px-3 py-1.5`
- Reduce font size: `text-sm` → `text-xs`
- Add focus rings for accessibility

### Issue: Card Border Radius Inconsistency

**Detection:** Mixed border radius values in similar cards

**Example:**
```tsx
// ❌ BAD: Inconsistent
<Card className="rounded-md">...</Card>      // 8px
<Card className="rounded-lg">...</Card>      // 12px
<Card className="rounded-[10px]">...</Card>  // 10px arbitrary

// ✅ GOOD: Consistent
<Card className="rounded-md">...</Card>
<Card className="rounded-md">...</Card>
<Card className="rounded-md">...</Card>
```

**Fix:** Standardize to `rounded-md` (8px) for cards

### Issue: Navigation Link Touch Targets

**Detection:** Nav links with insufficient hit area

**Example:**
```tsx
// ❌ BAD: Small touch target
<NavLink className="px-2 py-1">Link</NavLink>  // ~28px height

// ✅ GOOD: Adequate touch target
<NavLink className="min-h-[48px] px-2 py-1">Link</NavLink>
```

**Fix:** Add `min-h-[48px]` to ensure 48dp minimum

---

## Usage Examples

### Example 1: Audit a Component

```tsx
// User asks: "Audit this card component"

<Card className="p-5 bg-[#1a1a1a] rounded-[10px]">
  <h3 className="text-[18px] font-bold">Title</h3>
  <p className="text-[14px] mt-[13px]">Description</p>
  <button className="h-9 px-3 mt-4">Action</button>
</Card>

// AI Response: Found 5 issues
// 1. ❌ Arbitrary padding: p-5 → p-6
// 2. ❌ Hardcoded color: bg-[#1a1a1a] → bg-surface-raised
// 3. ❌ Arbitrary radius: rounded-[10px] → rounded-md
// 4. ❌ Arbitrary font size: text-[18px] → text-lg
// 5. ❌ Touch target too small: h-9 → h-12

// Fixed version provided
```

### Example 2: Check Page Consistency

```tsx
// User asks: "Check Pricing page for consistency issues"

// AI scans entire file and reports:
// - Toggle pill too wide (px-4 py-2 → px-3 py-1.5)
// - Missing focus rings on buttons
// - Inconsistent card padding (p-7 vs p-8)
// - Provides exact fixes for each issue
```

### Example 3: Validate New Component

```tsx
// User asks: "Validate this new button component"

<Button className="bg-blue-500 text-white px-6 py-3 rounded">

// AI Response: Issues found
// 1. ❌ Not using design token: bg-blue-500 → bg-brand-cta
// 2. ❌ Not using design token: text-white → text-surface-base
// 3. ⚠️ Padding slightly large: px-6 py-3 → px-5 py-2.5
// 4. ❌ Missing focus ring
// 5. ❌ Border radius inconsistent: rounded → rounded-full

// Fixed version provided with all corrections
```

---

## Integration with Existing Skills

This skill complements:
- **material-design-3-ui-system**: For M3-specific compliance
- **a11y**: For deeper accessibility audits
- **frontend-design**: For overall design quality
- **polish**: For final refinement passes

Use this skill for quick consistency checks before applying M3 or detailed a11y audits.

---

## Summary

This skill provides a systematic approach to detecting and fixing UI consistency issues across six critical areas:

1. **Spacing & Padding** - Eliminate arbitrary values, ensure consistency
2. **Typography** - Enforce type scale, proper hierarchy, sentence case
3. **Color** - Use design tokens, maintain contrast, support themes
4. **Sizing** - Meet 48dp touch targets, standardize buttons/icons
5. **Positioning** - Proper z-index, flex/grid patterns, no overlaps
6. **Accessibility** - Focus rings, ARIA labels, keyboard navigation

**Key Principle:** Always use design tokens over hardcoded values. Maintain consistency across similar components. Ensure accessibility for all users.
