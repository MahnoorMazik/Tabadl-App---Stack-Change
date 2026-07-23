# Tabadl Alkon Brand Guidelines

This document summarizes the current brand identity system for Tabadl Alkon and should be used whenever you craft UI, marketing collateral, or internal decks. All components inherit the palette through Tailwind tokens (`globals.css`) and the primary font is available via the Montserrat family bundled in `public/fonts`.

---

## 1. Palette Overview

| Group | Name | Hex | Notes / Usage |
| --- | --- | --- | --- |
| **Primary** | Cadmium Green | `#0B6B37` | Core brand accent for actions, CTAs, highlights. |
|  | Copper Gold | `#CB8D31` | Secondary accent for emphasis, stats, icon fills. |
|  | Raisin Black | `#231F20` | Primary text on light backgrounds. |
|  | Arsenic | `#414042` | Supporting text, dividers, muted UI. |

### 1.0 Primary Gradient

| Name | Stops | Usage |
| --- | --- | --- |
| Tabadl Primary Gradient | `#12C2A3 → #0B6B37` | Use for every gradient surface across marketing pages: hero CTAs, gradient cards, CTA sections, and any background blend. Hover states can darken the trailing stop (`#094F2A`). |

### 1.1 Extended Greens

| Name | Hex | Suggested Usage |
| --- | --- | --- |
| Forest Green | `#4DA56D` | Gradients, hover states, positive badges. |
| Turquoise Green | `#A6D7B4` | Background tints, subtle fills. |
| Emerald | `#55B87A` | Charts, KPI cards, accent icons. |
| Pomona Green | `#0C542C` | Darker CTA hover, navigation backgrounds. |
| Phthalo Green | `#0D3A1F` | Dark surfaces, footer bars, buttons on light hero sections. |

### 1.2 Metallic Golds

| Name | Hex | Suggested Usage |
| --- | --- | --- |
| Deeper Bronze | `#996624` | Headlines, dividers, icon strokes. |
| Pastel Gold | `#F1C678` | Highlight blocks, cards, alerts. |
| Satin Sheen Gold | `#D79E43` | Gradient mixes with Cadmium Green. |
| Deep Champagne | `#F8DCA6` | Light backgrounds, data chips. |
| Buff | `#F3CF8A` | Secondary fill on buttons, charts. |

### 1.3 Blues Stack

| Name | Hex | Suggested Usage |
| --- | --- | --- |
| Oxford Blue | `#002C41` | Header backgrounds, dark mode surfaces. |
| Police Blue | `#264663` | Neutral secondary sections, tables. |
| Steel Teal | `#5E7D96` | Info badges, secondary buttons. |
| Wild Blue Yonder | `#A1BCCF` | Background washes, cards. |
| Metallic Blue | `#3D5D7A` | Charts & graphs, icon strokes. |

### 1.4 Purples Stack

| Name | Hex | Suggested Usage |
| --- | --- | --- |
| Dark Slate Blue | `#444589` | Support messaging, notifications. |
| Max Blue Purple | `#B2B1D8` | Soft panel backgrounds, marketing blocks. |
| Blue-Violet | `#6C6AB0` | Callouts, badges. |
| Space Cadet | `#201F51` | Dark mode nav, modals. |
| Deep Koamaru | `#2D2D6F` | Gradient anchors, CTA hover in purple theme. |

> **Accessibility reminder:** Maintain AA contrast (4.5:1 for body text, 3:1 for large text). Pair lighter tints with Raisin Black or Arsenic text to meet contrast requirements.

---

## 2. Typography

| Role | Font | Weight(s) | Notes |
| --- | --- | --- | --- |
| Brand Headings | Montserrat | 600–800 | Use tighter letter spacing (−0.5 to −1%). |
| Body Copy | Montserrat | 400–500 | Default line-height 1.6. |
| Emphasis / UI Labels | Montserrat | 500–600 | Uppercase allowed for buttons, badges. |

- **Fallbacks:** `Montserrat, "Helvetica Neue", Arial, sans-serif`
- Maintain consistent sizing scale (e.g., 12 / 14 / 16 / 18 / 24 / 32 / 40 / 48).
- Use lightweight weights (300–400) sparingly; ensure readability on small screens.

---

## 3. Iconography & Imagery

- Use **line-art (outline) icons** with a single, consistent stroke weight (≈1.5 px) and rounded caps. The Copper Gold tone (`#CB8D31`) is the default stroke color, placed on soft neutral tiles.
- Icons inherit the palette above; adjust only the stroke color to match context. Avoid filled/duotone icons to maintain cohesion.
- All gradients should use the Tabadl Primary Gradient (`#12C2A3 → #0B6B37`), regardless of component placement.
- Photography should emphasize professional, modern Saudi business environments. Apply warm filters to align with Copper Gold tones.

---

## 4. UI Application Notes

1. **Buttons:** Default fill `Cadmium Green`, hover `Pomona Green`, disabled `Turquoise Green` with `Arsenic` text at 60% opacity.
2. **Links:** Text `Copper Gold`, underline on hover; avoid blue unless placed on dark surfaces.
3. **Cards/Panels:** Light theme backgrounds `Deep Champagne` or `Wild Blue Yonder` at 5–10% opacity; dark theme `Oxford Blue`.
4. **Charts:** Rotate through `Emerald`, `Pastel Gold`, `Steel Teal`, `Dark Slate Blue`, `Blue-Violet`.
5. **Forms:** Borders `Arsenic` at 20% opacity; focus ring `Cadmium Green`.

---

## 5. Assets & Implementation

- CSS variables defined in `src/app/globals.css` should mirror the palette above. Update both light and dark sets when colors change.
- Tailwind tokens (see `tailwind.config.ts`) map to these variables; reference classes like `bg-primary`, `text-accent`, etc.
- Montserrat variable and italic files are stored under `public/fonts/Montserrat`; marketing pages import them via `next/font/local`.

---

## 6. Change Management

- Log any palette or typography changes in this document with date and reasoning.
- Coordinate with design, marketing, and engineering before rolling out updates to avoid inconsistent visuals.

_Last updated: 2025-11-14_

