---

version: 2.0
name: FLAE
description: "A dark, warm-intelligence visual system built around an ambient umber-black canvas, translucent frosted-glass surfaces, signature radiant orange accents, pill-shaped navigation and actions, and layered knowledge/company memory graph visuals. The identity balances enterprise-grade memory credibility with agentic developer density: expressive glowing gradients and knowledge graph motifs carry the marketing layer, while typography and compact UI patterns remain exceptionally clear, accessible, and functional."

colors:
  canvas: "#141009"
  canvas-elevated: "#1C1710"
  surface: "rgb(255 251 245 / 0.06)"
  surface-hover: "rgb(255 251 245 / 0.10)"
  hairline: "rgb(255 251 245 / 0.14)"
  highlight: "rgb(255 251 245 / 0.08)"
  ink: "#F5F0E8"
  ink-secondary: "#EAE3D6"
  ink-muted: "#B7AB9A"
  ink-faint: "#6E6457"
  primary: "#FF5B26"
  primary-vivid: "#F97316"
  primary-deep: "#7C2D12"
  primary-mid: "#FB923C"
  primary-soft: "rgb(249 115 22 / 0.16)"
  accent-amber: "#F59E0B"
  accent-teal: "#14B8A6"
  accent-indigo: "#6366F1"
  white: "#FFFFFF"
  destructive: "oklch(0.62 0.21 27)"
  code-accent: "#FB923C"

typography:
  fontFamily:
    display: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ui: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    mono: '"JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace'
  fontSize:
    display-xl: "56px"
    display-lg: "40px"
    heading-md: "29.6px"
    heading-sm: "20px"
    body-md: "15px"
    ui-sm: "13px"
    label-xs: "11px"
  fontWeight:
    regular: 400
    medium: 500
    semibold: 600
  lineHeight:
    display-xl: "67.2px"
    display-lg: "48px"
    heading-md: "35.52px"
    heading-sm: "28px"
    body-md: "24px"
    ui-sm: "18px"
    label-xs: "14px"
  letterSpacing:
    display-xl: "-1.12px"
    display-lg: "-0.4px"
    heading-md: "-0.01em"
    body-md: "normal"
    eyebrow: "0.08em"
  fontFeature:
    numeric: '"tnum" 1'

rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  xxl: "24px"
  pill: "9999px"
  full: "50%"

spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
  4xl: "64px"
  section-lg: "128px"
  section-xl: "160px"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.ui-sm}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    glow: "0 0 24px rgb(249 115 22 / 0.35)"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.ui-sm}"
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline}"
    padding: "10px 18px"
  nav-bar:
    backgroundColor: "rgb(20 16 9 / 0.65)"
    backdropBlur: "24px"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.ui-sm}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card-feature:
    backgroundColor: "{colors.surface}"
    backdropBlur: "20px"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.hairline}"
    padding: "{spacing.xl}"
-----------------------

# Overview

FLAE's visual language is an ambient umber-black company memory interface illuminated by radiant warm light and glowing neural connections. The dominant canvas is a deep warm near-black umber (`#141009`) rather than cold neutral gray, while warm off-white typography, signature radiant orange accents, translucent frosted glass panes, structured knowledge graphs, workplace integration marks, and glowing data transformation imagery reinforce the core concepts of organizational memory, continuous indexing, relationship discovery, and agentic context retrieval.

The brand uses modern geometric sans-serif for display titles, Inter for functional UI and dense tables, and JetBrains Mono for code references, chunk vectors, and MCP tool payloads.

This specification establishes an enterprise-grade visual standard: marketing surfaces feel atmospheric, luminous, and spacious; dense product UI inherits the precision, typography, restrained orange accents, and frosted glass depth without overwhelming functional dashboards with unneeded decorative effects.

## Key Characteristics

