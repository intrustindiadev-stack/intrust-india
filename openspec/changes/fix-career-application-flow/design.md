## Context

The career application form is built as a multi-step React component. Currently, step progression is handled by a simple `setStep(s + 1)` action with loose or non-existent validation. This allows users to bypass required details by pressing spaces or ignoring fields, eventually leading to a failure at the final submission step where authentication and payload validation finally occur.

## Goals / Non-Goals

**Goals:**
- Enforce strict validation on every step before progression is allowed.
- Gate the flow behind authentication early, preventing unauthenticated users from starting to fill out the form.
- Provide a semantic HTML form wrapper to support standard browser interactions (like Enter to submit).
- Show inline error messages for missing or malformed inputs.

**Non-Goals:**
- Redesign the visual UI significantly; we will keep the current design language but add error states.
- Change the database schema or the backend API for uploading resumes/submitting the application.

## Decisions

- **Validation Library**: We will use `zod` for defining the schema of Step 2 and Step 3. Zod is standard for robust client-side validation. We will manually parse the zod schema on the "Continue" button click since we're using a custom step-based state rather than `react-hook-form` out of the box, to minimize the refactor footprint while achieving strict validation.
- **Form Wrapper**: We will wrap the step container in a `<form>` tag and use `onSubmit` to catch "Enter" key presses, redirecting it to the `handleNext` logic based on the current step.
- **Early Authentication Gate**: We will shift the `if (!user)` check from the final `handleSubmit` to a `useEffect` on mount or render a full-page gate component (similar to the KYC check) if the user is unauthenticated.

## Risks / Trade-offs

- **Risk:** Existing users midway through an application might have their state reset.
  **Mitigation:** The form state isn't currently persisted anyway, but we should handle the auth redirect gracefully. We will redirect unauthenticated users to `/auth/login?callbackUrl=/career/apply` so they return directly to the flow.
- **Trade-off:** By not using `react-hook-form` and manually validating `zod` against our custom state, we write a bit more boilerplate for inline errors, but it avoids ripping out the entire custom `InputField` components and structure.
