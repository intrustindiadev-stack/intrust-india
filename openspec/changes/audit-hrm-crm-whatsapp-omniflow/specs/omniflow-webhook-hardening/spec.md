## ADDED Requirements

### Requirement: Omniflow webhook inbound chat messages are rate-limited per user
The Omniflow webhook POST handler SHALL throttle inbound chat messages such that if the same `userId` sends more than one message within a 10-second window, the additional messages receive a canned "still processing" reply and skip the AI inference call.

#### Scenario: User sends two messages within 10 seconds
- **WHEN** a user sends an inbound WhatsApp message and then sends another within 10 seconds
- **THEN** the second message receives a canned reply (e.g., "I'm still processing your previous message, please wait a moment.") and `sendMessageToAgent` is NOT called for the second message

#### Scenario: User sends a second message after 10-second cooldown
- **WHEN** a user sends an inbound WhatsApp message and then sends another after 10 or more seconds have elapsed
- **THEN** the second message is processed normally and `sendMessageToAgent` IS called

### Requirement: Omniflow webhook documentation accurately reflects implemented flows
The Omniflow webhook POST handler JSDoc SHALL describe only the two flows that are actually implemented: (1) outbound message status updates and (2) inbound chat message routing (quick-reply or AI fallback). References to an unimplemented "OTP reply → phone linking" flow SHALL be removed.

#### Scenario: Webhook receives a status event
- **WHEN** a POST payload with `type='message_status'` and a `wamid` is received
- **THEN** the handler updates `whatsapp_message_logs` status and returns HTTP 200 (this behaviour is unchanged)

#### Scenario: Webhook receives an inbound chat message
- **WHEN** a POST payload with a `phone` and `message` field is received
- **THEN** the handler routes to the merchant or customer inbound handler based on `user_channel_bindings.audience` (this behaviour is unchanged)
