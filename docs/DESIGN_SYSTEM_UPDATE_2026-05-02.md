# Design System Documentation Update - 2026-05-02

## Summary

Updated all project documentation to reflect the **Linear-inspired dark design system** (defined in [DESIGN.md](./DESIGN.md)) and removed outdated "brutalist" references.

## Files Updated

### 1. ARCHITECTURE.md
**Changes:**
- ✅ Updated Core Philosophy section to reference Linear-inspired system instead of brutalist design
- ✅ Added comprehensive "Design System Compliance" section with:
  - Color palette specifications
  - Typography guidelines (Geist Sans/Mono)
  - Component sizing (6px buttons, 12px cards, 22px panels)
  - Status indicator system
  - Depth/elevation principles
  - Agent prompt template for consistent UI generation
- ✅ Preserved DeviceGuard documentation

**Before:**
> "The UI is intentionally dense, monospace-heavy, and brutalist. Do not soften it."

**After:**
> "The UI follows a **Linear-inspired dark system** (see DESIGN.md): near-black canvas, translucent borders, restrained violet accents, and precise typography. The interface should feel calm, exact, and fast rather than decorative."

### 2. README.md
**Changes:**
- ✅ Updated tagline from "Dark, brutalist, deterministic" to "Linear-inspired dark system with deterministic calculations"

**Before:**
> "Ultra-premium personal finance dashboard for debt elimination, tax defense, and wealth tracking. Dark, brutalist, deterministic — no AI slop, just hard math."

**After:**
> "Ultra-premium personal finance dashboard for debt elimination, tax defense, and wealth tracking. Linear-inspired dark system with deterministic calculations — no AI slop, just hard math."

### 3. IMPORTANT_TODO.md
**Changes:**
- ✅ Updated auth portal description from "brutalist-styled" to "Linear-inspired"

**Before:**
> "Build a secure, brutalist-styled Login and Sign-Up portal..."

**After:**
> "Build a secure, Linear-inspired Login and Sign-Up portal..."

## Current Design System Status

✅ **Fully Implemented in Code:**
- Color tokens in `src/index.css` (`@theme`)
- Typography system (Geist Sans + Geist Mono)
- Component specifications (buttons, cards, panels)
- Status indicators (urgent/warning/info badges)
- Semantic color tokens for both light/dark modes

✅ **Documented in DESIGN.md:**
- Complete color palette with hex values
- Typography scale and OpenType features
- Component styling rules
- Layout principles
- Responsive behavior
- Do's and Don'ts checklist
- Agent prompt guide

✅ **Now Aligned Across All Docs:**
- ARCHITECTURE.md references DESIGN.md
- README.md uses correct terminology
- IMPORTANT_TODO.md matches current system
- Consistent messaging about design approach

## Key Design Principles (Linear-Inspired)

1. **Near-black canvas** (`#08090a`) as the foundation
2. **Translucent borders** for depth (not heavy shadows)
3. **Restrained violet** (`#5e6ad2`) only for CTAs and active states
4. **Precise typography** with tight tracking on display text
5. **Calm and exact** feel over decorative elements
6. **Semantic status colors** for urgency communication
7. **6px controls, 12px cards, 22px panels** for consistency

## What Was Removed

❌ References to "brutalist" design aesthetic  
❌ "Dense, monospace-heavy" language  
❌ "Target user wants data, not encouragement" positioning  

These were replaced with the more refined Linear-inspired approach that balances precision with usability.

## Next Steps

All documentation now correctly reflects the implemented design system. Future UI work should:
1. Reference [DESIGN.md](./DESIGN.md) for specifications
2. Use the agent prompt template from ARCHITECTURE.md
3. Follow semantic color token usage for status indicators
4. Maintain the calm, precise, fast aesthetic

---

**Date:** 2026-05-02  
**Updated by:** Design system alignment audit