* **Near-black umber `{colors.canvas}`** (`#141009`) is the universal page canvas, providing warm organic depth.
* **Radiant orange is a controlled signal color**, not a flat background for ordinary cards or large containers.
* **Plus Jakarta Sans / Inter Medium** drives large headings with visibly tight negative tracking; **Inter** handles all functional UI.
* **Headlines are medium-to-semibold** rather than extra-bold, conveying elegance and intelligence.
* **Glowing Orange and Inverted White Pill CTAs** create the strongest action contrast; orange is also expressed as light, glow, border, and active node states.
* **Navigation floats inside a frosted rounded capsule** (`{rounded.pill}`) instead of behaving like a generic full-width navbar.
* **Content surfaces use translucent glass with 1px hairlines and inset highlights** rather than heavy, opaque Material drop shadows.
* **Knowledge graph nodes, ingestion streams, integration marks (Drive, Notion, Slack, GitHub), and semantic vectors** serve as the primary visual vocabulary.
* **Large marketing sections are spacious and theatrical**, while knowledge inspectors, memory streams, and MCP logs are intentionally compact and data-dense.
* **Mobile retains the luminous gradient and core graph metaphor** while cropping and simplifying decorative visuals cleanly.

---

# Colors

The core palette is calibrated to deliver enterprise warmth, high visual hierarchy, and complete WCAG 2.2 AA accessibility on dark glass.

### Brand & Accent

* **Primary / FLAE Orange Key** (`{colors.primary}` — `#FF5B26`, vivid `#F97316`): Use for primary pill CTAs, active route states, graph focus nodes, glowing halos, and focus rings. Avoid large flat page backgrounds.
* **Primary Deep / Grounding Ember** (`{colors.primary-deep}` — `#7C2D12`): Saturated brand anchor for glowing radial orbs and background depth. It is blended into the umber canvas rather than rendered as a flat card.
* **Primary Mid / Warm Apricot** (`{colors.primary-mid}` — `#FB923C`): Transitional warm glow, secondary gradient interpolation, and highlighted text links.
* **Primary Soft** (`{colors.primary-soft}` — `rgb(249 115 22 / 0.16)`): Subtle orange translucent fill for badges, active sidebar items, and interactive hover backgrounds.
* **White** (`{colors.white}` — `#FFFFFF`): Reserved for maximum-contrast controls such as the primary pill CTA text, high-priority status chips, and crisp focal highlights.
* **Synaptic Teal** (`{colors.accent-teal}` — `#14B8A6`): Complementary triad accent representing active synchronization, verified memory nodes, healthy data connectors, and success states.
* **Cognitive Indigo** (`{colors.accent-indigo}` — `#6366F1`): Split-complementary accent denoting cross-repository indexing, AI agent reasoning traces, and MCP tool executions.
* **Ambient Amber** (`{colors.accent-amber}` — `#F59E0B`): Warning indicators, stale memory notices, and queued document processing.
* **Code Accent** (`{colors.code-accent}` — `#FB923C`): Highlights syntax tokens in MCP JSON payloads, vector chunk IDs, and technical code snippets.

### Surface

* **Canvas** (`{colors.canvas}` — `#141009`): Default site background and the warm foundation of the brand.
* **Canvas Elevated** (`{colors.canvas-elevated}` — `#1C1710`): Inset containers, sidebar backgrounds, and low-emphasis elevated panels.
* **Surface** (`{colors.surface}` — `rgb(255 251 245 / 0.06)`): Standard frosted glass card and technical UI surface.
* **Surface Hover** (`{colors.surface-hover}` — `rgb(255 251 245 / 0.10)`): Elevated panel state, modal sheets, dropdowns, and hover states.
* **Hairline** (`{colors.hairline}` — `rgb(255 251 245 / 0.14)`): Quiet 1px glass outlines and internal row dividers.
* **Highlight** (`{colors.highlight}` — `rgb(255 251 245 / 0.08)`): Inset top-edge light catch simulating physical glass reflection.

### Text

* **Ink** (`{colors.ink}` — `#F5F0E8`): Highest-emphasis headings, section titles, and primary body copy.
* **Ink Secondary** (`{colors.ink-secondary}` — `#EAE3D6`): General readable text, navigation labels, and standard values.
* **Ink Muted** (`{colors.ink-muted}` — `#B7AB9A`): Supporting copy, metadata, timestamps, and secondary descriptions.
* **Ink Faint** (`{colors.ink-faint}` — `#6E6457`): Very low-emphasis metadata, inactive icons, and decorative technical IDs.

### Semantic

