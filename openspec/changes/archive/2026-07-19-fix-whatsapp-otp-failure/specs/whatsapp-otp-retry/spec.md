## ADDED Requirements

### Requirement: WhatsApp OTP Send Retry
The system SHALL retry sending the WhatsApp OTP template message up to 3 times with exponential backoff if a transient network or connection timeout is encountered during the initial attempt.

#### Scenario: Connection times out on first attempt but succeeds on retry
- **WHEN** the first fetch request to the WhatsApp/Omniflow gateway times out (ConnectTimeoutError)
- **THEN** the system SHALL wait and attempt to send again, succeeding on the subsequent attempt and resolving successfully without showing an error to the user
