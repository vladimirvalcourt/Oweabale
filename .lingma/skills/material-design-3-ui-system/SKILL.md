---
name: material-design-3-ui-system
description: >-
  Comprehensive, implementation-ready Material Design 3 (M3) skill.
  Covers the complete token architecture, color system, typography, shape,
  elevation, motion, adaptive layout, iconography, interaction states,
  component anatomy with exact specs, accessibility, content guidelines,
  and M3 Expressive updates. Framework-agnostic — applicable to React,
  React Native/Expo, Flutter, Web, and Android.
domain: design-systems
subdomain: material-design
tags:
  - material-design-3
  - m3
  - design-tokens
  - color-system
  - typography
  - components
  - accessibility
  - adaptive-layout
  - motion
  - react-native
  - expo
  - fintech-ui
version: "2.0.0"
author: vladimirvalcourt
license: Apache-2.0
---

# Skill: Material Design 3 (M3) — Full Design System

## Trigger
Load this skill whenever:
- A user asks to build, audit, or improve a UI using Material Design 3.
- You are creating components (buttons, cards, navigation, inputs, dialogs, etc.).
- You are theming an app and defining its color scheme, typography, or shape system.
- You are building adaptive or responsive layouts for multiple screen sizes.
- You are working in React Native/Expo, Flutter, Android Compose, or Web (Tailwind, CSS Vars).
- You are applying accessibility, interaction states, or motion to UI elements.
- You are implementing icons using Material Symbols.

## Type
**Rigid** — All design decisions must align with M3 token architecture. Never hardcode raw hex values, font sizes, or shadow values in UI code. Always resolve through the semantic token layer.

## Instructions

1. **Token-first architecture:** Every color, typographic value, spacing unit, elevation, and shape must be resolved from a semantic token (e.g., `md.sys.color.primary`, `md.sys.typescale.body.large`). Never use raw values in component code.
2. **Establish a ColorScheme first:** Before building any component, define the full light and dark `ColorScheme` objects with all 30 semantic color roles.
3. **Apply state layers, not custom state colors:** Interaction states (hover, focus, press, drag, disabled) must be implemented via state layer overlays at specified opacities — never via unique background hex values.
4. **Enforce 48dp touch targets:** All interactive elements must meet the minimum 48×48dp tap target. Visual size may be smaller; invisible padding must compensate.
5. **Use sentence case everywhere:** Buttons, tabs, app bars, dialogs, menus, chips — all UI text uses sentence case only.
6. **Apply adaptive layout patterns:** Use Window Size Class breakpoints to determine navigation paradigm and layout columns — never use device type (phone/tablet) as the sole trigger.
7. **Apply M3 motion choreography:** Use specified easing curves and transition patterns (Container Transform, Shared Axis, Fade Through, Fade) for all state changes and navigation.
8. **Use Material Symbols (variable font) for all icons:** Configure all four variable axes (Fill, Weight, Grade, Optical Size) consistently per context.
9. **Audit for M3 compliance before declaring a component done:** Run the Quick Compliance Checklist at the end of every component implementation.
10. **Apply M3 Expressive updates** (spring-physics motion, expanded shape library, new components) when targeting Android 16 / latest platform versions.

---

## Part 1: Design Token Architecture

### 1.1 Three-Tier Token Hierarchy

| Tier | Name | Purpose | Example |
|------|------|---------|---------|
| Tier 1 | **Reference (Primitive)** | Raw, unassigned values from tonal palettes | `md.ref.palette.primary40` = `#6750A4` |
| Tier 2 | **System (Semantic)** | Values assigned contextual meaning | `md.sys.color.primary` → `md.ref.palette.primary40` |
| Tier 3 | **Component** | Values scoped to a specific component part | `md.comp.filled-button.container.color` → `md.sys.color.primary` |

**Rule:** Component code must only reference Tier 3 or Tier 2 tokens. Tier 1 tokens are reserved for theme definition only.