| Status | Token | Color | Role & Meaning |
|---|---|---|---|
| **Synced / Verified** | `chart-2` | `#14B8A6` | Memory indexed, live connection healthy, verified fact |
| **Indexing / Stale** | `chart-4` | `#F59E0B` | Ingestion in progress, memory pending re-verification |
| **Risk / Error** | `destructive` | `oklch(0.62 0.21 27)` | Sync failed, permission revoked, conflicting company decision |
| **Info / Neutral** | `ink-muted` | `#B7AB9A` | Inactive source, archival state, secondary metadata |

### Gradient System

The signature gradient behaves like a luminous memory chamber: deep umber `{colors.canvas}` at the dark extremity, saturated `{colors.primary-deep}` and `{colors.primary-mid}` through the warm radiant zone, then a soft golden-orange glow where the visual opens up.

The canvas employs fixed radial treatments positioned at `130% 120%` near the top-left and center-right:
* Top-left focal glow (`--orb-primary`: `#F97316`, opacity ≈ 0.35)
* Center-right warm atmosphere (`--orb-amber`: `#FB923C`, opacity ≈ 0.25)
* Bottom grounding ember (`--orb-ember`: `#7C2D12`, opacity ≈ 0.30)
* Blur radius: `--orb-blur: 140px`

Do not flatten the identity into a simple two-stop linear gradient; the ambient depth is created by multi-layered blurred radial fields refracted through frosted glass panes.

---

# Typography

FLAE pairs modern geometric sans-serif for confident brand statements with ultra-legible functional sans for product UI and monospace for code/memory payloads.

## Font Family

* **Display:** `{typography.fontFamily.display}`. Plus Jakarta Sans or Inter Medium/SemiBold for headings, hero statements, and section titles.
* **UI/Body:** `{typography.fontFamily.ui}`. Inter for all functional application UI, navigation, forms, tables, and documentation.
* **Technical/Code:** `{typography.fontFamily.mono}`. JetBrains Mono or SFMono for MCP tool payloads, chunk hashes, code references, and vector embeddings.

## Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---:|---:|---:|---:|---|
| `{typography.display-xl}` | 56px | 500–600 | 67.2px | -1.12px (-0.02em) | Primary hero/page display |
| `{typography.display-lg}` | 40px | 500–600 | 48px | -0.4px (-0.015em) | Major section heading & feature showcase |
| `{typography.heading-md}` | 29.6px | 500–600 | 35.52px | normal (-0.01em) | Product/feature section heading & graph headers |
| `{typography.heading-sm}` | 20px | 500–600 | 28px | normal | Card titles, modal headers, drawer titles |
| `{typography.body-md}` | 15px | 400 | 24px | normal | Standard documentation, chat messages, body copy |
| `{typography.ui-sm}` | 13px | 400–500 | 18px | normal | Navigation, buttons, compact metadata, table rows |
| `{typography.label-xs}` | 11px | 500–600 | 14px | 0.08em | Small category/status labels, eyebrow headers |
| Mono label | 11–12px | 400–500 | compact | 0.08em | Code metadata, MCP tool name, technical eyebrow |
| Numeric/data | 12–14px | 400–500 | compact | normal | Token counts, timestamps, metrics (tabular figures) |

## Principles

* **Keep large display typography at medium to semibold weight.** Do not compensate for hierarchy by jumping to 700–800.
* **Tighten tracking as text becomes larger;** the close character spacing is an essential part of the modern brand feel.
* **Use Inter for compact UI and body text** instead of forcing display fonts into dense 12–14px interfaces.
* **Avoid broad all-caps headings.** Uppercase is strictly reserved for tiny technical/status labels and 11–12px eyebrows.
* **Use `{typography.fontFeature.numeric}` (`tnum`)** for token counts, memory timestamps, file sizes, and aligned numeric data.
* **Mono text is a technical accent**, not the primary body face.
* **Center alignment is appropriate for compact hero statements and CTA clusters;** longer explanatory content and documentation should always be left aligned.

---

# Layout

## Spacing System

The layout system resolves cleanly onto a **4px base grid** with standard geometric increments:

* `{spacing.xs}` (4px) for micro gaps and icon offsets.
* `{spacing.sm}` (8px)–`{spacing.lg}` (16px) for internal control spacing, table row padding, and form fields.
* `{spacing.xl}` (24px) for ordinary frosted card padding.
* `{spacing.2xl}` (32px)–`{spacing.4xl}` (64px) for component groups and section gutters.
* `{spacing.section-lg}` (128px) and `{spacing.section-xl}` (160px) for large atmospheric marketing bands.

