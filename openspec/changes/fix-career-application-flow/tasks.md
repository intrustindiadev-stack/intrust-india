## 1. Setup and Auth Gating

- [x] 1.1 Move the `!user` check from `handleSubmit` to a new `useEffect` hook or initial render condition in `CareerApplyForm` to block unauthenticated users early.
- [x] 1.2 Display an appropriate fallback UI or redirect unauthenticated users to `/auth/login?callbackUrl=/career/apply` before they can proceed to Step 1.

## 2. Form Refactoring

- [x] 2.1 Wrap the multi-step container (`<AnimatePresence>`) and its controls inside a native `<form>` element.
- [x] 2.2 Add an `onSubmit` handler to the `<form>` that intercepts Enter key presses and executes the "Continue" (next step) or "Submit" logic depending on the current step.
- [x] 2.3 Modify the "Continue" buttons to function correctly within the new `<form>` context (e.g. `type="submit"` or explicit handlers).

## 3. Zod Validation Implementation

- [x] 3.1 Import `z` from `zod` and define a strict validation schema for Step 2 (Personal Info) covering name, email format, and phone number (10 digits).
- [x] 3.2 Define a validation schema for Step 3 (Professional Info) that ensures a resume file is provided and meets size constraints.
- [x] 3.3 Add state for field-level errors (e.g., `const [errors, setErrors] = useState({})`).
- [x] 3.4 Update the `handleNext` logic to parse the form state against the relevant Zod schema for the current step. If validation fails, populate the `errors` state; if it passes, proceed to the next step.

## 4. UI Error States

- [x] 4.1 Update `InputField` to accept an `error` prop and render an inline red error message below the input if the prop is present.
- [x] 4.2 Update `SelectField` to accept an `error` prop and display validation errors.
- [x] 4.3 Update the Resume Upload UI to display a validation error message if the user tries to proceed without selecting a valid resume.
- [x] 4.4 Test the entire flow to ensure validation blocks progression appropriately and the final submission still works for authenticated users.
