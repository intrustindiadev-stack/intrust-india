## Why

The profile avatar component in the top navbar currently lacks a border-radius in the desktop view when rendered via `next/image`, causing it to appear as a square instead of the intended circular shape. Additionally, there's a bug where the profile picture occasionally fails to render, likely due to how the image source or empty state is being handled.

## What Changes

- Update `components/layout/Navbar.jsx` to correctly apply `rounded-full` or adjust CSS for the desktop profile avatar image using `next/image`.
- Add a fallback rendering mechanism for `next/image` in cases where the `profile.avatar_url` is invalid, null, or fails to load, gracefully falling back to the user's initial.
- Ensure the mobile view's standard `<img>` tag also properly handles load failures or missing URLs.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `profile`: Adding resilience to avatar image rendering and fixing layout border-radius.

## Impact

- **Affected code:** `components/layout/Navbar.jsx`, potentially `components/layout/MobileNav.jsx`.
- **UI:** The top navigation profile image will correctly render as a circle and will be more reliable.