## Grid & Container

* Treat large marketing sections as visually full-bleed, with content kept inside a wide 1280px inner safe area.
* At desktop scale, use approximately 32–48px side gutters; exact project CSS wins if available.
* The system is comfortable at a 1440px viewport and does not force content into a narrow editorial column.
* Common content patterns are:
  * centered hero composition with floating glass refraction;
  * 2-column text/graph feature splits;
  * 3-up or 4-up compact feature/memory card groups;
  * horizontally repeated live ingestion streams and connector rows;
  * multi-column customer ROI & memory impact cards.
* Keep visual graph assets large enough to overlap or approach section boundaries where the composition calls for it.
* Do not put every section inside an identical centered card.

## Whitespace Philosophy

Marketing whitespace is large and theatrical around display headings and signature visuals. Inside memory mockups, nav elements, graph inspectors, and technical data tables, density becomes much tighter.

The contrast between spacious atmospheric sections and compact product-like artifacts is intentional. Do not normalize everything to one density.

---

# Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| **0** | `{colors.canvas}` (`#141009`) with no shadow | Page background & canvas base |
| **1** | `{colors.canvas-elevated}` (`#1C1710`) + subtle hairline | Inset containers, sidebar rails, low panels |
| **2** | `{colors.surface}` (`0.06` fill) + 20px blur + 1px hairline + inset top highlight | Standard glass cards, knowledge tiles, data tables |
| **3** | `{colors.surface-hover}` (`0.10` fill) + 32px blur + `--shadow-glass-pop` | Modals, command palette, context drawers, dropdowns |
| **4** | `{colors.primary}` (`#FF5B26`) + radiant glow (`0 0 24px rgb(249 115 22 / 0.35)`) | Highest-emphasis action controls & active focal nodes |

FLAE is not a generic shadow-heavy interface. Depth comes primarily from surface translucency, 1px glass hairlines, top-edge inset highlights, and warm orange refraction.

Avoid gray Material-style elevation.

---

# Shapes

## Border Radius Scale

| Token | Value | Use |
|---|---:|---|
| `{rounded.xs}` | 4px | Very small technical elements, code snippets, micro status tags |
| `{rounded.sm}` | 6px | Dense inner controls, sub-menu items, tooltips |
| `{rounded.md}` | 10px | Small badges, form inputs, icon buttons, inner panel cards |
| `{rounded.lg}` | 14px | Standard content cards, knowledge tiles, feature containers |
| `{rounded.xl}` | 18px | Floating navigation, dialog modals, search omnibars |
| `{rounded.xxl}` | 24px | Hero frames and large marketing containers |
| `{rounded.pill}` | 9999px | CTA buttons, pill controls, navigation capsules, filter tags |
| `{rounded.full}` | 50% | Circular avatars, active status pulsing dots, node vertices |

Do not apply one universal radius to the whole site.

## Image / Illustration / Photography Geometry

FLAE relies far more on technical illustration, knowledge graph topology, and UI composition than stock photography.

Typical visual geometry:
* **Knowledge Graph Nodes:** rounded frosted rectangles or pill chips with crisp tool/entity marks;
* **Synaptic Connectors:** fine 1px illuminated paths with animated glow pulses;
* **Workplace Tool Marks:** small crisp official vector assets (Google Drive, Notion, Slack, GitHub, Linear);
* **Section Visuals:** often oversized, layered with glass refraction and partially cropped;
* **Hero Frames:** large rounded outer geometry (`{rounded.xxl}`), especially along the lower edge;
* **Glowing Memory Chamber:** warm radiant orange and amber light source radiating behind translucent panes.

Use real vector/logo assets where possible. Do not approximate workplace marks with generic text.

---

# Components

## Buttons

### Primary CTA

Use `{colors.primary}` (`#FF5B26` / `#F97316`) background, `{colors.white}` text, `{rounded.pill}`, and compact Inter UI typography.

Rules:
* visually strongest action in a hero or navigation group;
* approximately 36–40px tall in observed compositions;
* hero CTA uses ~10px vertical / 20px horizontal padding;
* compact nav CTA uses ~6px vertical / 14px horizontal padding;
* optional arrow/chevron follows the label with roughly 8px spacing;
* carries a soft ambient orange halo: `box-shadow: 0 0 24px rgb(249 115 22 / 0.35)`.

