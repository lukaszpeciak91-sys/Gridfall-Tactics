# Animation Vocabulary

**Status:** CANONICAL for Gridfall Tactics animation terminology.

## Purpose

Provide a shared animation vocabulary for Gridfall Tactics so animation tasks are described consistently and implemented with predictable motion.

This document is a terminology reference, not an animation design guide.

## Core Motion Terms

### Fade

Animate opacity only.

Example:
Fade in battle banner over 180 ms.

### Scale

Animate transform scale.

Common usage:

- Pop in
- Pop out
- Reward panels
- Modal appearance

Avoid excessive scaling above `1.08` unless explicitly requested.

### Translate

Movement along X/Y.

Examples:

- Slide from top.
- Slide from bottom.
- Slide 12px upward.

### Pop In

Small overshoot followed by settle.

Typical use:

- Cards
- Buttons
- Reward icons
- Achievement popups

### Stagger

Animate multiple elements with a small delay.

Typical use:

- Opening hand
- Achievements
- Campaign dots
- Reward lists

### Hold to Confirm

Animation supporting long press confirmation.

Should communicate progress, never surprise the player.

### Shake

Short horizontal movement indicating invalid action.

Reserved for:

- Invalid targets
- Blocked actions
- Unavailable interaction

### Pulse

Repeated subtle emphasis.

Reserved for:

- Tutorial focus
- Primary CTA
- Important notifications

Avoid permanent pulsing.

### Idle Animation

Very subtle ambient movement.

Small amplitude.
Long duration.
Should never distract gameplay.

### Glow

Soft light around an element.

Preferred over thick outlines for selection states.

### Bloom

Soft light spill around bright elements.

Use sparingly.

## Timing Guidelines

- **Very Fast:** 80–120 ms
- **Fast:** 120–180 ms
- **Standard:** 180–250 ms
- **Large UI:** 250–350 ms
- **Celebration:** 350–600 ms

Avoid unnecessarily long animations.

## Easing

- **Default:** ease-out
- **Spring:** only when explicitly requested
- **Linear:** progress indicators only

## Performance Rules

Prefer animating:

- Transform
- Opacity

Avoid animating whenever possible:

- Width
- Height
- Top
- Left

Prefer GPU-friendly animations.

## Gridfall Style

Animations should feel:

- Responsive
- Readable
- Subtle
- Gameplay-first

Never delay gameplay for visual spectacle.

Animation exists to improve clarity, not to show off.

## Example Task Language

Good:

- "Pop in the reward panel using scale + fade over ~180 ms."
- "Reveal opening hand using staggered fade + translate."
- "Shake invalid target horizontally for ~120 ms."
- "Use a soft glow instead of a thick outline."

Bad:

- "Make it cooler."
- "Make it more dynamic."
- "Make it prettier."