### 1.2 Token Naming Convention
```
md.[scope].[category].[variant].[property]

Examples:
  md.sys.color.primary
  md.sys.typescale.body.large.size
  md.sys.elevation.level2
  md.comp.filled-button.container.shape
```

---

## Part 2: Color System

### 2.1 Five Key Colors & Tonal Palettes
Each key color generates a tonal palette of **13 tones**: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100.

| Key Color | Role |
|-----------|------|
| **Primary** | Main brand identity; primary actions |
| **Secondary** | Supporting accents; filtering, chips |
| **Tertiary** | Contrasting accent; balancing visual interest |
| **Error** | Warnings, destructive/invalid states |
| **Neutral** | Surfaces, backgrounds, body text |
| **Neutral Variant** | Subtle containers, secondary text, outlines |

### 2.2 Full Semantic Color Roles (Light Scheme)
| Token | Description |
|-------|-------------|
| `primary` | High-emphasis actions, active icons |
| `onPrimary` | Content over primary color |
| `primaryContainer` | Contained buttons, prominent chips |
| `onPrimaryContainer` | Content inside primaryContainer |
| `primaryFixed` | Same prominence as primary but fixed regardless of theme |
| `primaryFixedDim` | Lower prominence than primaryFixed |
| `onPrimaryFixed` | Content over primaryFixed |
| `onPrimaryFixedVariant` | Lower emphasis content over primaryFixed |
| `secondary` | Less prominent supporting color |
| `onSecondary` | Content over secondary |
| `secondaryContainer` | Filter chips, selected states |
| `onSecondaryContainer` | Content over secondaryContainer |
| `tertiary` | Contrasting accent color |
| `onTertiary` | Content over tertiary |
| `tertiaryContainer` | Accent containers |
| `onTertiaryContainer` | Content over tertiaryContainer |
| `error` | Error indicators |
| `onError` | Content over error |
| `errorContainer` | Error banner/container |
| `onErrorContainer` | Content over errorContainer |
| `surface` | Default page/screen background |
| `onSurface` | Primary text and icons |
| `surfaceVariant` | Cards, chips, input fields |
| `onSurfaceVariant` | Secondary text, icons, helper text |
| `surfaceDim` | Darkened surface for emphasis |
| `surfaceBright` | Brightened surface for lightness |
| `surfaceContainerLowest` | Lowest-tone container (e.g., app background) |
| `surfaceContainerLow` | Low-tone container |
| `surfaceContainer` | Standard card/container |
| `surfaceContainerHigh` | Elevated cards |
| `surfaceContainerHighest` | Highest-tone surface (e.g., chips) |
| `inverseSurface` | Snackbar, tooltip backgrounds |
| `inverseOnSurface` | Text on inverse surfaces |
| `inversePrimary` | Links/buttons on inverse surfaces |
| `outline` | Borders, dividers, input outlines |
| `outlineVariant` | Subtle dividers, less prominent borders |
| `scrim` | Modal overlay backdrop |
| `shadow` | Drop shadow color |

### 2.3 Dynamic Color
- Available on Android 12+ and Web via the `@material/material-color-utilities` library.
- Algorithm: **CAM16-UCS** color space extracts 3–5 dominant tones from wallpaper/user content.
- Fallback: Always define a static brand `ColorScheme` for environments without dynamic color support.
- Rule: Check for dynamic color support at runtime; apply it if available, otherwise use static scheme.

### 2.4 Tonal Surface Elevation (Dark Mode)
In dark themes, elevation is communicated via **surface tint overlays** using the `primary` color at increasing opacities, rather than lighter shadows.

| Elevation Level | Surface Tint Opacity |
|-----------------|----------------------|
| Level 0 | 0% |
| Level 1 | 5% |
| Level 2 | 8% |
| Level 3 | 11% |
| Level 4 | 12% |
| Level 5 | 14% |

---