**Hover:** Surface brightens slightly with intensified ambient glow (`0 0 32px rgb(249 115 22 / 0.50)`).

**Pressed:** Subtle scale down `transform: scale(0.98)` with immediate tactile feedback.

**Focus:** 2px solid `{colors.primary}` outline with 2px offset and soft halo (`0 0 0 4px rgb(249 115 22 / 0.20)`).

**Disabled:** 50% opacity, `pointer-events: none`, blur and glow removed for flatness.

### Secondary CTA

Usually transparent or frosted glass (`{colors.surface}`) with `{colors.ink}` or `{colors.ink-secondary}` text and a 1px `{colors.hairline}` border.

Do not make primary and secondary actions equally prominent.

## Cards & Containers

### Feature Card

* `{colors.surface}` frosted glass pane (`0.06` opacity + 20px blur).
* `{rounded.lg}` (14px).
* Approximately `{spacing.xl}` (24px) internal padding.
* 1px `--glass-border` with inset top highlight.
* Heading in Plus Jakarta Sans / Inter Medium (`{colors.ink}`).
* Supporting copy in `{colors.ink-muted}`.
* Optional small orange or teal icon in a `{rounded.md}` container.

### Customer / Result Card

FLAE surfaces customer stories structured around compact result statements such as reduced context-loss or faster engineering onboarding.

Use:
* one prominent KPI or short benefit (e.g. "85% faster PR reviews");
* one customer / team identity;
* a concise supporting statement;
* restrained link affordance;
* avoid oversized testimonial quotation styling.

### Pricing Card

Organizes the offer around Developer, Team, and Enterprise Company Memory plans with feature lists and separate self-serve / sales actions.

For pricing screens:
* keep plan cards dark and structurally simple using frosted glass;
* preserve a clear distinction between standard and custom enterprise tiers;
* use the glowing orange pill only for the primary recommended action;
* avoid introducing colorful SaaS plan-card backgrounds.

### Knowledge Node Card

* Compact interactive tile representing a document, person, PR, or architectural decision.
* Includes source mark (e.g. GitHub/Notion), entity title, relevance score badge, and timestamp.
* Active state adds a radiant orange outline and soft halo.

## Inputs & Forms

The primary input is the **Search Omnibar / AI Prompt Input**, alongside compact settings and filter fields.

For inputs:
* stay on dark translucent surfaces (`{colors.surface-hover}`);
* use `{colors.hairline}` for default 1px outlines;
* use `{colors.ink}` for entered text and `{colors.ink-muted}` for placeholders;
* focus state triggers a 2px `{colors.primary}` ring with a soft orange halo (`0 0 20px rgb(249 115 22 / 0.25)`);
* keep radii consistent with adjacent pill/card geometry (`{rounded.pill}` or `{rounded.md}`).

## Navigation

### Desktop

The navigation is a signature floating composition:
* FLAE mark sits toward the left.
* Main route links ("Knowledge", "Agents", "Graph", "Integrations", "Settings") sit inside a rounded dark capsule (`rgb(20 16 9 / 0.65)` + 24px blur + `{rounded.pill}`).
* Active route uses `{colors.primary-soft}` background with vivid orange text.
* Login / Docs is low emphasis.
* "Connect Memory" / "Open App" is a glowing orange pill CTA.
* A narrow announcement line may appear centered above the primary navigation.

The announcement bar should be thin, centered, and visually subordinate to the nav.

### Mobile

Mobile removes the long link list and keeps:
* FLAE flame/memory icon;
* search / login shortcut;
* orange primary CTA;
* circular/capsule hamburger menu opening a full-screen frosted drawer (`32px` blur).

Do not shrink the full desktop navigation until it barely fits.

## Pills, Tags, and Chips

Use compact rounded labels for:
* status (Synced in Synaptic Teal, Indexing in Amber, Error in Red);
* workplace source categories (Notion, Slack, Drive, GitHub);
* small entity identifiers (People, Projects, Decisions, Code);
* technical eyebrow labels.

Technical eyebrow labels use `{typography.fontFamily.mono}`, approximately 11–12px type, uppercase, and wide `{typography.letterSpacing.eyebrow}` (0.08em) tracking.

Keep them visually secondary to CTAs.

