---
name: Oweable
version: "alpha"
description: Vercel-inspired minimalist financial dashboard with dual-mode support (light/dark)
colors:
  # Dark mode (default)
  surface-base: "#000000"
  surface-raised: "#0a0a0a"
  surface-elevated: "#111111"
  surface-border: "#333333"
  content-primary: "#ffffff"
  content-secondary: "#888888"
  content-tertiary: "#737373"
  brand-cta: "#ffffff"
  brand-profit: "#22c55e"
  brand-expense: "#ef4444"
  
  # Light mode overrides via :root.theme-light
  # surface-base: "#ffffff"
  # surface-raised: "#fafafa"
  # surface-elevated: "#f5f5f5"
  # surface-border: "#e5e5e5"
  # content-primary: "#000000"
  # content-secondary: "#666666"
  # content-tertiary: "#888888"
  # brand-cta: "#000000"
typography:
  h1:
    fontFamily: Geist Sans
    fontSize: 3rem
    fontWeight: 600
    letterSpacing: -0.025em
    lineHeight: 1.25
  h2:
    fontFamily: Geist Sans
    fontSize: 2rem
    fontWeight: 600
    letterSpacing: -0.02em
    lineHeight: 1.25
  body:
    fontFamily: Geist Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: -0.006em
  label-caps:
    fontFamily: Geist Sans
    fontSize: 0.6875rem
    fontWeight: 500
    letterSpacing: 0.08em
    textTransform: uppercase
  numeric:
    fontFamily: Geist Mono
    fontVariantNumeric: tabular-nums
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  card-primary:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.surface-border}"
    rounded: "{rounded.md}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.brand-cta}"
    textColor: "{colors.surface-base}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 36px
  button-secondary:
    backgroundColor: transparent
    borderColor: "{colors.surface-border}"
    textColor: "{colors.content-primary}"
    rounded: "{rounded.md}"
    padding: 10px 20px
    height: 36px
  input-field:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.surface-border}"
    textColor: "{colors.content-primary}"
    rounded: "{rounded.md}"
    padding: 10px 12px
    height: 40px
---

## Overview

**Vercel-Inspired Minimalism Meets Financial Clarity**

Oweable's design system draws inspiration from Vercel's dashboard aesthetic: near-black surfaces, thin neutral borders, minimal chrome, and content-first hierarchy. The interface evokes a premium terminal experience — clean, focused, and distraction-free.

### Design Principles

1. **Content First**: UI chrome recedes; data takes center stage
2. **Minimal Chrome**: Thin borders, subtle shadows, no unnecessary decoration
3. **Typography as Interface**: Clear hierarchy through weight, size, and spacing
4. **Purposeful Color**: Neutral palette with strategic accent colors for actions and status
5. **Dual-Mode Native**: Both light and dark modes are first-class citizens, not afterthoughts

---

## Colors

The color system uses CSS custom properties that switch between light and dark modes via the `.theme-light` class on `:root`.

### Dark Mode (Default)

