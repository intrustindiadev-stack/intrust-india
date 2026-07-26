## ADDED Requirements

### Requirement: CRM Lead Input Validation
The system SHALL validate contact name, phone format, email syntax, and deal value numeric limits before creating or updating a lead.

#### Scenario: Valid Lead Creation
- **WHEN** user submits a valid contact name and valid 10-digit phone or valid email format
- **THEN** system saves the lead to Supabase and updates the leads list

#### Scenario: Invalid Lead Input Error Handling
- **WHEN** user submits an invalid phone number or malformed email
- **THEN** system blocks submission and displays a clear validation toast notification

### Requirement: Kanban Board Drag-and-Drop Error Recovery
The system SHALL revert the visual position of a lead card in the Kanban pipeline if the database update fails.

#### Scenario: Drag and drop database failure
- **WHEN** user drops a lead into a new pipeline stage and the database request fails
- **THEN** system reverts the card to its original stage and displays an error toast
