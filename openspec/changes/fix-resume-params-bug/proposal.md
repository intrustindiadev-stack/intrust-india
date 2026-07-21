## Why

Next.js 15 introduced a breaking change for dynamic API route parameters. The `params` object passed to API route handlers is now a Promise and must be unwrapped asynchronously using `await` before accessing its properties (like `params.fileName`). The current `/api/hrm/resume/[fileName]` route accesses `params.fileName` synchronously, which throws a runtime error and returns a 400 Bad Request to the user.

## What Changes

- Modify `app/api/hrm/resume/[fileName]/route.js` to await the `params` object before destructuring `fileName`.
- Ensure backwards compatibility or standard compliance with Next.js 15 routing.

## Capabilities

### New Capabilities

- `resume-params`: Async parameter unwrapping for the resume proxy API route.

### Modified Capabilities

- None.

## Impact

- **Affected Code**: `app/api/hrm/resume/[fileName]/route.js`.
- **User Experience**: Restores functionality so HR managers can view resumes without triggering server errors.
