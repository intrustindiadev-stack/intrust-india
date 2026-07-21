## ADDED Requirements

### Requirement: Async API Route Parameters
The system SHALL unwrap the `params` object asynchronously in the Next.js API route before attempting to read its properties, complying with Next.js 15 routing specifications.

#### Scenario: Route execution without param errors
- **WHEN** the `GET /api/hrm/resume/[fileName]` route is invoked
- **THEN** it resolves the `fileName` parameter without throwing a sync unwrapping error
