# Material Design 3 (M3) Compliance Audit Report

**Date:** 2026-04-23  
**Auditor:** AI Assistant with M3 Skill  
**Scope:** Full website audit - all pages and components  
**Status:** ⚠️ **PARTIAL COMPLIANCE** - Significant gaps identified  

---

## Executive Summary

The Owebale application currently uses a **custom Vercel-inspired design system** rather than Material Design 3. While the existing system is well-implemented with proper token architecture, dual-mode theming, and accessibility considerations, it does **not follow M3 specifications**.

### Key Findings:
- ✅ **Token Architecture**: Excellent semantic token system (similar to M3 principles)
- ❌ **Color System**: Custom palette, not M3 tonal palettes or semantic roles
- ❌ **Typography**: Custom type scale, not M3's 15-role type scale
- ❌ **Shape System**: Inconsistent corner radii, not M3 shape tokens
- ❌ **Elevation**: Custom shadows, not M3 elevation levels
- ❌ **Interaction States**: No state layer overlay system
- ❌ **Touch Targets**: Not consistently 48×48dp minimum
- ❌ **Motion**: Custom animations, not M3 easing curves/durations
- ❌ **Components**: Custom component specs, not M3 exact measurements
- ⚠️ **Accessibility**: Good contrast ratios, but missing focus ring specs

---

## Detailed Audit by M3 Category

### 1. Design Token Architecture ❌ PARTIAL

#### Current State:
```css
/* Current: Custom 3-tier-like system */
--color-surface-base: #000000;
--color-content-primary: #ffffff;
--color-brand-profit: #22c55e;
```

#### M3 Requirement:
```css
/* M3 Expected: Three-tier hierarchy */
md.ref.palette.primary40 → md.sys.color.primary → md.comp.button.container.color
```

#### Issues:
- ✅ Has semantic naming (`surface-*`, `content-*`)
- ✅ Avoids hardcoded hex values in components
- ❌ Missing three-tier structure (Reference → System → Component)
- ❌ No `md.` namespace prefix
- ❌ No tonal palette generation (13 tones per key color)

#### Recommendation:
**Low Priority** - Current system works well. Migration to M3 tokens would be a complete redesign.

---

### 2. Color System ❌ NON-COMPLIANT

#### Current State:
- 7 surface colors (base, raised, elevated, highlight, border, border-subtle, offset)
- 4 content colors (primary, secondary, tertiary, muted)
- 7 brand colors (indigo, violet, cta, cta-hover, profit, expense, tax)
- 7 theme variants (default, terminal, solar, nordic, crimson, ghost, neon)

#### M3 Requirement:
- 5 key colors (Primary, Secondary, Tertiary, Error, Neutral)
- 30+ semantic color roles per scheme
- Light AND dark ColorScheme objects
- Dynamic color support (Android 12+)
- Tonal palettes with 13 tones each

#### Issues:
- ❌ No Primary/Secondary/Tertiary distinction
- ❌ No `onPrimary`, `primaryContainer`, `onPrimaryContainer` roles
- ❌ No Error/ErrorContainer color roles
- ❌ No surface tint overlays for dark mode elevation
- ❌ No dynamic color algorithm integration
- ❌ Missing 15+ required semantic roles

#### Critical Missing Roles:
```typescript
// M3 Required (Current app lacks):
primary, onPrimary, primaryContainer, onPrimaryContainer
secondary, onSecondary, secondaryContainer, onSecondaryContainer
tertiary, onTertiary, tertiaryContainer, onTertiaryContainer
error, onError, errorContainer, onErrorContainer
surfaceVariant, onSurfaceVariant
surfaceDim, surfaceBright
surfaceContainerLowest/Low/High/Highest
inverseSurface, inverseOnSurface, inversePrimary
outline, outlineVariant, scrim, shadow
```

#### Recommendation:
**HIGH PRIORITY IF MIGRATING TO M3** - Complete color system rebuild required.

---

### 3. Typography ❌ NON-COMPLIANT

#### Current State:
```css
/* Geist Sans + Geist Mono */
font-size: var(--text-ui-body); /* 0.875rem = 14px */
line-height: var(--leading-ui-body); /* 1.5 */
letter-spacing: -0.006em;
```

