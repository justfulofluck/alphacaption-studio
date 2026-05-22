---
name: Obsidian Pulse
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e0c0af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a78b7c'
  outline-variant: '#584235'
  surface-tint: '#ffb68b'
  primary: '#ffb68b'
  on-primary: '#522300'
  primary-container: '#ff7a00'
  on-primary-container: '#5c2800'
  inverse-primary: '#994700'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#c8c6c5'
  on-tertiary: '#303030'
  tertiary-container: '#a2a09f'
  on-tertiary-container: '#373737'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbc8'
  primary-fixed-dim: '#ffb68b'
  on-primary-fixed: '#321200'
  on-primary-fixed-variant: '#753400'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 260px
---

## Brand & Style

The design system is engineered for developer-centric tools and high-density dashboards. It strikes a balance between **Minimalism** and **High-Contrast Boldness**, utilizing a deep, monochromatic foundation to make information pop.

The aesthetic is "Technical Premium"—it feels robust and precise like a high-end IDE, but approachable through rounded organic shapes. It prioritizes focus by receding secondary information into the dark background and utilizing a single, high-energy accent color to guide user action and denote system status.

The emotional response should be one of control, sophistication, and clarity amidst complex data.

## Colors

The palette is strictly dark-mode, anchored by a "True Black" background to maximize OLED contrast and power efficiency for long-session developer work.

- **Primary:** #FF7A00 (Vibrant Orange). Used exclusively for primary calls-to-action, active selection states, and critical highlights.
- **Surface Layers:** The UI uses three tiers of dark grey (#0D0D0D base, #1A1A1A for cards, #262626 for inputs/nested items) to create structural depth without relying on heavy shadows.
- **Functional:** Success, warning, and error states should utilize the primary orange or desaturated variations of green/red to maintain the palette's integrity.

## Typography

This system uses a tiered font stack to separate intent:

- **Plus Jakarta Sans** is used for headers and branding to provide a modern, slightly rounded, and premium feel.
- **Inter** handles all body copy and interface elements where legibility and neutral utility are paramount.
- **JetBrains Mono** is utilized for metadata, labels, and "technical" strings to reinforce the developer-focused nature of the dashboard.

Captions and small labels often use uppercase with increased tracking to maintain readability against the dark background.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for the main content area, centered on the screen with maximum widths, while the sidebar remains fixed to the left.

- **Grid:** A 12-column grid is used for desktop views.
- **Rhythm:** A 4px base unit drives all spacing. Standard padding for cards is 24px (space-6), while nested items use 12px or 16px.
- **Responsibility:** On mobile, the sidebar collapses into a bottom-nav or hamburger menu, and 12-column grids collapse into a single-column stack. Content margins reduce from 32px to 16px.

## Elevation & Depth

In this design system, depth is achieved through **Tonal Layers** and **Subtle Outlines** rather than traditional shadows.

1. **Level 0 (Base):** #0D0D0D. The lowest layer (canvas).
2. **Level 1 (Cards/Sidebar):** #1A1A1A. Elevated surfaces with a 1px solid border of `border_subtle`.
3. **Level 2 (Inputs/Buttons):** #262626. For interactive elements sitting on top of Level 1 surfaces.
4. **Level 3 (Popovers/Modals):** #262626 with a high-diffusion 40px black shadow (opacity 0.5) to provide separation from the UI below.

Glassmorphism is used sparingly, primarily for sticky headers or navigation bars, using a `backdrop-filter: blur(12px)` and a semi-transparent dark fill.

## Shapes

The design system uses a **Rounded** (Level 2) shape language. This softens the technical aesthetic, making the dashboard feel more modern and accessible.

- **Standard Elements:** Buttons and Input fields use 0.5rem (8px).
- **Containers:** Large dashboard cards and sections use 1rem (16px).
- **Special Elements:** Avatars and certain toggle indicators are fully circular (pill-shaped).

## Components

### Buttons

- **Primary:** Background #FF7A00, Text #000000. Bold weight. Subtle outer glow on hover using the primary color at low opacity.
- **Secondary:** Background #262626, Border 1px `border_subtle`, Text #FFFFFF.
- **Tertiary/Ghost:** No background, Text #A1A1A1, becomes #FFFFFF on hover.

### Input Fields

- Dark background (#1A1A1A) with a desaturated border. On focus, the border turns #FF7A00 and the label font (JetBrains Mono) should shift color to match.

### Cards & Sections

- Use a background of #1A1A1A with 16px corner radius. Group related data sections with a subtle 1px top border to create vertical rhythm without full enclosure.

### Sidebar Navigation

- Vertical layout with a width of 260px. Active states are indicated by the primary orange color on the icon or a small vertical bar on the left edge.

### Data Chips

- Small, rounded containers with #262626 background and #A1A1A1 text. Use Mono font for numeric values within chips.
