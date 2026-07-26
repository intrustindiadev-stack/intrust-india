## ADDED Requirements

### Requirement: Database query optimization
The database SHALL have B-Tree indexes on frequently queried columns in CRM tables to prevent sequential scans.

#### Scenario: Querying leads by status or assignee
- **WHEN** the frontend requests leads filtered by status or assigned_to
- **THEN** the database uses indexes on `status` and `assigned_to` to return results efficiently.

### Requirement: Parallel data fetching for lead details
The lead detail page SHALL fetch all necessary relational data (lead, tasks, notes, services, activities, profiles) in parallel.

#### Scenario: Loading a lead detail view
- **WHEN** a user navigates to `/crm/leads/[id]`
- **THEN** all independent data queries execute concurrently using `Promise.all`, eliminating N+1 waterfall delays.

### Requirement: Debounced real-time updates
Real-time subscription handlers SHALL debounce state updates to prevent UI stuttering during high-frequency changes.

#### Scenario: Multiple pipeline updates occur rapidly
- **WHEN** several leads are updated simultaneously in the database
- **THEN** the pipeline page debounces the fetch operation and updates the UI only once after the changes settle.
