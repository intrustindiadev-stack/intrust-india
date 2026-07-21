## Why

The `/career` and `/career/apply` pages currently do not support dark mode. Their styling relies on hardcoded light mode classes (such as `bg-gray-50`, `bg-white`, and `text-gray-900`), which causes a jarring user experience when the rest of the application is viewed in dark mode. Adding dark mode support ensures visual consistency and a better user experience across the app.

## What Changes

- Add appropriate `dark:` utility classes to layout containers, cards, text elements, and borders in `app/(customer)/career/page.jsx`.
- Update the multi-step application form in `app/(customer)/career/apply/page.jsx` with `dark:` variants for backgrounds, text, inputs, and form controls to seamlessly blend with the dark theme.
- Ensure the hero sections, testimonial cards, open roles lists, and success/KYC states gracefully adapt to dark mode.

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `career-application-flow`: Update the UI requirements to ensure compatibility with both light and dark themes.

## Impact

- **Affected code:** 
  - `app/(customer)/career/page.jsx`
  - `app/(customer)/career/apply/page.jsx`
- **UI:** The career and career application pages will respond to the system or user's dark/light mode preference seamlessly.