## Tables / Data UI

Used for Knowledge Base inventories, Sync Event Logs, and MCP Tool invocation history:
* use compact rows with 12px vertical padding;
* align timestamps, token metrics, and vector counts consistently;
* use tabular numerals (`tnum`);
* use mono for entity hashes and chunk IDs;
* make status labels small rather than button-like;
* dividers are low-contrast 1px hairlines (`rgb(255 251 245 / 0.08)`);
* integration icons remain visually crisp and small (16–18px);
* avoid traditional heavy opaque table borders.

## Signature Components

### 1. Ambient Knowledge Gradient Hero

This is the strongest reusable brand signature.

Composition:
1. `{colors.canvas}` upper field.
2. Floating glass panels showcasing company memory stats and agent integrations.
3. A warm radiant orange focal glow (`--orb-primary`) refracted through frosted surfaces.
4. Synaptic connection lines linking people, documents, and code decisions.
5. Soft amber and ember ambient glow expanding through the section.
6. Centered display headline and short supporting copy.
7. Glowing orange pill CTA paired with a quieter frosted secondary action.
8. Large `{rounded.xxl}` outer section geometry.

The desktop, tablet, and mobile layouts preserve this visual idea even when content is cropped or repositioned.

### 2. Unstructured Data → Embedding → Company Memory Visual

Use recognizable source objects (Slack threads, Notion pages, GitHub PRs), passing through a narrow illuminated transformation boundary, converting into structured, interconnected knowledge nodes.

The goal is to visualize continuous organizational intelligence, not merely decorate the page with generic light.

### 3. Realtime Memory Stream

A repeated strip or timeline panel showing live organizational events:
* synced documents and PR merges;
* workplace connector marks;
* automated decision extractions;
* timestamp and author metadata;
* aggregate indexed memory metrics.

Do not substitute lorem-ipsum dashboard charts.

### 4. Interactive Knowledge Graph & Context Inspector

Product pages use realistic graph topologies and MCP context drawers to explain how agents query memory rather than relying solely on abstract diagrams.

Mockups feel functional and credible, with compact typography, clear relationship edges, and realistic business context.

### 5. Structured Vector / Embedding Code Texture

Structured monospace token blocks and vector embeddings act as a brand-specific decorative texture.

Rules:
* use actual mono characters (`{typography.fontFamily.mono}`);
* keep opacity subordinate to primary content;
* use sparingly;
* do not turn every background into code noise.

---

# Do's and Don'ts

## Do

* **Do** use `{colors.canvas}` (`#141009`) as the dominant umber canvas.
* **Do** use `{colors.primary}` (`#FF5B26` / `#F97316`) as controlled highlights, glowing CTAs, and luminous gradient material.
* **Do** pair warm orange with Synaptic Teal (`#14B8A6`) and Cognitive Indigo (`#6366F1`) for balanced status and agent reasoning states.
* **Do** preserve large negative space around major display typography.
* **Do** keep display headings medium-to-semibold weight and tightly tracked.
* **Do** use Plus Jakarta Sans / Inter for major brand headings and Inter for functional UI.
* **Do** use glowing orange pill CTAs for the most important actions.
* **Do** build product visuals from real workplace connector marks, knowledge graphs, code diffs, and believable UI.
* **Do** use tabular figures for token counts, metrics, and timestamps.
* **Do** keep technical surfaces compact inside otherwise spacious marketing sections.
* **Do** use different radius tiers for tiny controls, cards, nav capsules, and large hero frames.
* **Do** let real company memory capability drive the visual metaphor.

## Don't

* **Don't** turn the site into a generic cold-gray or pure-black SaaS theme.
* **Don't** use `{colors.primary}` or `{colors.primary-deep}` as a flat solid fill across large ordinary sections.
* **Don't** make every card orange or heavily colored.
* **Don't** use strong gray Material drop shadows.
* **Don't** use pure white for every body-text tier.
* **Don't** use display fonts for dense small body copy.
* **Don't** make display headings extra-bold (700–900).
* **Don't** put the entire desktop nav into a cramped mobile row.
* **Don't** introduce arbitrary unrelated neon accents for visual variety.
* **Don't** replace the brand's technical visuals with generic stock photography.
* **Don't** fake workplace integration logos with plain text.
* **Don't** center-align long technical explanations or documentation.
* **Don't** promote one-off decorative details into mandatory global components.

