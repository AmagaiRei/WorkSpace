# WorkSpace — Design Plan (Stage 1: Visual Beauty)

## Subject & Audience

**Subject:** Portfolio/lab showcase site for a college student (Ruslan Morodetsky) showing IT lab works with reports, code, and screenshots.
**Audience:** Teachers reviewing lab work, peers, potential employers.
**Primary Job:** Make lab works easy to browse, read, and appreciate — with a distinctive neon/glass aesthetic that feels alive on good hardware but gracefully degrades.

---

## Color Palette (Neon Cyberpunk)

| Token                  | Hex                     | Role                                  |
| ---------------------- | ----------------------- | ------------------------------------- |
| `--color-bg-deep`      | `#0a0516`               | Page background base                  |
| `--color-bg-surface`   | `#130924`               | Card/surface background               |
| `--color-bg-elevated`  | `#1a1030`               | Elevated surfaces (modals, dropdowns) |
| `--color-border-dim`   | `rgba(182,36,255,0.15)` | Subtle borders                        |
| `--color-border-neon`  | `#b624ff`               | Active/focus borders (neon purple)    |
| `--color-neon-purple`  | `#b624ff`               | Primary accent                        |
| `--color-neon-pink`    | `#f000ff`               | Secondary accent                      |
| `--color-neon-cyan`    | `#00f0ff`               | Tertiary accent (code, links)         |
| `--color-neon-orange`  | `#ff8c00`               | Warning/active states                 |
| `--color-neon-green`   | `#00ff88`               | Success states                        |
| `--color-text-primary` | `#f5f0ff`               | Primary text                          |
| `--color-text-muted`   | `#b8a8d0`               | Secondary text                        |
| `--color-text-dim`     | `#7a6a9a`               | Tertiary/disabled text                |

**Glow system:**

- `--glow-sm`: `var(--glow-blue)`
- `--glow-md`: `0 0 20px rgba(182, 36, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.2)`
- `--glow-lg`: `0 0 30px rgba(182, 36, 255, 0.4), 0 0 60px rgba(255, 140, 0, 0.2), 0 0 90px rgba(0, 240, 255, 0.15)`

---

## Typography

**Display:** `Space Grotesk` (variable weight 300–700) — geometric, technical, distinctive
**UI/Body:** `JetBrains Mono` (variable 400–700) — monospace for code + UI, reinforces dev identity
**Fallbacks:** system-ui for both

**Type Scale:**

| Role          | Size                            | Weight | Tracking           |
| ------------- | ------------------------------- | ------ | ------------------ |
| Hero title    | `clamp(2.5rem, 8vw, 5rem)`      | 700    | `0.12em`           |
| Section title | `clamp(1.5rem, 3.5vw, 2.25rem)` | 700    | `0.08em`           |
| Card title    | `1.125rem`                      | 600    | `0`                |
| Body          | `1rem`                          | 400    | `0`                |
| Small/meta    | `0.8125rem`                     | 400    | `0.02em`           |
| Micro/label   | `0.7rem`                        | 500    | `0.08em` uppercase |

**Line heights:** Display 1.1, Body 1.6, Code 1.7
**Max line length:** 65ch for prose, 80ch for code

---

## Layout Concept

**Alignment:** Left-aligned content with centered hero. Asymmetric grid for dashboard/stats.

**ASCII Wireframe (Desktop):**

