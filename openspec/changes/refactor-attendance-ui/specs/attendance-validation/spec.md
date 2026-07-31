## ADDED Requirements

### Requirement: Validate multi-day shifts
The system SHALL validate upon load whether the user has an open shift from a previous day.

#### Scenario: Open shift from a previous day
- **WHEN** user loads the attendance page
- **THEN** system checks if the most recent `check_in` record lacks a `check_out` and its `date` is not today
- **THEN** system prompts the user to enter a checkout time for the previous shift or auto-clock out.

### Requirement: Block current day check-in until previous shift closed
The system SHALL prevent clocking in for the current day if a previous shift is still open.

#### Scenario: Attempting to clock in with open previous shift
- **WHEN** user tries to clock in today
- **THEN** the system disables the "Clock In" button and displays a warning to close the previous shift.