#### M3 Requirement:
15 specific type scale roles with exact specs:

| Role | Size | Weight | Line Height | Tracking |
|------|------|--------|-------------|----------|
| Display Large | 57sp | 400 | 64sp | -0.25 |
| Headline Small | 24sp | 400 | 32sp | 0 |
| Title Large | 22sp | 400 | 28sp | 0 |
| Body Large | 16sp | 400 | 24sp | +0.5 |
| Label Large | 14sp | 500 | 20sp | +0.1 |
| ... (10 more) | | | | |

#### Issues:
- ❌ No Display/Headline/Title/Body/Label role distinctions
- ❌ Missing 10 of 15 required type roles
- ❌ Incorrect tracking values (M3 uses specific letter-spacing)
- ❌ No weight differentiation per role (all use 400 or 600)
- ❌ No sp (scalable pixels) unit consideration

#### Current Usage Patterns:
```tsx
// Current: Ad-hoc sizing
className="text-[11px] font-medium uppercase tracking-[0.15em]"
className="text-lg font-semibold tracking-[-0.03em]"
className="text-sm leading-7"

// M3 Expected: Semantic roles
className="md-typescale-label-large"
className="md-typescale-headline-small"
className="md-typescale-body-medium"
```

#### Recommendation:
**MEDIUM PRIORITY** - Define M3 type scale tokens if migrating.

---

### 4. Shape System ❌ NON-COMPLIANT

#### Current State:
```css
--radius-container: 16px;
--radius-card: 12px;
--radius-button: 10px;
--radius-icon: 8px;
--radius-badge: 9999px;
--radius-input: 8px;
```

#### M3 Requirement:
7 shape tokens with exact values:

| Token | Radius | Use Case |
|-------|--------|----------|
| `shape.corner.none` | 0dp | Full-bleed images |
| `shape.corner.extraSmall` | 4dp | Tooltips, chips, snackbars |
| `shape.corner.small` | 8dp | Menus, text fields |
| `shape.corner.medium` | 12dp | Cards, outlined inputs |
| `shape.corner.large` | 16dp | Navigation drawers |
| `shape.corner.extraLarge` | 28dp | Bottom sheets, large FABs |
| `shape.corner.full` | 50% | Buttons, FABs, avatars |

#### Issues:
- ❌ Button radius: 10px (current) vs 50%/full (M3)
- ❌ Card radius: 12px ✅ matches M3 medium
- ❌ Input radius: 8px ✅ matches M3 small
- ❌ Missing extraSmall (4dp), extraLarge (28dp), none (0dp)
- ❌ No shape morphing animations (M3 Expressive feature)

#### Specific Violations:
```tsx
// Current: rounded-full (50%) used inconsistently
className="rounded-full bg-brand-cta" // Header CTA button

// M3: Should use shape.corner.full for ALL buttons
className="md-shape-full bg-primary"
```

#### Recommendation:
**LOW PRIORITY** - Current system is consistent. Only fix if full M3 migration.

---

### 5. Elevation System ❌ NON-COMPLIANT

#### Current State:
```css
--shadow-tactile: 0 1px 0 rgba(255, 255, 255, 0.06);
--shadow-tactile-hover: 0 1px 0 rgba(255, 255, 255, 0.1);
--shadow-glow-indigo: 0 0 0 1px rgba(255, 255, 255, 0.08);
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), ...;
```

#### M3 Requirement:
6 elevation levels with dual-shadow construction:

| Level | dp | Use Case |
|-------|----|----------|
| level0 | 0dp | Flat surfaces |
| level1 | 1dp | Cards (resting) |
| level2 | 3dp | FAB (resting) |
| level3 | 6dp | Dialogs |
| level4 | 8dp | Navigation drawers |
| level5 | 12dp | Full-screen dialogs |

**Dark Mode:** Surface tint overlays instead of shadows (5-14% opacity)

#### Issues:
- ❌ No standardized elevation levels (level0-level5)
- ❌ No dual-shadow construction (key + ambient)
- ❌ No surface tint overlay system for dark mode
- ❌ Custom shadow values throughout codebase
- ❌ Elevation not tied to component states

