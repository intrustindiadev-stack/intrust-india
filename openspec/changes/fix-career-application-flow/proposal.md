## Why

The current career application flow allows users to bypass required fields by using empty spaces, skipping step validation entirely for the professional background section, and only checks for authentication at the very final submission step. This creates a poor user experience where applicants can invest time filling out their details only to lose their progress when forced to log in, and allows incomplete or invalid data to potentially slip through.

## What Changes

- Add strict validation using Zod schemas for Step 2 (Personal Info) and Step 3 (Professional Background).
- Check authentication state at the beginning of the application flow and gate unauthenticated users early.
- Wrap the multi-step flow in a native HTML `<form>` element to enable keyboard accessibility (e.g., submitting steps with the Enter key).
- Add inline visual error messages for invalid or missing fields.
- **BREAKING**: Unauthenticated users will no longer be able to browse the form fields beyond Step 1 without logging in first.

## Capabilities

### New Capabilities
- `career-application-flow`: End-to-end validation, authentication gating, and state persistence for the career application form.

### Modified Capabilities
- 

## Impact

- `app/(customer)/career/apply/page.jsx` will be heavily refactored to introduce Zod and React Hook Form (or similar validation mechanism).
- Requires `zod` dependency (which is likely already in the project, but we will use it).
- UX impact: Users will have a smoother, more robust experience, but unauthenticated users will face an earlier friction point to log in.
