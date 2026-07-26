# Environment Settings Design Reference

> [!IMPORTANT]
> This Neuform artifact is inspiration and reference material only; it is not the production FLAE design-system contract. Production implementation must follow the root [`DESIGN.md`](../../DESIGN.md).

---
version: "1.0"
name: "Environment Settings"
description: "Environment Settings Dashboard Section is designed for demonstrating application workflows and interface hierarchy. Key features include clear information density, modular panels, and interface rhythm. It is suitable for product showcases, admin panels, and analytics experiences."
colors:
  primary: "#F97316"
  secondary: "#EAE6DB"
  accent: "#EA580C"
  background: "#F4F2EC"
  surface: "#EAE6DB"
  text-primary: "#111827"
  text-secondary: "#4B5563"
  border: "#DFD9CE"
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
  card: "40px"
  control: "18px"
  pill: "9999px"
components:
  card:
    background: "Use the surface token with subtle borders and HTML-matched shadow depth"
    radius: "Match the declared card radius token"
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

Anchor the palette in primary #F97316, secondary #EAE6DB, accent #EA580C, background #F4F2EC, surface #EAE6DB, text-primary #111827. Keep background, surface, text, and border roles distinct so generated layouts retain the same contrast pattern as the source.

## Typography

Use Inter for display moments and Inter for body copy unless the HTML clearly demands a compatible fallback. Labels and technical metadata should use JetBrains Mono or an equivalent mono face.

## Layout

Keep spacing deliberate and stable. Favor the same grid direction, max-width behavior, card density, and responsive stacking seen in the HTML. Do not replace distinctive source structures with generic SaaS sections.

## Components

Dashboard, chart, and data panels should preserve their compact operational hierarchy, nested surfaces, and metric emphasis.

## Motion

Preserve existing motion cues such as masked reveals, staggered entrance, hover lift, scroll-triggered transitions, and ambient movement. Keep easing smooth and restrained.

## WebGL & Effects

If the source includes canvas, WebGL, Three.js, gradients, particles, or atmospheric effects, rebuild them as supporting layers behind the content. Keep effects performant, responsive, and secondary to the interface.

## Guardrails

- Do not flatten the source into a generic card grid.
- Do not swap the color mode unless the source clearly supports it.
- Preserve the first viewport signal, focal object, and visual density.
- Keep buttons, cards, and badges aligned to the same radius and border language.
