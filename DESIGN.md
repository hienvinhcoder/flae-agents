---
version: "1.0"
name: "Environment Settings"
description: "Environment Settings Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "oklch(70.5% 0.187 45)"
  primary-hover: "oklch(66.5% 0.187 45)"
  primary-active: "oklch(62.5% 0.187 45)"
  primary-soft: "oklch(93% 0.06 60)"
  background: "oklch(98.5% 0.006 85)"
  surface: "oklch(100% 0 0)"
  surface-raised: "oklch(100% 0 0)"
  surface-interactive: "oklch(94% 0.012 85)"
  text-primary: "oklch(18% 0.02 60)"
  text-secondary: "oklch(25% 0.02 60)"
  text-muted: "oklch(48% 0.02 60)"
  on-primary: "#2A241C"
  link-focus-ai: "#9A3412"
  border: "oklch(90% 0.015 80)"
  sidebar: "oklch(22% 0.02 60)"
  sidebar-foreground: "oklch(94% 0.012 85)"
  sidebar-accent: "oklch(28% 0.02 60)"
  sidebar-border: "oklch(30% 0.02 60)"
typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: "64px"
    fontWeight: 500
    lineHeight: "1.04"
    letterSpacing: "0"
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.6"
  label-md:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.2"
spacing:
  base: "8px"
  gap: "16px"
  card-padding: "24px"
  section-padding: "80px"
rounded:
  card: "10px"
  control: "8px"
  dialog: "14px"
  pill: "9999px"
components:
  card:
    background: "Use the raised-surface token with a 1px border and no shadow"
    radius: "Use the 10px card radius token"
  button:
    background: "Use primary or accent colors for the main action"
    radius: "Use the control or pill radius based on the source HTML"
---

# Environment Settings

Source: Neuform Featured templates from top creators. Author: Aksonvady Phomhome (@aksonvady). Views: 90; favorites: 32; remixes: 4.
Tags: dashboard, animated, webgl, threejs, bento, charts, navigation, flow.

## Overview

Environment Settings Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences.

A Living Space Environment Settings 45% Ambient 65° 72° 80° Set Point 72 °F Reaching target in 12m Thermal History 19 20 21 22 23 24 25 26 27 28 29 30 31 Key Functions HVAC System Actively maintaining 72°F Router Status…

## Composition

Use the attached HTML reference as the source of truth. Preserve the visible hierarchy, first-screen composition, section rhythm, density, and interaction tone before adapting copy or content.
Key visible headings include: Environment Settings; Thermal History; Key Functions; HVAC System; Router Status; Lighting Array.

## Colors

Anchor the reference palette in orange #F97316, canvas #FAF8F3, white #FFFFFF, primary ink #1F1B15, dark sidebar #2A241C, soft sidebar text #EAE6DB, muted text #6E6558, and deep-orange links and focus indicators #9A3412. The executable CSS uses the OKLCH role tokens declared above: primary `oklch(70.5% 0.187 45)`, primary-soft `oklch(93% 0.06 60)`, canvas `oklch(98.5% 0.006 85)`, white surfaces `oklch(100% 0 0)`, interactive surfaces `oklch(94% 0.012 85)`, dividers `oklch(90% 0.015 80)`, primary text `oklch(18% 0.02 60)`, secondary text `oklch(25% 0.02 60)`, and muted text `oklch(48% 0.02 60)`. Keep background, surface, text, and border roles distinct.

Narrow contrast deviation: near-white text on orange is approximately 2.72:1 and is not used for small labels. Use #2A241C on #F97316, approximately 5.48:1, for small button and active-navigation text.

## Typography

Use Inter for display moments and Inter for body copy unless the HTML clearly demands a compatible fallback. Labels and technical metadata should use JetBrains Mono or an equivalent mono face.

## Layout

Use a 256px expanded sidebar, a 72px collapsed rail, a 64px header, and a 1600px maximum content width. Keep spacing deliberate and stable. Favor the same grid direction, card density, and responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.

## Components

Use a 10px base card radius and border-first cards: a 1px divider-colored border on the raised white surface, without a default shadow. Dashboard, chart, and data panels should preserve their compact operational hierarchy, nested surfaces, and metric emphasis.

## Motion

Preserve existing motion cues such as masked reveals, staggered entrance, color transitions, scroll-triggered transitions, and ambient movement. Pressed controls must not move layout. Keep easing smooth and restrained, and honor reduced-motion preferences.

## WebGL & Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

## Guardrails

- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.