---

# Responsive Behavior

## Breakpoints

| Name | Width | Key Changes |
|---|---:|---|
| **Mobile** | `<768px estimated` | Collapsed nav sheet, single-column content, cropped decorative visuals, smaller display type, 44px touch targets |
| **Tablet** | `768–1199px estimated` | Reduced gutters, mostly retained desktop composition, narrower visuals and text |
| **Desktop** | `≥1200px estimated` | Full floating capsule navigation, wide hero composition, multi-column knowledge matrices |

Do not create additional breakpoints unless an implementation actually needs them.

## Touch Targets

Observed mobile CTA/menu controls appear approximately 36–40px high. For newly implemented controls, increasing hit areas to at least **44×44px** without enlarging the visible pill geometry is mandatory for accessibility.

## Collapsing Strategy

* 3–4 column feature grids collapse to two columns, then one.
* Text/visual splits stack vertically with headline and CTA kept above secondary supporting detail.
* Decorative graph imagery is cropped rather than scaled until illegible.
* Full navigation links disappear into a drawer instead of wrapping awkwardly.
* Data tables become horizontally scrollable or convert into stacked frosted cards.
* Large section padding contracts materially on mobile (64–80px) while preserving generous breathing room.
* Centered hero copy remains viable on mobile when line lengths stay short.
* Interactive 3D/Canvas graphs provide a list/card fallback on mobile viewports.

## Image Behavior

Mobile references intentionally crop parts of the graph topology and connector marks while keeping the central luminous memory core legible.

Prefer art-directed cropping over uniformly scaling the entire desktop composition. Do not hide every decorative asset; the glowing memory refraction is part of the identity.

---

# Interaction States

### Hover

Surfaces transition smoothly (`150ms`) from `--glass` to `--glass-strong`, 1px hairline borders brighten, and interactive buttons intensify their ambient orange halo (`0 0 32px rgb(249 115 22 / 0.50)`). Use subtle changes rather than dramatic scale or translation effects.

### Pressed / Active

Tactile downward scale (`transform: scale(0.98)`) with immediate visual feedback.

### Focus

Preserve a clearly visible keyboard focus treatment: 2px solid `{colors.primary}` outline with 2px offset and soft halo (`0 0 0 4px rgb(249 115 22 / 0.20)`).

### Disabled

50% opacity, `pointer-events: none`, backdrop blur and glow removed to convey flat inactivity.

### Selected

For navigation or small categorical controls, selected state uses `{colors.primary-soft}` background with vivid orange text and a 2px indicator bar.

### Loading

Frosted skeleton placeholders on `--glass-strong` with a smooth shimmer animation.

### Error

Destructive red hairline border (`oklch(0.62 0.21 27)`) with contextual warning tooltip.

---

# Accessibility Constraints

* Ensure compliance with **WCAG 2.2 AA** contrast standards across all components.
* Keep primary content in `{colors.ink}` (`#F5F0E8`) or `{colors.ink-secondary}` (`#EAE3D6`) rather than faint low-contrast text.
* Measure contrast against the **worst-case background** (the brightest underlying orb), not just the base canvas.
* If a glass panel sits over an intense ambient orb, automatically elevate the panel to `--glass-strong` or insert a subtle dark scrim (`rgb(20 16 9 / 0.45)`).
* Do not rely solely on color hue to distinguish critical status (always pair with text or icon).
* Preserve visible keyboard focus across all interactive elements.
* Avoid shrinking technical labels below 11px.
* Respect `prefers-reduced-motion` by disabling ambient orb drift and replacing blur-in transitions with instant opacity fades.
* Provide a fallback solid fill (`#1C1710`) for browsers lacking `backdrop-filter` support.

---

# Asset Guidance

### FLAE Logo

Reuse the official SVG vector mark (luminous flame/neural memory node) rather than recreating it with CSS.

### Integration & Tool Marks

Reuse authorized, official SVG vector marks for Google Drive, Notion, Slack, GitHub, Linear, Jira, and Figma. Do not trace them manually.

### Memory Cards & Graph Nodes

Create composited UI assets using realistic frosted card geometry, 1px hairlines, and typography when an exact product asset is unavailable.

### Ambient Glow & Refraction Orbs

