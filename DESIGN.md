---
name: ScamShield
description: Local message review interface
colors:
  risk: "oklch(49% 0.16 32)"
  risk-soft: "oklch(92% 0.035 32)"
  safe: "oklch(43% 0.085 145)"
  safe-soft: "oklch(92% 0.035 145)"
  unknown: "oklch(46% 0.105 75)"
  unknown-soft: "oklch(93% 0.038 75)"
  paper: "oklch(96.5% 0.006 25)"
  surface: "oklch(99% 0.002 25)"
  ink: "oklch(25% 0.018 25)"
  muted: "oklch(45% 0.018 25)"
  line: "oklch(82% 0.018 25)"
  line-strong: "oklch(62% 0.022 25)"
  link: "oklch(45% 0.13 255)"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
rounded:
  control: "6px"
  input: "6px"
components:
  button-primary:
    backgroundColor: "{colors.risk}"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.input}"
---

# Design System: ScamShield

## Overview

Warm neutral surfaces and serif investigation headings frame red, green and amber evidence states. The editable message intake uses a sans-serif heading, explicit labels and a bordered form.

Captured from frontend/src/styles/tokens.css, app.css and product.css on 2026-09-07. This records the existing interface; it does not assert accessibility conformance or production readiness. BUILD-BRIEF.md and LOCAL-PRODUCT.md retain workflow scope.

## Colors

The frontmatter records selected reused light-theme primitives. Dark theme overrides live in `frontend/src/styles/tokens.css` under `:root[data-theme="dark"]`; retain these variable bindings when extending components. Risk, safe and unknown have distinct foreground and soft-background pairs; blue identifies links. Neutral tokens separate the canvas, working surfaces, text and rules.

## Typography

Inter/system sans is the body stack. Iowan Old Style, Palatino Linotype, Book Antiqua, Palatino and Georgia form the serif stack for the wordmark and investigation headings. The editable intake heading is sans-serif at weight 650, clamp(28px, 4vw, 42px), line-height 1.15 and -0.03em tracking. Case identifiers use a system monospace stack.

## Layout

The intake is capped at 1160px and pairs explanatory text with a form. At 760px the intake and case workspace stack vertically. New workspace controls tighten at 650px. Header adjustments at 1100px and 700px keep the overview action and theme control separate. Existing investigation layout also changes at 1050px.

## Elevation & Depth

The primary action has a solid colored lower shadow that changes with hover and press. The desktop header uses a translucent surface with 14px backdrop blur; it becomes static on narrow screens. Evidence columns use tonal layering and borders.

## Shapes

The primary action and evidence panels are square. Text inputs use 6px corners. The message excerpt has a chat-bubble silhouette with three 22px corners and one 3px corner.

## Components

Primary actions use the risk color, 46px minimum height, 11px by 17px padding and weight 800. Inputs, selects and textareas use surface fill, strong line borders, 12px padding and 44px minimum height. The textarea resizes vertically. Status badges use explicit words alongside risk/safe/unknown color. Overview links receive an underline on hover. Disabled buttons lower opacity and show a wait cursor.

The sidecar provides five source-derived HTML/CSS previews. They illustrate appearance and CSS states; they do not execute application workflows. Tokens inherit from the application root.

## Do's and Don'ts

- Do preserve the existing theme variables, typography roles and responsive stacking.
- Do retain explicit field labels and text for status states.
- Don't replace the approved visual identity or introduce a new brand metaphor.
- Don't infer product capabilities or conformance from these visual records.
