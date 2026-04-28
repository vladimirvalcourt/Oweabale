---
name: Oweable Linear-Inspired Dark
version: "linear-public-pass"
description: Linear-inspired dark finance system for Oweable public marketing and app chrome
colors:
  surface-base: "#08090a"
  surface-raised: "#0f1011"
  surface-elevated: "#191a1b"
  surface-hover: "rgba(255,255,255,0.05)"
  surface-border: "rgba(255,255,255,0.08)"
  surface-border-subtle: "rgba(255,255,255,0.05)"
  content-primary: "#f7f8f8"
  content-secondary: "#d0d6e0"
  content-tertiary: "#8a8f98"
  content-muted: "#62666d"
  brand-indigo: "#5e6ad2"
  brand-violet: "#7170ff"
  brand-hover: "#828fff"
  success: "#27a644"
  emerald: "#10b981"
  expense: "#ef4444"
typography:
  display-xl:
    fontFamily: Geist Sans
    fontSize: 6.75rem
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "-0.055em"
  display:
    fontFamily: Geist Sans
    fontSize: 4.5rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.044em"
  heading:
    fontFamily: Geist Sans
    fontSize: 2rem
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: "-0.024em"
  body:
    fontFamily: Geist Sans
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.006em"
  mono:
    fontFamily: Geist Mono
    fontVariantNumeric: tabular-nums
rounded:
  control: 6px
  card: 12px
  panel: 22px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.brand-indigo}"
    hoverBackgroundColor: "{colors.brand-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: 44px
    padding: "0 20px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.02)"
    borderColor: "{colors.surface-border}"
    textColor: "{colors.content-secondary}"
    rounded: "{rounded.control}"
    height: 44px
    padding: "0 20px"
  panel:
    backgroundColor: "rgba(255,255,255,0.025)"
    borderColor: "{colors.surface-border}"
    rounded: "{rounded.panel}"
    shadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 40px 140px rgba(0,0,0,0.42)"
  card:
    backgroundColor: "rgba(255,255,255,0.025)"
    borderColor: "{colors.surface-border-subtle}"
    rounded: "{rounded.card}"
  nav:
    backgroundColor: "rgba(15,16,17,0.82)"
    borderColor: "{colors.surface-border-subtle}"
    rounded: "{rounded.control}"
---

# Oweable Design System

## 1. Visual Theme & Atmosphere

Oweable now uses a Linear-inspired dark system: near-black as the native canvas, thin translucent borders, restrained violet action color, and compact precision. The interface should feel calm, exact, and fast rather than decorative.

The public site must present financial stress with order. Use darkness as whitespace. Let the content emerge through luminance steps: base background, raised panels, elevated rows, and small accent moments.

## 2. Color Palette & Roles

- **Base** `#08090a`: page background and deepest canvas.
- **Raised** `#0f1011`: header, section bands, recessed areas.
- **Elevated** `#191a1b`: panels, dropdowns, prominent surfaces.
- **Primary text** `#f7f8f8`: headings and important labels.
- **Secondary text** `#d0d6e0`: body text and navigation.
- **Tertiary text** `#8a8f98`: supporting copy and descriptions.
- **Muted text** `#62666d`: timestamps, tiny labels, inactive states.
- **Brand indigo** `#5e6ad2`: primary CTAs only.
- **Accent violet** `#7170ff`: active state, checkmarks, small interactive accents.
- **Hover violet** `#828fff`: CTA hover and selected emphasis.

Do not use beige, warm cream, neon gradients, or decorative purple glows. Violet is functional, not ornamental.

## 3. Typography Rules

Use Geist Sans as the production substitute for Linear's Inter Variable. Keep the same logic: medium-weight display type, tight tracking at large sizes, and restrained weights.

- Display: 500 weight, very tight tracking, line height around 0.95-1.
- Headings: 500 weight, tight but readable.
- Body: 400 weight, 1.5-1.6 line height.
- UI labels: 500 weight, small, controlled spacing.
- Numbers and amounts: Geist Mono with tabular numerals.

Global text should keep OpenType features enabled: `"cv01"` and `"ss03"` where supported.

## 4. Component Styling

Buttons use 6px radius, not large pills except for true tags. Primary buttons use brand indigo with white text. Secondary buttons are translucent dark surfaces with thin white borders.

Panels use translucent white overlays on dark backgrounds. Depth comes from background luminance and thin borders, not heavy shadows.

Cards should be sparse and purposeful. Use repeated cards for comparable items only. Avoid generic three-card marketing rows unless the content truly requires it.

## 5. Layout Principles

Use max-width containers around 1200-1280px. Public pages should favor asymmetric grids, wide dark breathing room, and product-like UI previews over stock imagery.

Hero sections should be strong but not centered by default. If centered copy is used, pair it with a precise product panel below it. Never use `h-screen`; use `min-h-[100dvh]` or content-driven spacing.

## 6. Depth & Elevation

Elevation is created by:

- Slightly lighter translucent surfaces.
- Borders at `rgba(255,255,255,0.05)` or `rgba(255,255,255,0.08)`.
- Subtle inset highlights.
- Modest dark shadows only for major floating panels.

Avoid bright opaque borders and large generic drop shadows.

## 7. Do's and Don'ts

Do:

- Keep the public site dark, precise, and quiet.
- Use violet for CTAs, active states, and small success cues.
- Keep financial amounts in monospace.
- Use 6px controls, 12px cards, and 22px large panels.
- Let section spacing create calm.

Don't:

- Reintroduce beige/cream as a main palette.
- Use purple gradients as background decoration.
- Use bold 700 as the default emphasis.
- Over-round controls into soft SaaS pills.
- Add decorative copy about the interface itself.

## 8. Responsive Behavior

Mobile collapses all asymmetric grids to one column. Keep touch targets at least 44px tall. Product preview panels should reduce chrome and stack their columns cleanly. Headline sizes should step down aggressively on small screens.

## 9. Agent Prompt Guide

When building new Oweable public UI, use this prompt:

"Build this in Oweable's Linear-inspired system: near-black `#08090a`, raised panels `#0f1011`, translucent white borders, Geist Sans with tight display tracking, Geist Mono for amounts, violet `#5e6ad2` only for CTAs and active states, 6px controls, 12px cards, 22px panels, no beige, no decorative gradients, no generic three-card row."