## Part 3: Typography

### 3.1 Type Scale
| Role | Size | Weight | Line Height | Tracking |
|------|------|--------|-------------|---------|
| Display Large | 57sp | Regular (400) | 64sp | -0.25 |
| Display Medium | 45sp | Regular (400) | 52sp | 0 |
| Display Small | 36sp | Regular (400) | 44sp | 0 |
| Headline Large | 32sp | Regular (400) | 40sp | 0 |
| Headline Medium | 28sp | Regular (400) | 36sp | 0 |
| Headline Small | 24sp | Regular (400) | 32sp | 0 |
| Title Large | 22sp | Regular (400) | 28sp | 0 |
| Title Medium | 16sp | Medium (500) | 24sp | +0.15 |
| Title Small | 14sp | Medium (500) | 20sp | +0.1 |
| Body Large | 16sp | Regular (400) | 24sp | +0.5 |
| Body Medium | 14sp | Regular (400) | 20sp | +0.25 |
| Body Small | 12sp | Regular (400) | 16sp | +0.4 |
| Label Large | 14sp | Medium (500) | 20sp | +0.1 |
| Label Medium | 12sp | Medium (500) | 16sp | +0.5 |
| Label Small | 11sp | Medium (500) | 16sp | +0.5 |

### 3.2 Usage Rules
- **Display:** Hero sections, splash screens, marketing surfaces.
- **Headline:** Page titles, section headers, card titles in large layouts.
- **Title Large:** App bar titles, prominent card headers.
- **Title Medium/Small:** List section headers, dialog titles.
- **Body Large/Medium:** Readable paragraphs, descriptions, content text.
- **Body Small:** Supporting text, secondary descriptions.
- **Label Large:** Button text, tab labels, navigation labels.
- **Label Medium:** Chip labels, badge text, annotation text.
- **Label Small:** Overline text, smallest captions.

---

## Part 4: Shape

### 4.1 Shape Token Scale
| Token | Corner Radius | Typical Use |
|-------|--------------|-------------|
| `shape.corner.none` | 0dp | Full-bleed images, bottom sheet scrim |
| `shape.corner.extraSmall` | 4dp | Tooltips, small chips, snackbars |
| `shape.corner.small` | 8dp | Menus, filled text fields (top corners) |
| `shape.corner.medium` | 12dp | Cards, outlined text fields, date picker cells |
| `shape.corner.large` | 16dp | Navigation drawers, side sheets |
| `shape.corner.extraLarge` | 28dp | Bottom sheets, large FABs, time picker |
| `shape.corner.full` | 50% radius | Standard FABs, buttons, circular avatars, badges |

### 4.2 M3 Expressive Shape Additions
M3 Expressive added 35 new shapes and **shape morphing** animations. Shapes can now morph between values on state change (e.g., a button corner expanding on press) as part of the spring physics system.

---

## Part 5: Elevation

### 5.1 Elevation Token Scale
| Token | dp Value | Usage |
|-------|---------|-------|
| `elevation.level0` | 0dp | Flat surfaces, text fields (resting) |
| `elevation.level1` | 1dp | Cards (resting), outlined components |
| `elevation.level2` | 3dp | FAB (resting), autocomplete menus |
| `elevation.level3` | 6dp | Dialogs, modal side sheets, chips (drag) |
| `elevation.level4` | 8dp | Navigation drawers, bottom sheets |
| `elevation.level5` | 12dp | Full-screen dialogs |

### 5.2 Shadow Construction
- Each level uses two shadow layers: **key shadow** (directional, more defined) + **ambient shadow** (soft, omnidirectional).
- In **dark themes**, prefer tonal surface overlays over drop shadows (see Part 2.4).

---

## Part 6: Interaction States

### 6.1 State Layer System
All states are rendered as a semi-transparent overlay on top of the component surface. The overlay color is always the component's `on-Color` token.

