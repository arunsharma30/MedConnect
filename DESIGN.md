---
name: MedConnect Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4c42e9'
  primary: '#493ee5'
  on-primary: '#ffffff'
  primary-container: '#635bff'
  on-primary-container: '#fefaff'
  inverse-primary: '#c3c0ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#a02d6f'
  on-tertiary: '#ffffff'
  tertiary-container: '#bf4789'
  on-tertiary-container: '#fffafa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#321ed2'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2: 0.125rem
  space-4: 0.25rem
  space-8: 0.5rem
  space-12: 0.75rem
  space-16: 1rem
  space-24: 1.5rem
  space-32: 2rem
  space-40: 2.5rem
  space-48: 3rem
  space-64: 4rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  max-width-content: 72rem
---

## Brand & Style

This design system delivers an empathetic, clinical, yet approachable digital environment tailored for modern healthcare delivery. Balancing clinical precision with warm human dignity, the aesthetic avoids speculative tech tropes and synthetic flourishes in favor of grounded editorial clarity, reminiscent of high-touch primary care and specialized health collectives.

### Aesthetic Principles
- **Clarity and Reassurance:** High-legibility typography, deliberate negative space, and unambiguous visual cues instill patient confidence and reduce cognitive friction during moments of acute stress.
- **Editorial Restraint:** Vibrant hues are reserved strictly for intent and interactive wayfinding. Surfaces lean heavily into crisp architectural whites and gentle slate neutrals, avoiding saturated gradient washes.
- **Grounded Tactility:** Physical metaphors manifest through crisp 1px borders, subtle boundary definitions, and atmospheric light diffusion rather than heavy skeuomorphism or neo-brutalist weight.

## Colors

The palette employs an intentional hierarchy engineered to prevent alarm while maintaining clear accessibility standards across all health-tracking, scheduling, and diagnostic views.

### Application Rules
- **Primary (`#635BFF`):** Reserved for primary calls-to-action, active navigational states, confirmed steps, and key clinical milestones. Never used as large ambient background fills.
- **Secondary (`#8B5CF6`):** Secondary interactive accents, progress step completions, subtle focus rings, and secondary badge fills.
- **Tertiary (`#F472B6`):** Used sparingly for urgent indicators, preventive care highlights, personalized alerts, and compassionate status tags.
- **Surfaces & Backgrounds:** Base canvas uses `#F7F8FC`. Primary clinical containers sit on `#FFFFFF` with `#F1F3FA` designated for subtle table headers, inactive card regions, and alternating data lists.
- **Text & Structure:** `#111827` provides high-contrast legibility for titles and diagnostic readouts; `#4B5563` handles body and helper copy; `#E5E7EB` dictates all crisp structural dividing lines.

## Typography

Typographic scale is proportioned to preserve visual calm. Giant display styles are omitted; editorial authority is instead achieved via precise weight contrast (`600` semi-bold vs. `400` regular) and measured leading.

### Hierarchy & Responsive Adjustments
- **Editorial Headings:** `display-lg` serves exclusively for hero milestones and primary portal titles. On viewports narrower than `768px`, swap `display-lg` to `28px/36px` to prevent awkward line breaks in medical terminology.
- **Reading Rhythm:** Paragraph lines are capped at 68 characters. Body copy maintains a generous line height ratio (~1.6x) to facilitate scanning lab results, doctor notes, and prescription instructions.
- **Micro-Copy:** `label-sm` applies uppercase tracking (`0.04em`) solely to metric categories, status tags, and clinical breadcrumbs.

## Layout & Spacing

A strict 8pt base grid governs all layout compositions, driving rhythmic vertical pacing and reliable horizontal consistency across varying responsive screens.

### Grid Architecture
- **Desktop (1024px+):** 12-column layout, 24px gutters, max layout container width of 1152px (`72rem`), centered with dynamic safety margins.
- **Tablet (768px - 1023px):** 8-column layout, 20px gutters, 24px outer page margins.
- **Mobile (320px - 767px):** 4-column layout, 16px gutters, 16px outer boundary padding.

