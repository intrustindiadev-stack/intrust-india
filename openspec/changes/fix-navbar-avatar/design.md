## Context

The top navigation bar displays the user's profile avatar. Currently, there is an issue where the avatar image lacks a border-radius when using Next.js `next/image` in desktop view, causing it to render as a square. Moreover, when the user's `profile.avatar_url` is broken or fails to load, the image area breaks or shows nothing, instead of gracefully falling back to a default state (like the user's initial).

## Goals / Non-Goals

**Goals:**
- Ensure the profile avatar renders as a circle across all devices.
- Provide a robust fallback mechanism if the avatar image fails to load.

**Non-Goals:**
- Completely redesigning the navigation bar.
- Refactoring the entire authentication or profile fetching logic.

## Decisions

- **CSS Fix for Border Radius**: The `<Image>` tag with `fill` positions itself absolutely based on the closest relative parent. We will ensure the immediate wrapper has both `overflow-hidden` and `rounded-full` classes, and we'll apply `rounded-full` directly via class or style if needed to fix the clipping issue. The simplest fix is adding `rounded-full` to the `<Image>` component's `className` directly, or ensuring the container is properly clipping the absolute element (it requires `relative`, `overflow-hidden`, and `rounded-full` together on the immediate parent div).
- **Fallback for Broken Images**: We will add an `onError` handler to the image rendering logic. If the image fails to load, a state variable (e.g., `imageError`) will be set to `true`. When `imageError` is true, the component will render the fallback (the `displayInitial(profile, user)` component) instead of the broken image.

## Risks / Trade-offs

- **Risk**: Performance impact of adding state to the `Navbar` for image loading.
  - **Mitigation**: The state is minimal (a boolean) and only triggers on error, so the impact is negligible.
- **Risk**: MobileNav image handling.
  - **Mitigation**: We'll verify if `MobileNav` also suffers from this and apply a similar fix.