| State | State Layer Opacity |
|-------|---------------------|
| Hover | 8% |
| Focus | 10% |
| Pressed | 10% |
| Dragged | 16% |
| Disabled (container) | 12% of `onSurface` |
| Disabled (content) | 38% of `onSurface` |

### 6.2 Rules
- Only one state is visually active at a time. Priority: Disabled > Dragged > Pressed > Focused > Hovered.
- Focus state must also include a visible **focus ring/outline** for keyboard navigation (WCAG 2.2 compliance).
- Never implement hover/press states via custom hex values — always use the state layer pattern.

---

## Part 7: Components — Exact Specs

### 7.1 Buttons
| Variant | Container | Label Color | Elevation | Shape |
|---------|-----------|------------|-----------|-------|
| **Filled** | `primary` | `onPrimary` | Level 0 (→ Level 1 hover) | `shape.corner.full` |
| **Filled Tonal** | `secondaryContainer` | `onSecondaryContainer` | Level 0 (→ Level 1 hover) | `shape.corner.full` |
| **Elevated** | `surfaceContainerLow` | `primary` | Level 1 (→ Level 2 hover) | `shape.corner.full` |
| **Outlined** | Transparent | `primary` | Level 0 | `shape.corner.full` |
| **Text** | Transparent | `primary` | Level 0 | `shape.corner.full` |

**Sizes (M3 2024+):**
| Size | Height | H-Padding | Icon Size |
|------|--------|-----------|-----------|
| Extra Small | 32dp | 12dp | 16dp |
| Small | 36dp | 16dp | 18dp |
| Medium (Default) | 40dp | 24dp | 18dp |
| Large | 48dp | 24dp | 20dp |
| Extra Large | 56dp | 32dp | 24dp |

**Tokens:** `--md-filled-button-container-color`, `--md-filled-button-label-text-color`, `--md-filled-button-container-shape`

### 7.2 Text Fields
| Variant | Container | Active Indicator | Label Color | Shape |
|---------|-----------|-----------------|-------------|-------|
| **Filled** | `surfaceVariant` | `primary` (focused), `onSurfaceVariant` (idle) | `onSurfaceVariant` → `primary` (focused) | `shape.corner.extraSmall` (top only) |
| **Outlined** | Transparent | `primary` border (focused), `outline` (idle) | `onSurfaceVariant` → `primary` (focused) | `shape.corner.extraSmall` |

**Sizing:**
- Height: **56dp**
- Horizontal padding: **16dp** (leading/trailing)
- Vertical padding: **8dp** top + 8dp bottom (with label: 4dp top, 4dp bottom)
- Label height when floating: **12sp (Label Small)**
- Input text: **Body Large (16sp)**
- Helper / error text: **Body Small (12sp)**
- Leading icon: **24dp**, padding from edge **12dp**
- Trailing icon: **24dp**, padding from edge **12dp**

### 7.3 Cards
| Variant | Container | Elevation | Border |
|---------|-----------|-----------|--------|
| **Elevated** | `surfaceContainerLow` | Level 1 (→ Level 2 hover) | None |
| **Filled** | `surfaceContainerHighest` | Level 0 | None |
| **Outlined** | `surface` | Level 0 | 1dp `outline` |

- Shape: `shape.corner.medium` (12dp)
- Padding: 16dp internal
- Touch target: 48dp minimum height for interactive areas within

### 7.4 Navigation Bar (Bottom)
- Height: **80dp** (with system gesture bar: 80dp + inset)
- Item indicator height: **32dp**, width: **64dp**
- Icon size: **24dp**
- Label: **Label Medium** (12sp)
- Max items: 3–5
- Active indicator: `secondaryContainer` with `onSecondaryContainer` icon
- Inactive icon: `onSurfaceVariant`
- Container: `surfaceContainer`
- Elevation: Level 2