#### Examples:
```tsx
// Current: Arbitrary shadows
className="shadow-sm"
className="shadow-stripe-dark"
style={{ boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)' }}

// M3 Expected: Semantic elevation
className="md-elevation-level1" // Card resting
className="md-elevation-level2 hover:md-elevation-level3" // FAB
```

#### Recommendation:
**MEDIUM PRIORITY** - Define elevation tokens for consistency.

---

### 6. Interaction States ❌ CRITICAL VIOLATION

#### Current State:
```tsx
// Hover states via custom classes
className="hover:bg-surface-elevated hover:text-content-primary"
className="hover:-translate-y-0.5"

// Active states
className="active:translate-y-[1px] active:scale-[0.995]"
```

#### M3 Requirement:
State layer overlay system with specific opacities:

| State | Opacity | Implementation |
|-------|---------|----------------|
| Hover | 8% | Overlay with `onSurface` color |
| Focus | 10% | Overlay + visible focus ring |
| Pressed | 10% | Overlay with `onSurface` color |
| Dragged | 16% | Overlay with `onSurface` color |
| Disabled (container) | 12% | Overlay with `onSurface` |
| Disabled (content) | 38% | Reduced opacity |

**Rule:** Never use custom hex values for states - always use state layer pattern.

#### Issues:
- ❌ NO state layer overlay system implemented
- ❌ Hover states use background color changes (violates M3)
- ❌ Pressed states use transforms (violates M3)
- ❌ No disabled state standardization
- ❌ Focus rings inconsistent (some have, some don't)

#### Critical Violation Example:
```tsx
// ❌ WRONG (Current): Custom hover background
<button className="bg-surface-raised hover:bg-surface-elevated">
  Click me
</button>

// ✅ CORRECT (M3): State layer overlay
<button className="bg-surface-raised relative overflow-hidden">
  <span className="absolute inset-0 bg-onSurface opacity-0 hover:opacity-8" />
  Click me
</button>
```

#### Recommendation:
**CRITICAL IF MIGRATING TO M3** - Requires complete interaction refactor.

---

### 7. Touch Targets ❌ NON-COMPLIANT

#### Current State:
```tsx
// Various button heights
className="h-9 w-9" // ThemeToggle: 36px ❌
className="py-2.5 px-5" // Header CTA: ~40px height ⚠️
className="btn-md" // 48px ✅ (defined in CSS)
```

#### M3 Requirement:
**Minimum 48×48dp** for ALL interactive elements.

#### Issues Found:
- ❌ ThemeToggle: 36px × 36px (below 48dp minimum)
- ⚠️ Many buttons: ~40px height (below 48dp)
- ✅ Some buttons use `btn-md` class (48px)
- ❌ No invisible padding compensation for smaller visual elements
- ❌ Icon-only buttons often below 48dp

#### Specific Violations:
```tsx
// ❌ ThemeToggle: 36px
className="h-9 w-9" // 9 * 4px = 36px

// ❌ Navigation links: likely <48px tap target
<NavLink className="px-2 py-1" /> // ~28px height

// ✅ Proper size (rare)
<button className="btn-md" /> // 48px defined in CSS
```

#### Recommendation:
**HIGH PRIORITY** - Accessibility issue. Fix immediately regardless of M3 migration.

---

### 8. Motion & Transitions ❌ NON-COMPLIANT

#### Current State:
```tsx
// Framer Motion custom animations
transition={{ type: 'spring', stiffness: 300, damping: 24 }}
transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}

// CSS transitions
className="transition-all duration-300 ease-out"
className="transition-colors duration-200"
```

#### M3 Requirement:
Specific easing curves and duration tokens:

**Easing Curves:**
- Emphasized: `cubic-bezier(0.2, 0, 0, 1.0)`
- Standard: `cubic-bezier(0.2, 0, 0, 1.0)`
- Emphasized Decelerate: `cubic-bezier(0.05, 0.7, 0.1, 1.0)`

**Duration Tokens:**
- short2: 100ms (fade in/out)
- medium2: 300ms (most enter transitions)
- long1: 450ms (dialogs opening)

**Transition Patterns:**
- Container Transform, Shared Axis, Fade Through, Fade

#### Issues:
- ❌ Custom spring configs (stiffness: 300, damping: 24)
- ❌ Custom bezier curves `[0.22, 1, 0.36, 1]`
- ❌ No standardized duration tokens
- ❌ No transition pattern implementation
- ✅ Respects `prefers-reduced-motion` in CSS
- ❌ No M3 Expressive spring physics system

#### Examples:
```tsx
// ❌ Current: Custom spring
motion.div({
  transition: { type: 'spring', stiffness: 300, damping: 24 }
})

// ✅ M3 Expected: Standard easing
motion.div({
  transition: { 
    duration: 0.3, // medium2
    ease: [0.2, 0, 0, 1.0] // emphasized
  }
})
```

#### Recommendation:
**LOW PRIORITY** - Current motion system works well. Only change for full M3 compliance.

---

### 9. Components - Exact Specs ❌ MAJOR GAPS

#### 9.1 Buttons

**Current State:**
```tsx
// Various button styles
className="rounded-full bg-brand-cta px-5 py-2.5"
className="btn-md radius-button" // 48px height, 10px radius
```

**M3 Requirements:**
- Shape: `shape.corner.full` (50% radius) for ALL buttons
- 5 sizes: Extra Small (32dp), Small (36dp), Medium (40dp), Large (48dp), Extra Large (56dp)
- 5 variants: Filled, Filled Tonal, Elevated, Outlined, Text
- State layers for interactions

**Issues:**
- ❌ Mixed border radii (full, button=10px, lg=8px)
- ❌ No standardized size system
- ❌ No variant classification
- ❌ Missing filled tonal, elevated variants

#### 9.2 Cards

**Current State:**
```tsx
className="rounded-md border border-surface-border bg-surface-raised p-6"
```

**M3 Requirements:**
- Shape: `shape.corner.medium` (12dp) ✅ MATCHES
- 3 variants: Elevated (level1), Filled, Outlined
- Padding: 16dp internal ✅ CLOSE (p-6 = 24px)
- Touch targets: 48dp minimum for interactive areas

**Issues:**
- ⚠️ Padding slightly larger than spec (24px vs 16dp)
- ❌ No variant classification system
- ❌ Interactive areas not guaranteed 48dp

#### 9.3 Navigation

**Current State:**
- Sidebar navigation with collapsible groups
- Bottom nav not present (desktop-first app)
- Icons: 24px Lucide icons

**M3 Requirements:**
- Window Size Class determines nav paradigm:
  - Compact (<600dp): Bottom Navigation Bar
  - Medium (600-839dp): Navigation Rail
  - Expanded (840dp+): Navigation Drawer
- Nav bar height: 80dp
- Nav item height: 56dp
- Icon size: 24dp ✅ MATCHES

**Issues:**
- ❌ No window size class detection
- ❌ No adaptive navigation paradigm
- ❌ Nav items may not meet 56dp height requirement
- ❌ No active indicator spec (should be secondaryContainer)

#### 9.4 Text Fields

**Current State:**
```tsx
<input className="rounded-md border border-surface-border bg-surface-raised px-4 py-2" />
```

**M3 Requirements:**
- Height: 56dp
- Horizontal padding: 16dp
- Shape: `shape.corner.extraSmall` (4dp) top corners only (filled)
- Label: Label Small (12sp) when floating
- Input text: Body Large (16sp)

**Issues:**
- ❌ Height likely <56dp (py-2 = 8px padding, not total height)
- ❌ Shape: rounded-md (8px) vs extraSmall (4dp)
- ❌ No floating label implementation
- ❌ No active indicator color change on focus

#### 9.5 FAB (Floating Action Button)

**Current State:**
- No FAB detected in current implementation

**M3 Requirements:**
- Standard size: 56dp container, 24dp icon
- Shape: `shape.corner.large` (16dp)
- Container: primaryContainer
- Elevation: Level 3 resting, Level 4 hover

**Issues:**
- ℹ️ Not applicable (no FAB in current design)

---

### 10. Iconography ⚠️ PARTIAL COMPLIANCE

#### Current State:
- Lucide React icons (outlined style)
- Icon sizes: 16px, 18px, 20px, 24px (varies by context)
- Consistent stroke width: 1.5px (set in CSS)

#### M3 Requirement:
Material Symbols variable font with 4 axes:
- Fill: 0 (outlined/inactive) or 1 (filled/active)
- Weight: 100-700 (default 400)
- Grade: -25 to 200 (default 0)
- Optical Size: 20-48 (match rendered size)

#### Issues:
- ❌ Using Lucide instead of Material Symbols
- ❌ No variable font axes configuration
- ❌ No Fill state toggling (inactive=0, active=1)
- ✅ Consistent icon sizing
- ✅ Single style applied universally (outlined)

#### Recommendation:
**LOW PRIORITY** - Lucide works well. Only switch if strict M3 compliance needed.

---

### 11. Adaptive Layout ❌ NOT IMPLEMENTED

#### Current State:
- Responsive breakpoints using Tailwind (sm, md, lg, xl)
- Collapsible sidebar for mobile
- No explicit window size class detection

#### M3 Requirement:
Window Size Classes determine layout:
- Compact (<600dp): Single column, bottom nav
- Medium (600-839dp): Two-pane optional, nav rail
- Expanded (840-1199dp): Two-pane side-by-side, nav drawer
- Large (1200dp+): Multi-pane, generous margins

Layout Grid:
- Compact: 4 columns, 16dp margin, 8dp gutter
- Medium: 8 columns, 24dp margin, 16dp gutter
- Expanded+: 12 columns, 24dp margin, 24dp gutter

#### Issues:
- ❌ No window size class detection/hook
- ❌ No grid system implementation
- ❌ Navigation doesn't adapt by size class
- ❌ No two-pane layouts for expanded screens

#### Recommendation:
**MEDIUM PRIORITY** - Implement window size classes for better responsive design.

---

### 12. Accessibility ⚠️ PARTIAL COMPLIANCE

#### 12.1 Color Contrast ✅ GOOD

**Current State:**
- WCAG AA adjustments in CSS for zinc colors
- High contrast ratios maintained
- Both light/dark modes tested

**M3 Requirement:**
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

**Assessment:** ✅ COMPLIANT - Current system meets WCAG AA standards.

#### 12.2 Focus Management ⚠️ PARTIAL

**Current State:**
```css
.focus-app {
  @apply focus-visible:ring-2 focus-visible:ring-content-primary/25;
  @apply focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base;
}
```

**M3 Requirement:**
- Visible focus indicator on ALL interactive elements
- Focus ring: 3dp primary color outline with 2dp offset
- Tab order follows reading order

**Issues:**
- ⚠️ Focus rings implemented but not consistently applied
- ⚠️ Ring opacity 25% may not meet visibility requirements
- ❌ Not using primary color for focus ring
- ❌ No 3dp thickness specification

#### 12.3 Motion Sensitivity ✅ GOOD

**Current State:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

**M3 Requirement:**
- Respect `prefers-reduced-motion` OS setting
- Replace animations with instant or simple opacity transitions

**Assessment:** ✅ COMPLIANT - Properly respects reduced motion preference.

#### 12.4 Touch Targets ❌ FAILING

**Assessment:** ❌ See Section 7 - Many interactive elements below 48dp minimum.

---

### 13. Content & Writing ⚠️ MIXED COMPLIANCE

#### Current State:
```tsx
// Sentence case examples ✅
"You are tired of being surprised by your own bills"
"Debt makes you feel stuck even when you are trying"

// Title case examples ❌
"Why it works"
"Start free"
"Sign out"
```

#### M3 Requirement:
**Sentence case everywhere:**
- Buttons: "Save changes", "Create new account"
- Tabs, chips, navigation, app bar titles
- Dialog headers, list items, menu items

**Exceptions:**
- Brand names (Oweable)
- Proper nouns

#### Issues:
- ⚠️ Mixed case usage across UI
- ⚠️ Navigation labels use title case
- ✅ Marketing copy uses sentence case
- ❌ Button labels inconsistent

#### Examples:
```tsx
// ❌ Title case (navigation)
<NavLink>Why it works</NavLink>
<NavLink>Pricing</NavLink>

// ✅ Sentence case (marketing)
<h2>You are tired of being surprised by your own bills</h2>

// ❌ Mixed (buttons)
<button>Start free</button> // lowercase
<button>Sign out</button> // sentence case
```

#### Recommendation:
**LOW PRIORITY** - Audit all UI text for consistent sentence case.

---

## Priority Recommendations

### 🔴 CRITICAL (Fix Immediately)

1. **Touch Target Sizes**
   - Increase ThemeToggle from 36px to 48px minimum
   - Audit all buttons, links, icons for 48dp minimum
   - Add invisible padding where visual size must remain smaller

2. **Focus Ring Visibility**
   - Standardize focus rings across all interactive elements
   - Increase ring opacity or thickness for better visibility
   - Ensure keyboard navigation works throughout app

### 🟡 HIGH (Next Sprint)

3. **Window Size Class Detection**
   - Implement hook to detect compact/medium/expanded/large
   - Adapt navigation paradigm based on size class
   - Implement responsive grid system

4. **State Layer System**
   - Replace custom hover/pressed backgrounds with state overlays
   - Implement 8% hover, 10% focus/pressed, 16% dragged opacities
   - Standardize disabled states (12% container, 38% content)

### 🟢 MEDIUM (Future Enhancement)

5. **Elevation Token System**
   - Define level0-level5 elevation tokens
   - Implement dual-shadow construction
   - Add surface tint overlays for dark mode

6. **Component Specification Alignment**
   - Standardize button sizes (32/36/40/48/56dp)
   - Align text field specs (56dp height, 16dp padding)
   - Implement card variants (elevated/filled/outlined)

### 🔵 LOW (If Migrating to Full M3)

7. **Complete Color System Overhaul**
   - Generate tonal palettes (13 tones per key color)
   - Define all 30+ semantic color roles
   - Implement dynamic color support

8. **Typography Scale Redefinition**
   - Create 15-role type scale
   - Apply correct tracking values per role
   - Map existing text to new roles

9. **Motion System Standardization**
   - Replace custom springs with M3 easing curves
   - Implement duration tokens
   - Add transition patterns (Container Transform, etc.)

10. **Icon System Migration**
    - Switch from Lucide to Material Symbols
    - Configure variable font axes
    - Implement Fill state toggling

---

## Overall Assessment

### Current Design System Quality: ⭐⭐⭐⭐☆ (4/5)
- Well-implemented custom system
- Good token architecture
- Strong accessibility foundation
- Consistent application

### M3 Compliance Score: ⭐⭐☆☆☆ (2/5)
- Follows some M3 principles (token-first, semantic naming)
- Major gaps in color, typography, shape, elevation systems
- Critical touch target violations
- Missing state layer pattern

### Recommendation:

**DO NOT migrate to M3 unless there's a strategic reason.** The current Vercel-inspired design system is:
- Professionally implemented
- Internally consistent
- Accessible (with minor fixes)
- Aligned with brand identity

**Instead, fix the critical issues:**
1. Touch target sizes (accessibility requirement)
2. Focus ring consistency (WCAG 2.2 compliance)
3. Window size class detection (better responsiveness)

These improvements will enhance UX without requiring a complete design system overhaul.

---

## Appendix: Files Audited

### Pages (39 files)
- Landing.tsx, Pricing.tsx, Dashboard.tsx, AuthPage.tsx
- Budgets.tsx, Goals.tsx, Transactions.tsx, Bills-related pages
- Settings pages (13 sub-pages)
- Static pages (FAQ, Support, Privacy, Terms, Security)
- Feature pages (Income, Subscriptions, Investments, etc.)

### Components (32+ files)
- Layout.tsx, Header.tsx, Footer.tsx
- ThemeToggle.tsx, QuickAddModal.tsx, ErrorBoundary.tsx
- Navigation components, chart components, form components

### Styles
- index.css (664 lines) - Main design token definitions
- Multiple utility classes and theme variants

### Documentation
- DESIGN.md (existing design system docs)
- Multiple design migration progress reports

---

**Audit Completed:** 2026-04-23  
**Next Steps:** Address critical touch target and focus ring issues immediately.