### Breathing Room Rules
- Group related form fields and metadata chips using `space-8` to `space-12`.
- Separate distinct clinical modules and card clusters using `space-24` to `space-32`.
- Section gaps on patient dashboards utilize `space-48` or `space-64` to establish clear topical separation without relying on dense visual separators.

## Elevation & Depth

Visual hierarchy uses low-contrast outlines combined with shallow, whisper-quiet shadows. Surfaces prioritize separation through value rather than heavy artificial elevation.

### Elevation Levels
- **Level 0 (Flat Canvas):** `#F7F8FC` base background. Zero shadow. Contains underlying dashboards and split-screen registration forms.
- **Level 1 (Card & Module Resting):** `#FFFFFF` surface accompanied by a crisp `1px solid #E5E7EB` border and shadow: `0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)`.
- **Level 2 (Interactive Hover & Popovers):** Elevated appointments, dropdowns, and active cards: `1px solid #E5E7EB` with shadow `0 4px 12px rgba(0, 0, 0, 0.03), 0 2px 6px rgba(0, 0, 0, 0.02)`.
- **Level 3 (Modals & Critical Sheets):** Dialogs, telehealth overlays, and slide-in panels: `0 12px 32px rgba(17, 24, 39, 0.08), 0 4px 8px rgba(17, 24, 39, 0.04)`. Background dimming is achieved with `#111827` at 20% opacity.

## Shapes

The design system standardizes on comfortable, human-centric geometry with roundedness scale 2 (`8px` to `12px`). This geometry removes clinical harshness while avoiding overly informal toy-like shapes.

### Curvature Tokens
- **Small Controls (`rounded-md`, 8px):** Badges, input text fields, toggle switches, buttons, and alert strips.
- **Containers (`rounded-lg`, 10px - 12px):** Clinical summary cards, chart wrappers, modal viewports, and interactive list groups.
- **Fully Rounded (`rounded-full`):** Status pills, patient avatar placeholders, and floating notification badges.

## Components

### Buttons
- **Primary:** Filled `#635BFF` with white text, font weight 500, height 40px (padding: 0 18px), border-radius 8px. Hover state: `#5249EC`. Active state: `#443CC7`. Focus-visible ring: 2px `#8B5CF6` with 2px white offset.
- **Secondary:** Surface `#FFFFFF`, text `#111827`, border `1px solid #E5E7EB`. Hover: background `#F1F3FA`, border `#D1D5DB`.
- **Tertiary / Ghost:** Background transparent, text `#4B5563`. Hover: background `#F1F3FA`, text `#111827`.

### Form Fields & Inputs
- **Text Inputs:** Height 42px, background `#FFFFFF`, border `1px solid #E5E7EB`, radius 8px, text `#111827`, placeholder text `#9CA3AF`.
- **States:** Focus triggers a crisp border `#635BFF` and a soft shadow glow `0 0 0 3px rgba(99, 91, 255, 0.12)`. Error state shifts border to `#EF4444` with helper text rendered in matching red.

### Cards & Clinical Containers
- **Standard Card:** Background `#FFFFFF`, 1px border `#E5E7EB`, 10px radius, inner padding 20px or 24px.
- **Interactive Card:** Transitions on border-color to `#8B5CF6` and shadow to Level 2 on hover (`150ms ease-out`).

### Chips & Badges
- **Status Badges:** Height 24px, radius 9999px (pill), horizontal padding 10px, typography `label-sm`.
- **Active / Confirmed:** Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`.
- **Scheduled / Pending:** Background `#F1F3FA`, text `#4B5563`, border `1px solid #E5E7EB`.
- **Attention Required:** Background `#FDF2F8`, text `#9D174D`, border `1px solid #FBCFE8`.

### Checkboxes & Radio Controls
- Base dimension 18px by 18px with `1px solid #D1D5DB` borders.
- Checkbox uses a 4px corner radius; radio is fully circular. Checked state fills `#635BFF` with crisp white check/dot iconography.

### Data Lists & Timelines
- Clean rows separated by hairline `1px solid #E5E7EB` borders. Left-aligned key parameters in `#111827` (weight 500), supporting timestamps in `#4B5563` (weight 400), and right-aligned clinical actions.