### 7.5 Navigation Rail
- Width: **80dp** (collapsed), up to **136dp** (with labels)
- Indicator height: **32dp**, width: **56dp**
- Icon size: **24dp**
- Label: **Label Medium**, visible always or on active-only mode
- FAB placement: top of rail, 8dp margin

### 7.6 Navigation Drawer
- Width (Modal): 360dp max, screen_width - app_bar_height minimum
- Width (Standard): 360dp
- Header height: 56dp (app bar equivalent)
- Item height: **56dp**
- Item label: **Label Large (14sp)**
- Active item: `secondaryContainer` background, `onSecondaryContainer` text
- Inactive item: `onSurfaceVariant` text

### 7.7 Top App Bar
| Variant | Height | Title Style | Collapse Behavior |
|---------|--------|------------|-------------------|
| Small | 64dp | `titleLarge` centered or left | — |
| Center-aligned | 64dp | `titleLarge` centered | — |
| Medium | 112dp → 64dp | `headlineSmall` | Collapses on scroll |
| Large | 152dp → 64dp | `headlineMedium` | Collapses on scroll |

### 7.8 FAB (Floating Action Button)
| Size | Container Size | Icon Size | Shape |
|------|---------------|-----------|-------|
| Small | 40dp | 24dp | `shape.corner.medium` (12dp) |
| Standard | 56dp | 24dp | `shape.corner.large` (16dp) |
| Large | 96dp | 36dp | `shape.corner.extraLarge` (28dp) |
| Extended | 56dp height, variable width | 24dp | `shape.corner.large` |

- Container: `primaryContainer`
- Icon color: `onPrimaryContainer`
- Elevation: Level 3 resting, Level 4 hover

### 7.9 Chips
| Variant | Use Case | Shape |
|---------|---------|-------|
| Assist | Contextual smart actions (e.g., "Set a reminder") | `shape.corner.small` |
| Filter | Toggle-able filtering (e.g., category tags) | `shape.corner.small` |
| Input | Represent user-entered values (e.g., tags in a field) | `shape.corner.small` |
| Suggestion | Dynamic response suggestions | `shape.corner.small` |

- Height: **32dp**
- Horizontal padding: **16dp** (no icon), **8dp** leading + **16dp** trailing (with icon)
- Label: **Label Large (14sp)**

### 7.10 Dialogs
| Type | Max Width | Padding | Title Style |
|------|-----------|---------|------------|
| Basic | 560dp | 24dp all sides | `headlineSmall` |
| Full-screen | Full screen | Standard app bar header | `titleLarge` |

- Shape: `shape.corner.extraLarge` (28dp)
- Button alignment: trailing (right-aligned), stacked only if text overflows
- Scrim: `scrim` token at 32% opacity

### 7.11 Snackbars
- Height: **48dp** (single line), **68dp** (two lines)
- Shape: `shape.corner.extraSmall` (4dp)
- Container: `inverseSurface`
- Text: `inverseOnSurface`, `Body Medium`
- Action button: `inversePrimary`, `Label Large`
- Max width: 600dp; centered on large screens
- Duration: 4000ms (default), 10000ms (complex actions)

---

## Part 8: Iconography (Material Symbols)

### 8.1 Variable Font Axes
| Axis | Range | Default | Usage |
|------|-------|---------|-------|
| **Fill** | 0–1 | 0 | 0 = outlined (default/inactive), 1 = filled (active/selected) |
| **Weight (wght)** | 100–700 | 400 | Match to adjacent text weight for visual harmony |
| **Grade (GRAD)** | -25–200 | 0 | Use 200 for dark mode or low-res; -25 for high-res/light mode |
| **Optical Size (opsz)** | 20–48 | 24 | Match to rendered icon size in dp |

### 8.2 Styles
Three base styles available: **Outlined** (default), **Rounded**, **Sharp**. Pick one and apply it universally across the product.

