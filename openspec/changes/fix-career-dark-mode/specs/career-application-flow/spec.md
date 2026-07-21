## ADDED Requirements

### Requirement: Career Pages Dark Mode Compatibility
The system SHALL ensure that both the main `/career` landing page and the `/career/apply` application flow gracefully adapt their UI based on the active theme (light or dark mode), ensuring legibility, proper contrast, and visual consistency with the broader application.

#### Scenario: Navigating the Career pages with dark mode enabled
- **WHEN** the user has dark mode enabled on the site and navigates to `/career` or `/career/apply`
- **THEN** the system displays dark backgrounds (e.g. gray-900), adapted text colors (e.g. white, gray-300), and dark-themed form elements without any hardcoded light mode elements breaking the layout.

#### Scenario: Filling out the application form in dark mode
- **WHEN** the user focuses on inputs, selects, or uploads a resume within the `/career/apply` multi-step form in dark mode
- **THEN** the input fields and surrounding UI elements remain legible with appropriate dark borders and backgrounds.
