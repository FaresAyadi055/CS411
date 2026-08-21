---
name: Emerald Horizon
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#535f58'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b7770'
  on-tertiary-container: '#f5fff7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

This design system is built for a high-trust Fintech Loyalty platform in the Tunisian market. The aesthetic follows a **Modern Minimalist** approach with a focus on high-clarity and functional elegance. It prioritizes a clean, high-contrast light theme to ensure legibility under high-glare Mediterranean sunlight.

The brand personality is professional yet fresh, moving away from traditional banking's rigidity toward a vibrant, growth-oriented fintech experience. The UI avoids heavy depth effects in favor of a "flat-plus" style, utilizing subtle strokes and tonal shifts to define hierarchy. The emotional response should be one of security, precision, and effortless utility.

## Colors

The palette is centered around a "Growth Green" spectrum, signaling prosperity and reliability.

- **Primary (Emerald Green):** Reserved for primary actions, active navigation states, and key financial indicators.
- **Secondary (Mint Green):** Used for success messaging, verified checkmarks, and positive trends.
- **Surface Tint (Mint Ice):** A cooling background for secondary containers, badges, and notification banners to reduce visual fatigue.
- **Typography (Deep Charcoal):** Used for all primary headings and body text to ensure maximum WCAG contrast ratios.
- **Background (Off-White):** A soft base that prevents the "starkness" of pure white while maintaining high contrast.
- **Borders:** A consistent light slate stroke is used to define boundaries without adding visual weight.

## Typography

This design system utilizes **Inter** for its exceptional legibility and systematic approach to digital interfaces. 

- **Headlines:** Use Bold (700) and Semi-Bold (600) weights with slight negative letter-spacing for a modern, compact look.
- **Body:** Standard body text is 16px to ensure accessibility for a wide demographic.
- **Labels:** Use Medium (500) and Semi-Bold (600) for UI elements like buttons, input headers, and micro-copy.
- **Accessibility:** All text colors must maintain a contrast ratio of at least 4.5:1 against their respective backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model optimized for PWA (Progressive Web App) deployment. 

- **Mobile (Default):** 4-column grid with 16px margins. This ensures content remains center-focused and reachable on mobile devices.
- **Tablet/Desktop:** 12-column grid with a maximum content width of 1200px.
- **Spacing Rhythm:** Based on a 4px baseline. Most UI elements should utilize 16px (md) for internal padding and 24px (lg) for section vertical spacing.
- **Touch Targets:** All interactive elements (buttons, links, inputs) must have a minimum height of 48px to accommodate touch interactions.

## Elevation & Depth

This design system avoids traditional drop shadows to maintain a clean, flat aesthetic. Instead, it utilizes **Tonal Layers** and **Strokes**:

- **Level 0 (Background):** Off-White (#FAFAFA).
- **Level 1 (Surface):** Pure White (#FFFFFF) with a 1px border (#E2E8F0). Used for cards and primary containers.
- **Level 2 (Interaction):** Subtle inner-glow or 2px stroke of Primary Green for focused states.
- **Overlays:** Modals and drawers use a 20% opacity Deep Charcoal backdrop blur to maintain context without heavy shadows.

## Shapes

The shape language is defined by a consistent **16px (1rem)** corner radius for all primary containers and cards. This creates a friendly, modern atmosphere that feels approachable.

- **Small Components:** Checkboxes and small tags use `rounded-sm` (4px).
- **Standard UI Elements:** Buttons, inputs, and cards use the system default (16px).
- **Pill Elements:** Status badges and specific filter chips use `rounded-full` for distinct visual differentiation.

## Components

- **Buttons:** Primary buttons feature Emerald Green backgrounds with White text. Minimum height 48px. Secondary buttons use a 1px stroke of the primary color on a transparent background.
- **Cards:** White background, 1px #E2E8F0 stroke, 16px corner radius. No shadow. Internal padding should be 16px or 24px.
- **Input Fields:** 16px rounded corners with a #E2E8F0 border. On focus, the border transitions to 2px Emerald Green. Labels sit above the field in Label-SM typography.
- **Chips & Badges:** Use Mint Ice (#F0FDF4) background with Emerald Green text for active or positive states. 
- **Lists:** Clean rows separated by a 1px #E2E8F0 bottom border. Items should have a minimum height of 56px for clear tap targets.
- **Progress Bars:** Thin 8px bars with Mint Green fills to show loyalty progress or financial goals.
- **Navigation:** Bottom navigation bar for PWA. Icons are Deep Charcoal (#0F172A) when inactive, transitioning to Emerald Green (#059669) when active.