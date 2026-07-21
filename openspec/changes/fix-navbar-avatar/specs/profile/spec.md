## ADDED Requirements

### Requirement: Profile Avatar Display
The system SHALL display the user's profile avatar correctly across all devices as a circle. If the avatar image fails to load or is invalid, the system SHALL display the user's initials as a fallback.

#### Scenario: Displaying a valid profile picture
- **WHEN** the user has a valid `profile.avatar_url`
- **THEN** the top navigation bar displays the image inside a circular container without any distortion.

#### Scenario: Displaying initials when picture fails to load
- **WHEN** the user's `profile.avatar_url` is invalid, broken, or fails to load
- **THEN** the top navigation bar gracefully handles the error and displays the user's initial in place of the image.