```
┌─────────────────────────────────────────────────────────────┐
│  LOGO                    NAV          [SYNC] [MENU]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│        HERO: "Мои задания"  (large, tracking)               │
│              "Руслан Мородецкий" (light, wide tracking)     │
│              Description...                                  │
│              [ Смотреть предметы ]  ← neon CTA              │
│                                                             │
│        ┌─────────────────────────────────────┐             │
│        │  DASHBOARD GLASS CARD               │             │
│        │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │             │
│        │  │ ✓  │ │ ⏳ │ │ ○  │ │ %  │  KPIs  │             │
│        │  └────┘ └────┘ └────┘ └────┘       │             │
│        │  Progress bar with neon glow        │             │
│        └─────────────────────────────────────┘             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  SEARCH  [TAG FILTERS]                    [RESET]         │
├─────────────────────────────────────────────────────────────┤
│  ▼ ПРОГРАММИРОВАНИЕ     5/8 сдано  ████████░░ 62%          │
│     ┌─────────────────┐ ┌─────────────────┐                │
│     │ Lab 1: Title    │ │ Lab 2: Title    │  ← glass cards │
│     │ Description...  │ │ Description...  │                │
│     │ [tag] [tag]  ●  │ │ [tag] [tag]  ●  │                │
│     └─────────────────┘ └─────────────────┘                │
│                                                             │
│  ▼ БАЗЫ ДАННЫХ          3/5 сдано  ██████░░░░ 60%          │
│     ┌─────────────────┐ ┌─────────────────┐                │
│     │ Lab 1: Title    │ │ Lab 2: Title    │                │
│     └─────────────────┘ └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

**Mobile:** Single column, hamburger menu, stacked dashboard KPIs (2×2), cards full-width.

---

## Glass/Neon System

**Glass surfaces:**

- Base: `rgba(23, 13, 43, 0.6)` + `backdrop-filter: blur(16px)`
- Elevated: `rgba(23, 13, 43, 0.75)` + `backdrop-filter: blur(24px)`
- Strong: `rgba(23, 13, 43, 0.9)` + `backdrop-filter: blur(32px)`
- Border: `1px solid rgba(182, 36, 255, 0.3)`
- Hover: border `rgba(182, 36, 255, 0.6)` + `--glow-md`

**Neon accents applied to:**

- Focus rings
- Active tab indicators
- Progress bar fills
- Button primary states
- Card hover borders
- Scroll indicators

**NO generic grey shadows** — only colored neon glows.

---

## Animation Principles (per animate skill)

| Element                | Frequency  | Purpose       | Tool                | Duration             | Easing          |
| ---------------------- | ---------- | ------------- | ------------------- | -------------------- | --------------- |
| Page load              | Rare       | Delight/State | CSS animation       | 400ms                | `--ease-out`    |
| Card stagger entrance  | Occasional | Spatial       | CSS animation       | 300ms + 40ms stagger | `--ease-out`    |
| Subject accordion open | Occasional | Spatial/State | CSS transition      | 250ms                | `--ease-smooth` |
| Card hover             | Frequent   | Feedback      | CSS transition      | 150ms                | `ease`          |
| Button press           | Frequent   | Feedback      | CSS transition      | 100ms                | `ease-out`      |
| Sync button spin       | Occasional | State         | CSS animation       | 1s linear            | `linear`        |
| Progress bar fill      | Rare       | State         | CSS transition      | 1200ms               | `--ease-smooth` |
| Modal/drawer           | Occasional | Spatial       | CSS @starting-style | 300ms                | `--ease-drawer` |
| Tab indicator slide    | Frequent   | Spatial       | CSS transition      | 200ms                | `--ease-smooth` |

**Easing tokens (extend existing):**

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1); /* existing */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* subtle overshoot */
```

**Reduced motion:** Keep opacity/color transitions, drop all transform animations.
**Hover gating:** `@media (hover: hover) and (pointer: fine)` for all hover transforms.

---

## Distinctive Design Decisions (Anti-Template)

1. **No all-caps labels** — use tracking + weight instead
2. **No numbered markers (01/02/03)** — content isn't a strict sequence
3. **No identical card grid** — subjects are `<details>` with progressive disclosure, labs are cards inside
4. **Single neon accent per interactive element** — not rainbow everywhere
5. **Hero waves as subtle atmospheric layer** — not dominant decoration
6. **Dashboard as glass "control panel"** — not generic stats cards
7. **Sync button as living element** — rotates on hover, spins on sync
8. **Tag pills as filters** — pressed state uses neon gradient, not just color swap

---

## Implementation Priority

1. **Token system** — consolidate all CSS custom properties into `css/tokens/design-tokens.css`
2. **Typography** — load Space Grotesk, apply scale
3. **Hero** — refine layout, add atmospheric glow, distinctive CTA
4. **Dashboard** — glass card with neon KPIs, animated progress bar
5. **Subject accordions** — glass tabs with neon indicators, smooth open/close
6. **Lab cards** — refined glass, neon hover, tag pills
7. **Header/Nav** — glass bar, neon underline on active, sync button animation
8. **Footer** — minimal, atmospheric
9. **Global animations** — page entrance, stagger, reduced motion
10. **Adaptive integration** — ensure perf-low/net-economy profiles disable expensive effects

---

## Review Against Brief

| Brief Requirement               | Plan Addresses?                                      |
| ------------------------------- | ---------------------------------------------------- |
| Neon style                      | ✅ Core palette + glow system                        |
| Glass tabs                      | ✅ Subject accordions as glass tabs                  |
| Smooth animations               | ✅ Defined per animate skill rules                   |
| Pleasant to eye, structured     | ✅ Left-aligned, clear hierarchy, 65ch lines         |
| Easy to perceive                | ✅ High contrast, reduced motion, clear focus states |
| Weak device optimization        | ✅ Adaptive system already exists, will integrate    |
| Full beauty on powerful devices | ✅ perf-high/net-rich get all effects                |

**Risks to mitigate:**

- Too many neon colors → limit to 3 active at once (purple/pink primary, cyan for code, green/orange for status only)
- Glass blur performance → adaptive.css already handles, ensure `perf-low` disables backdrop-filter
- Animation overload → stagger only on initial load, not on every interaction

---

## Next Steps

After approval of this plan:

1. Create `css/tokens/design-tokens.css` with consolidated tokens
2. Create `css/theme.css` as main entry point importing all modules
3. Add Space Grotesk font loading
4. Refactor hero, dashboard, subjects, cards with new design
5. Add page-load animation sequence
6. Verify adaptive integration works
7. Test on mobile and reduced motion