Approximated with CSS radial gradients, `filter: blur(140px)`, and layered positioning behind frosted glass panes.

### Vector Embeddings & Structured Payloads

Generate as actual text/HTML/SVG using `{typography.fontFamily.mono}` so it remains crisp at varying resolutions.

### Product Screens

Prefer real product screenshots or intentionally recreated product mockups. Do not fabricate functionality that the product does not expose.

---

# Implementation Guidance

Define semantic variables first in `src/styles.css`:

```css
:root {
  color-scheme: dark;

  /* Canvas & Elevated Containers */
  --flae-canvas: #141009;
  --flae-canvas-elevated: #1c1710;
  --flae-surface: rgb(255 251 245 / 0.06);
  --flae-surface-hover: rgb(255 251 245 / 0.10);
  --flae-hairline: rgb(255 251 245 / 0.14);
  --flae-highlight: rgb(255 251 245 / 0.08);

  /* Typography / Ink */
  --flae-ink: #f5f0e8;
  --flae-ink-secondary: #eae3d6;
  --flae-ink-muted: #b7ab9a;
  --flae-ink-faint: #6e6457;

  /* Brand / Radiant Orange */
  --flae-primary: #ff5b26;
  --flae-primary-vivid: #f97316;
  --flae-primary-deep: #7c2d12;
  --flae-primary-mid: #fb923c;
  --flae-primary-soft: rgb(249 115 22 / 0.16);

  /* Harmonious Accents */
  --flae-accent-teal: #14b8a6;
  --flae-accent-indigo: #6366f1;
  --flae-accent-amber: #f59e0b;
  --flae-destructive: oklch(0.62 0.21 27);

  /* Radii */
  --flae-radius-xs: 4px;
  --flae-radius-sm: 6px;
  --flae-radius-md: 10px;
  --flae-radius-card: 14px;
  --flae-radius-nav: 18px;
  --flae-radius-hero: 24px;
  --flae-radius-pill: 9999px;

  /* Shadows & Glows */
  --flae-shadow-glass: 0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 var(--flae-highlight);
  --flae-shadow-pop: 0 16px 48px -12px rgb(0 0 0 / 0.50), inset 0 1px 0 var(--flae-highlight);
  --flae-glow-primary: 0 0 24px rgb(249 115 22 / 0.35);
}
```

Implementation rules:
* Map headings to Plus Jakarta Sans or Inter Medium.
* Map body and functional UI text to Inter.
* Map technical payloads, tool calls, and embedding vectors to JetBrains Mono.
* Use reusable variants for `button-primary`, `button-secondary`, `nav-bar`, `card-feature`, `knowledge-node`, and `eyebrow`.
* Do not hardcode orange or glass values independently inside components; reference semantic tokens.
* Enable tabular figures (`tnum`) on all table data, token counts, and timestamps.
* Use grid/flex layouts for memory streams and feature groups rather than positioning every item absolutely.
* Reserve absolute positioning for signature hero background orbs where compositional overlap is intentional.
* Keep ambient orb artwork isolated in reusable background wrappers so ordinary product content does not inherit unintended blur overhead.
* Keep the marketing and product layers related through typography, color accents, radii, and technical graph language, while allowing dense product/dashboard surfaces to remain utilitarian.

## Iteration Guide

1. Change one component family at a time.
2. Reference documented tokens instead of introducing new hardcoded colors, radii, or typography values.
3. Create a named variant when a genuinely new component treatment is needed; do not silently redefine an existing primitive.
4. Preserve the hierarchy between the glowing orange primary action and quieter secondary actions.
5. Preserve the hierarchy between atmospheric marketing sections and dense functional UI.
6. Reuse `{spacing.*}`, `{rounded.*}`, and `{typography.*}` tokens before adding new values.
7. Keep orange as a controlled radiant accent rather than a universal flat fill.
8. Verify all changes at desktop, tablet, and mobile sizes.
9. Check intentional cropping of hero/graph artwork rather than merely scaling desktop compositions.
10. Do not introduce visual patterns that cannot be traced back to this design system or new source evidence.
11. When original CSS, design tokens, or component source becomes available, replace estimated values with exact project values rather than maintaining the estimate for backward consistency.
12. Validate font licensing before shipping or redistributing font files; use the documented fallback when unavailable.