### 8.3 Usage Tokens
- Navigation icons (inactive): `onSurfaceVariant`, `opsz=24`, `wght=400`, `FILL=0`
- Navigation icons (active): `onSecondaryContainer`, `opsz=24`, `wght=400`, `FILL=1`
- App bar icons: `onSurface`, `opsz=24`, `wght=400`, `FILL=0`
- Button icons: Match button label color, `opsz=18` for standard buttons

---

## Part 9: Motion & Transitions

### 9.1 Easing Curves
| Curve | CSS Cubic Bezier | Use Case |
|-------|-----------------|---------|
| **Emphasized** | `cubic-bezier(0.2, 0, 0, 1.0)` | Primary state changes (bottom sheet open, FAB transform) |
| **Emphasized Decelerate** | `cubic-bezier(0.05, 0.7, 0.1, 1.0)` | Elements entering the screen |
| **Emphasized Accelerate** | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Elements permanently leaving the screen |
| **Standard** | `cubic-bezier(0.2, 0, 0, 1.0)` | Simple, small-scale UI changes |
| **Standard Decelerate** | `cubic-bezier(0, 0, 0, 1)` | Objects decelerating into view |
| **Standard Accelerate** | `cubic-bezier(0.3, 0, 1, 1)` | Objects accelerating out of view |

### 9.2 Duration Tokens
| Token | Value | Use Case |
|-------|-------|---------|
| `duration.short1` | 50ms | Micro-interactions (toggle indicators) |
| `duration.short2` | 100ms | Fade in/out |
| `duration.short3` | 150ms | Small component state changes |
| `duration.short4` | 200ms | Small enter/exit transitions |
| `duration.medium1` | 250ms | Medium component transitions |
| `duration.medium2` | 300ms | Most enter transitions |
| `duration.medium3` | 350ms | Complex enter transitions |
| `duration.medium4` | 400ms | Large, prominent transitions |
| `duration.long1` | 450ms | Bottom sheets, dialogs opening |
| `duration.long2` | 500ms | Full-screen transitions |
| `duration.long3` | 550ms | — |
| `duration.long4` | 600ms | — |
| `duration.extraLong1–4` | 700–1000ms | Rare, large-scale choreography |

### 9.3 Transition Patterns
| Pattern | Trigger | Implementation |
|---------|---------|---------------|
| **Container Transform** | Element expands into another view (card → detail) | Shared element: morph container bounds + fade content |
| **Shared Axis (X)** | Lateral navigation (tabs, carousels) | Slide + crossfade on X axis |
| **Shared Axis (Y)** | Hierarchical navigation (push/pop) | Slide + crossfade on Y axis |
| **Shared Axis (Z)** | Contextual expansion (no spatial change) | Scale + crossfade on Z axis |
| **Fade Through** | Unrelated destination swap (bottom nav switch) | Outgoing fades to 0, incoming fades from 0 with slight scale |
| **Fade** | Elements appearing/disappearing in place | Simple opacity transition |

### 9.4 M3 Expressive: Spring Physics
M3 Expressive replaces easing-curve-based animation with a **spring physics system**:
- Animations feel organic, can **overshoot** target values before settling.
- Defined by **stiffness** and **damping** rather than duration and easing.
- Applied by default in Android Compose M3 Expressive components.
- Web/React Native equivalent: use `react-spring` or Framer Motion spring configs.

---

## Part 10: Adaptive Layout

### 10.1 Window Size Classes
| Class | Width | Navigation Pattern | Layout |
|-------|-------|--------------------|--------|
| Compact | < 600dp | Bottom Navigation Bar | Single column |
| Medium | 600–839dp | Navigation Rail | Two-pane (list-detail optional) |
| Expanded | 840–1199dp | Navigation Drawer (standard) | Two-pane (side-by-side) |
| Large | 1200–1599dp | Navigation Drawer | Multi-pane with max-width |
| Extra Large | ≥ 1600dp | Navigation Drawer | Multi-column, generous margins |