**Surfaces:**
- **Base (#000000)**: Pure black foundation for maximum contrast
- **Raised (#0a0a0a)**: Subtle elevation for cards and panels
- **Elevated (#111111)**: Higher elevation for modals and overlays
- **Border (#333333)**: Thin, neutral borders for separation

**Content:**
- **Primary (#ffffff)**: Main text and icons — maximum readability
- **Secondary (#888888)**: Supporting text, metadata, captions
- **Tertiary (#737373)**: Labels, hints, disabled states

**Brand:**
- **CTA (#ffffff)**: Primary action buttons (inverts on light mode)
- **Profit (#22c55e)**: Positive values, income, gains
- **Expense (#ef4444)**: Negative values, costs, losses

### Light Mode (`:root.theme-light`)

**Surfaces:**
- **Base (#ffffff)**: Clean white foundation
- **Raised (#fafafa)**: Subtle off-white for cards
- **Elevated (#f5f5f5)**: Light gray for depth
- **Border (#e5e5e5)**: Subtle gray borders

**Content:**
- **Primary (#000000)**: Deep black for maximum contrast
- **Secondary (#666666)**: Medium gray for supporting text
- **Tertiary (#888888)**: Light gray for labels

**Brand:**
- **CTA (#000000)**: Black buttons on white backgrounds
- **Profit (#16a34a)**: Slightly darker green for light backgrounds
- **Expense (#dc2626)**: Slightly darker red for light backgrounds

### Accessibility

All color combinations meet WCAG AA standards:
- Text on backgrounds: ≥4.5:1 contrast ratio
- Large text (18px+): ≥3:1 contrast ratio
- UI components: Visible focus indicators

---

## Typography

### Font Families

**Geist Sans** (Primary)
- Modern, geometric sans-serif
- Excellent legibility at small sizes
- OpenType features: ligatures, contextual alternates

**Geist Mono** (Numeric/Data)
- Monospaced for tabular data
- Used for amounts, dates, IDs
- Tabular nums enabled by default

### Type Scale

**Headings:**
- H1: 48px / 600 weight / -0.025em tracking (hero sections)
- H2: 32px / 600 weight / -0.02em tracking (section titles)
- H3: 24px / 600 weight / -0.02em tracking (card titles)

**Body:**
- Body: 14px / 400 weight / 1.5 line-height (default text)
- Small: 12px / 400 weight (captions, metadata)
- Micro: 11px / 500 weight / uppercase / 0.08em tracking (labels)

**Numeric:**
- Amounts: Geist Mono / tabular-nums / variable size
- Dates: Geist Mono / 12-14px
- IDs: Geist Mono / 11px / uppercase

### Text Rendering

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: "rlig" 1, "calt" 1, "cv01" 1, "ss03" 1;
```

---

## Layout & Spacing

### Spacing Scale

Based on 4px grid system:
- **xs (4px)**: Tight spacing within components
- **sm (8px)**: Component internal padding
- **md (16px)**: Standard gap between elements
- **lg (24px)**: Section spacing
- **xl (32px)**: Large section gaps
- **2xl (48px)**: Hero/major section spacing

### Border Radius

Consistent rounding for visual harmony:
- **sm (6px)**: Small buttons, badges, tags
- **md (8px)**: Cards, inputs, standard buttons
- **lg (12px)**: Modals, large panels
- **xl (16px)**: Hero elements, featured cards

### Shadows

**Dark Mode:**
- Tactile: `0 1px 0 rgba(255, 255, 255, 0.06)` — subtle top highlight
- Tactile Hover: `0 1px 0 rgba(255, 255, 255, 0.1)` — enhanced on hover

**Light Mode:**
- Tactile: `inset 0 1px 0 rgba(255, 255, 255, 1), 0 1px 2px rgba(0, 0, 0, 0.05)` — raised effect
- Tactile Hover: Enhanced shadow depth

---

## Components

### Card (Primary)

The fundamental building block for content grouping.

**Structure:**
```tsx
<div className="rounded-md border border-surface-border bg-surface-raised p-6">
  <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
  <p className="mt-2 text-sm text-content-secondary">{description}</p>
</div>
```

**Variants:**
- Default: Raised background with border
- Elevated: Higher elevation for modals/overlays
- Glass: Backdrop blur with transparency

**Interactions:**
- Hover: Subtle border color change
- Focus: Ring indicator for keyboard navigation
- Active: Slight translateY for tactile feedback

---

### Button (Primary)

Main call-to-action buttons.

**Structure:**
```tsx
<button className="btn-tactile rounded-md bg-brand-cta px-5 py-2.5 text-sm font-medium text-surface-base">
  Action
</button>
```

**Properties:**
- Background: Brand CTA color (white in dark, black in light)
- Text: Inverted surface color
- Height: 36px minimum touch target
- Padding: 10px vertical, 20px horizontal
- Shadow: Tactile shadow for depth

**States:**
- Hover: Brightness increase + shadow enhancement
- Active: TranslateY(1px) for press effect
- Focus: Ring indicator
- Disabled: Reduced opacity, no interactions

---

### Button (Secondary)

Outline buttons for secondary actions.

**Structure:**
```tsx
<button className="rounded-md border border-surface-border bg-transparent px-5 py-2.5 text-sm font-medium text-content-primary hover:bg-surface-elevated">
  Secondary
</button>
```

---

### Input Field

Form inputs with consistent styling.

**Structure:**
```tsx
<input 
  className="focus-app-field w-full rounded-md border border-surface-border bg-surface-raised px-3 py-2.5 text-sm text-content-primary placeholder:text-content-tertiary"
  placeholder="Enter value..."
/>
```

**Focus States:**
- Ring: 2px ring with 30% opacity
- Offset: 2px offset from element
- Color: Content primary for visibility

---

### Navigation Item

Sidebar navigation links.

**Structure:**
```tsx
<a className="chrome-nav-row flex items-center gap-3 rounded-md px-4 py-2 text-content-secondary hover:bg-surface-highlight hover:text-content-primary">
  <Icon className="h-4 w-4" />
  <span>Label</span>
</a>
```

**Active State:**
- Background: Surface highlight
- Text: Content primary
- Icon: Full opacity

---

## Do's and Don'ts

### ✅ Do

- Use semantic HTML elements (`<nav>`, `<main>`, `<aside>`, etc.)
- Maintain consistent spacing using the spacing scale
- Use theme tokens instead of hardcoded colors
- Provide visible focus indicators for keyboard navigation
- Keep button text concise and action-oriented
- Use monospace fonts for numeric data
- Test both light and dark modes during development
- Maintain sufficient color contrast (WCAG AA minimum)

### ❌ Don't

- Hardcode colors — always use CSS custom properties
- Mix different border radius values arbitrarily
- Use more than 2-3 font weights in a single view
- Add decorative elements without purpose
- Ignore reduced-motion preferences
- Create buttons smaller than 36px height
- Use pure black (#000000) text on pure white (#ffffff) in light mode — use #111827 instead
- Forget to test keyboard navigation

---

## Implementation Notes

### Theme Toggle

Users can toggle between light and dark modes via the theme toggle component. Preference is stored in localStorage and respects system preference on first visit.

```tsx
const { theme, toggleTheme } = useTheme();
```

### CSS Architecture

- Tailwind CSS v4 with `@theme` directive
- Custom properties defined in `src/index.css`
- Theme switching via `.theme-light` class on `:root`
- Utility classes for common patterns (`.btn-tactile`, `.focus-app`, etc.)

### Animation Guidelines

- Duration: 200ms for micro-interactions
- Easing: `ease-out` for entrances, `ease-in` for exits
- Respect `prefers-reduced-motion: reduce`
- Use `will-change` sparingly for performance
- Prefer CSS transforms over layout-changing properties

---

## Future Enhancements

### Planned Improvements

1. **Component Library**: Extract reusable components into dedicated files
2. **Design Tokens Export**: Generate tokens for other platforms (mobile, desktop)
3. **Animation System**: Standardized motion primitives
4. **Icon System**: Consistent icon sizing and stroke weights
5. **Responsive Breakpoints**: Document mobile/tablet/desktop patterns
6. **Accessibility Audit**: Regular WCAG compliance checks
7. **Performance Monitoring**: Track rendering performance metrics

### Experimental Features

- Gradient borders on hover (currently in pulse-border-container)
- Skeleton loading states with shimmer animation
- Real-time collaboration cursors
- Advanced chart theming

---

## Credits

**Inspiration:**
- Vercel Dashboard — Minimal chrome, content-first design
- Linear App — Keyboard-first, efficient workflows
- Raycast — Terminal-inspired aesthetics

**Typography:**
- Geist Sans & Mono — Vercel's typeface family

**Tools:**
- Tailwind CSS v4 — Utility-first CSS framework
- Lucide Icons — Consistent, customizable icon set
- Headless UI — Accessible component primitives

---

*Last updated: 2026-05-23*
*Version: alpha*
*Maintained by: Oweable Design Team*
