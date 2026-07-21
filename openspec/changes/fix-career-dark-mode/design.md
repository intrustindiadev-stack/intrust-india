## Context

The `/career` page and the `/career/apply` application form page currently lack dark mode support. When users navigate these pages with a dark theme enabled, they are met with stark white backgrounds and light-mode text, breaking the application's visual consistency.

## Goals / Non-Goals

**Goals:**
- Implement seamless dark mode support across the main `/career` landing page and the multi-step `/career/apply` application flow.
- Ensure all input fields, select menus, containers, text content, and borders adapt to the active theme.

**Non-Goals:**
- Modifying the underlying form state logic or validation (Zod schemas).
- Changing the primary layout structure or responsive behavior of these pages.

## Decisions

- **Dark Mode Utilities**: We will introduce standard Tailwind `dark:` variant classes across the pages.
  - Page Backgrounds: `bg-gray-50` will be supplemented with `dark:bg-gray-900`.
  - Content Containers: `bg-white` will become `dark:bg-gray-800` or `dark:bg-gray-900`.
  - Text Colors: Primary text `text-gray-900` will get `dark:text-white` or `dark:text-gray-100`, while secondary text `text-gray-500` will get `dark:text-gray-400`.
  - Borders: `border-gray-100` and `border-gray-200` will get `dark:border-gray-700` or `dark:border-gray-800`.
- **Form Elements**: We will update inputs, textareas, and select menus in the `InputField` and `SelectField` components to have `dark:bg-gray-800`, `dark:text-white`, and `dark:border-gray-700`.

## Risks / Trade-offs

- **Risk**: Contrast issues if the wrong shade of gray is used in dark mode.
  - **Mitigation**: Rely on the established `gray-800` for cards and `gray-900` for main backgrounds, which matches the rest of the application's dark mode palette.
