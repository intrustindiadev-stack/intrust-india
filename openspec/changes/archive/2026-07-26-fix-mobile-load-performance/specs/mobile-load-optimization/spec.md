## ADDED Requirements

### Requirement: Non-blocking client authentication hydration
The authentication provider SHALL release the global loading state immediately after session token verification, without blocking initial layout render for database profile queries.

#### Scenario: Immediate render on valid user session
- **WHEN** the client application initializes and reads a valid user session from browser storage
- **THEN** the authentication context SHALL set global `loading` to `false` immediately
- **THEN** the authentication context SHALL fetch the extended user profile from the database asynchronously in the background

#### Scenario: Graceful layout rendering during profile fetching
- **WHEN** a protected route renders while the user session is known but the database profile query is still pending
- **THEN** the UI layout SHALL render its visual structural components and navigation without displaying a blank white screen

### Requirement: Native route segment skeleton screens
The core portal routes SHALL implement Next.js route loading segment boundaries (`loading.jsx`) to ensure immediate layout paint during server navigation and component evaluation.

#### Scenario: Instantaneous skeleton display on navigation to CRM Portal
- **WHEN** a user navigates to any route under `/crm` while server queries or layout evaluations are loading
- **THEN** the application SHALL immediately present a themed CRM layout skeleton screen rather than a blank browser view

#### Scenario: Instantaneous skeleton display on navigation to HRM Portal
- **WHEN** a user navigates to any route under `/hrm` while server components are fetching HR data
- **THEN** the application SHALL immediately display a responsive HRM skeleton interface

#### Scenario: Instantaneous skeleton display on Customer Dashboard load
- **WHEN** a customer accesses `/dashboard` during data hydration
- **THEN** the browser SHALL immediately render a dashboard layout skeleton preserving layout stability and responsiveness

### Requirement: Dynamic code splitting of non-critical UI components
The frontend dashboard and high-density portals SHALL dynamically import heavy below-the-fold and interactive components to prevent initial JavaScript main-thread lockup on mobile processors.

#### Scenario: Non-blocking script hydration on constrained mobile devices
- **WHEN** a user loads the application on a lower-tier mobile device
- **THEN** non-critical components such as carousels, promotional modals, and secondary activity tables SHALL be lazy-loaded via code splitting
- **THEN** the primary interactive controls and navigation bar SHALL hydrate without main-thread CPU freezing