### 10.2 Layout Grid
- Compact: **4 columns**, 16dp margin, 8dp gutter
- Medium: **8 columns**, 24dp margin, 16dp gutter
- Expanded+: **12 columns**, 24dp margin, 24dp gutter

### 10.3 Content Regions
- **Pane 1 (Primary):** List, navigation, or summary
- **Pane 2 (Secondary/Detail):** Detail view, editor, or supplementary content
- Panes must be independently scrollable on Expanded+

---

## Part 11: Accessibility

### 11.1 Touch Targets
- Minimum: **48×48dp** for all interactive elements.
- Spacing between targets: at least **8dp**.
- Visual size may differ; use invisible padding to extend tap area.

### 11.2 Color Contrast
- Normal text (< 18sp or < 14sp bold): minimum **4.5:1** ratio.
- Large text (≥ 18sp or ≥ 14sp bold): minimum **3:1** ratio.
- UI components and graphical objects: minimum **3:1** ratio.
- Use M3 tonal palette roles to guarantee these ratios by default.

### 11.3 Focus Management
- All interactive elements must have a visible focus indicator (WCAG 2.2 §2.4.11).
- Focus ring in M3: 3dp `primary` color outline with 2dp offset.
- Tab order must follow reading order (left-to-right, top-to-bottom).

### 11.4 Motion Sensitivity
- Respect `prefers-reduced-motion` OS setting.
- When reduced motion is active, replace animated transitions with instant or simple opacity transitions.

---

## Part 12: Content & Writing

### 12.1 Sentence Case Everywhere
Apply sentence case to all UI text: buttons, tabs, chips, navigation, app bar titles, dialog headers, list items, menu items.
- ✅ "Create new account", "Save changes", "Mark as paid"
- ❌ "Create New Account", "SAVE CHANGES", "Mark As Paid"

### 12.2 Conciseness Rules
- Buttons: max 2–3 words; use verbs ("Save", "Confirm", "View details")
- Helper text: one concise sentence; no period if under 5 words
- Dialog titles: max 5 words; frame as a statement or question
- Error messages: describe what happened + how to fix it (e.g., "Invalid email — check the format and try again")

### 12.3 Punctuation
- No period after button labels, chip labels, tab labels, or short helper text
- Use periods for full-sentence helper/error text over 5 words

---

## Part 13: M3 Expressive (Latest)

M3 Expressive is Google's 2025–2026 evolution of M3, backed by 46 studies and 18,000+ participants. Key updates:
- **Spring physics motion system** replaces easing/duration model
- **35 new shapes** added; shape morphing on state change
- **New components:** Loading indicators, updated FAB behavior, bouncy button states
- **Spatial UI support:** M3 components adapted for AR/VR with spatial panels and orbiters
- **Color compatibility:** Fully backwards-compatible with M3 dynamic color

Apply M3 Expressive patterns when targeting Android 16, latest Jetpack Compose, or modern web/mobile platforms.

---

## Verification Checklist

Before declaring any M3 component or screen done, confirm:

- [ ] All colors reference semantic tokens (`md.sys.color.*`) — no raw hex values in component code
- [ ] Light and dark ColorScheme objects are fully defined
- [ ] Typography resolves to one of the 15 type scale tokens
- [ ] Shape uses a `shape.corner.*` token
- [ ] Elevation uses a `elevation.level*` token
- [ ] Interaction states (hover/focus/press/disabled) use state layer pattern at correct opacities
- [ ] All interactive elements meet 48×48dp minimum touch target
- [ ] Sentence case applied to all UI text
- [ ] Window size class drives navigation paradigm (Bottom Nav / Rail / Drawer)
- [ ] Icons use Material Symbols with all 4 variable axes set
- [ ] Motion uses specified easing curves and transition patterns
- [ ] `prefers-reduced-motion` is respected
- [ ] Focus indicators meet WCAG 2.2 visibility requirements
- [ ] Color contrast ratios meet WCAG AA minimums
