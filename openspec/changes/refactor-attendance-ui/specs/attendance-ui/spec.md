## ADDED Requirements

### Requirement: Dynamic fetching of attendance data
The system SHALL dynamically fetch real data from Supabase for leaves, holidays, and attendance.

#### Scenario: User loads dashboard
- **WHEN** user navigates to the employee dashboard
- **THEN** system queries `leave_balances`, `holidays`, and `attendance` tables to display accurate metrics rather than hardcoded variables.

### Requirement: Enterprise UI styling for Clock-In Widget
The system SHALL display the Clock-In Widget using enterprise styling (white background, subtle borders, monospace fonts).

#### Scenario: Viewing Clock-In Widget
- **WHEN** user views the Clock-In Widget
- **THEN** it renders as a clean card without heavy gradients or oversized dropshadows.

### Requirement: Tabular Attendance Log
The system SHALL display the attendance log in a data table format with clear status badges.

#### Scenario: Viewing attendance history
- **WHEN** user views their attendance log
- **THEN** it displays a table with columns: Date, First In, Last Out, Total Hours, and Status.
- **THEN** status badges use muted, semantic colors.
