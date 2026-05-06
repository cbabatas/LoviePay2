# Feature Specification: Create Payment Request

**Feature Branch**: `001-create-payment-request`  
**Created**: 2026-05-06  
**Status**: Draft  
**Input**: User description: "Build a feature that allows users to create a payment request. This feature belongs to Epic: LP-001 Payment Request Feature in product-backlog.md. Implement a minimal mock login by only mock email and passwords. Use mock/demo friend list data if real friend management is not available yet. Do not build full authentication, registration, permissions, profile management, or full navigation in this spec. Simple left sidebar with user info including full name, basic avatar, customer number, and menu name. Users can act as a logged-in demo user, search recipient by name, email, or phone from their friend list, select a recipient, enter amount, select receiver account where currency is derived from selected account, add an optional note, and send the request. The system should identify the sender from the mock current user, validate amount is greater than zero, ensure recipient exists and is active, prevent self-requests, ensure selected account determines currency, store the request with status pending, and generate a unique hash and public shareable link. Constraints: no real authentication, no registration flow, no payment processing, only minimal UI needed to complete the create request flow."

## Clarifications

### Session 2026-05-06

- Q: What amount range is valid for creating a payment request? -> A: Greater than zero and less than 1,000,000.
- Q: Can the current demo user appear in their own friend list as a selectable recipient? -> A: No; the current user must not be a friend list record.
- Q: Where are system-generated payment request records stored and where is validation enforced? -> A: Payment request records are stored in Supabase, while demo user, friend, and receiver account data remain mock data; request validation is enforced in the backend before storage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Valid Payment Request (Priority: P1)

As a demo user, I want to select a recipient, enter request details, and send a payment request so I can ask someone in my network to pay me.

**Why this priority**: This is the core value of LP-001.1 and provides the smallest independently useful slice of the Payment Request Feature.

**Independent Test**: Can be fully tested by accessing the demo experience, selecting an active friend, choosing a receiver account, entering an amount greater than zero and less than 1,000,000, sending the request, and verifying that a pending request with a shareable link is created.

**Acceptance Scenarios**:

1. **Given** the demo user has passed the mock sign-in and has at least one active friend and one receiver account, **When** the user selects an active recipient, enters an amount greater than zero and less than 1,000,000, selects a receiver account, optionally adds a note, and sends the request, **Then** the system creates a payment request with status "pending" and shows confirmation with a public shareable link.
2. **Given** the demo user selects a receiver account, **When** the request is created, **Then** the request currency matches the selected receiver account currency.
3. **Given** a payment request is created, **When** the backend validates and stores the request, **Then** the sender is the current demo user and the request includes a unique hash for the public shareable link.

---

### User Story 2 - Find and Select a Recipient (Priority: P2)

As a demo user, I want to search my friend list by name, email, or phone so I can quickly choose the right recipient.

**Why this priority**: Recipient discovery is required for a usable create flow, but it can be validated separately from final request submission.

**Independent Test**: Can be tested by using the search field with known friend names, emails, and phone numbers and confirming the expected active friends appear and can be selected, while the current demo user never appears as a friend list result.

**Acceptance Scenarios**:

1. **Given** the demo friend list contains active friends with name, email, and phone values, **When** the user searches by a partial or complete name, email, or phone number, **Then** matching active friends are displayed for selection and the current demo user is not included.
2. **Given** the user selects a friend from search results, **When** the selection is made, **Then** the selected recipient is clearly shown in the payment request form.
3. **Given** no friend matches the search term, **When** the search completes, **Then** the system shows an empty state without creating a request.

---

### User Story 3 - Prevent Invalid Requests (Priority: P3)

As a demo user, I want clear validation feedback when request details are invalid so I can correct the form before sending.

**Why this priority**: Validation protects request quality and prevents incorrect pending requests from being stored.

**Independent Test**: Can be tested by attempting to send requests with missing, inactive, self-recipient, non-positive amount, or amount of 1,000,000 or greater values and confirming no request is created.

**Acceptance Scenarios**:

1. **Given** the amount is zero, negative, empty, not a valid number, or 1,000,000 or greater, **When** the user attempts to send the request, **Then** the system prevents submission and explains that the amount must be greater than zero and less than 1,000,000.
2. **Given** the selected recipient is inactive or no longer exists in the friend list, **When** the user attempts to send the request, **Then** the system prevents submission and explains that an active recipient is required.
3. **Given** the selected recipient is the current demo user, **When** the user attempts to send the request, **Then** the system prevents submission and explains that users cannot request money from themselves.
4. **Given** no receiver account is selected, **When** the user attempts to send the request, **Then** the system prevents submission and explains that a receiver account is required.

### Edge Cases

- If the demo user enters an amount with extra spaces or common decimal formatting, the system treats it as a numeric amount only when it clearly represents a value greater than zero and less than 1,000,000.
- If a selected recipient becomes inactive before submission, the system blocks the request at send time.
- If the available friend data source includes the current demo user, the system excludes that record from the friend list and search results before recipient selection.
- If a receiver account has no supported currency value, the system must not allow it to be used for request creation.
- If unique hash generation would duplicate an existing request hash, the system must generate a different hash before storing the request.
- If request creation cannot be completed, the system shows an error state and does not create a partial pending request.
- If client-side validation is bypassed, backend validation must still block invalid payment request creation before any record is stored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a minimal demo sign-in path using mock email and password values so a user can act as a logged-in demo user.
- **FR-002**: System MUST show a simple left sidebar after demo sign-in with the demo user's full name, basic avatar, customer number, and the payment request menu name.
- **FR-003**: System MUST identify the sender of every created payment request as the current demo user.
- **FR-004**: System MUST provide friend list data for the create request flow, using demo friends when real friend management is unavailable, and the friend list MUST NOT include the current demo user as a friend record.
- **FR-005**: Users MUST be able to search recipients by name, email, or phone from their friend list.
- **FR-006**: Users MUST be able to select exactly one recipient for a payment request.
- **FR-007**: System MUST allow request submission only when the selected recipient exists in the friend list and is active.
- **FR-008**: System MUST prevent users from sending payment requests to themselves, including by excluding the current demo user from recipient search and selection.
- **FR-009**: Users MUST be able to enter a payment request amount.
- **FR-010**: System MUST validate that the amount is greater than zero and less than 1,000,000 before creating a request.
- **FR-011**: System MUST enforce request validation in the backend before storing a payment request, including amount range, active recipient, non-self recipient, receiver account, derived currency, pending status, unique hash, and shareable link requirements.
- **FR-012**: Users MUST be able to select a receiver account for the request.
- **FR-013**: System MUST derive the request currency from the selected receiver account and MUST NOT allow the user to manually override that currency in this flow.
- **FR-014**: Users MUST be able to add an optional note to the payment request.
- **FR-015**: System MUST store each successfully created payment request with status "pending" in Supabase.
- **FR-016**: System MUST generate a unique hash for each created payment request.
- **FR-017**: System MUST generate a public shareable link from the unique request hash.
- **FR-018**: System MUST show a success confirmation after a request is created, including enough information for the user to recognize the recipient, amount, currency, pending status, and shareable link.
- **FR-019**: System MUST provide clear empty, validation error, creation error, and success states for the create request flow.
- **FR-020**: System MUST exclude real authentication, registration, permissions, profile management, full navigation, payment processing, and request payment completion from this feature.

### Key Entities *(include if feature involves data)*

- **Demo User**: The current acting user in the demo experience. Key attributes include full name, email, customer number, avatar representation, and available receiver accounts.
- **Friend**: A potential payment request recipient from the user's friend list. Key attributes include name, email, phone, active status, and an identifier that confirms the friend is not the current demo user.
- **Receiver Account**: An account owned by the demo user that can receive requested funds. Key attributes include display name or label, account identifier, and currency.
- **Payment Request**: A system-generated request created by the demo user for a selected friend and stored in Supabase. Key attributes include sender, recipient, amount, currency, receiver account, optional note, status, unique hash, public shareable link, and created time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of test users can complete a valid payment request from demo sign-in to confirmation in under 2 minutes.
- **SC-002**: 100% of successfully created requests have status "pending", a sender matching the current demo user, a selected active recipient, an amount greater than zero and less than 1,000,000, a receiver-account-derived currency, a unique hash, and a public shareable link.
- **SC-003**: 100% of attempts with zero, negative, empty, invalid, or 1,000,000 or greater amounts are blocked before a request is created.
- **SC-004**: 100% of attempts to request money from an inactive recipient, nonexistent recipient, or the current demo user are blocked before a request is created, and the current demo user never appears as a selectable friend.
- **SC-005**: At least 95% of recipient searches over the demo friend list return matching results or a clear empty state within 1 second.
- **SC-006**: During acceptance testing, no user can access registration, full authentication, payment processing, profile management, permissions management, or unrelated navigation from this feature flow.
- **SC-007**: 100% of invalid direct backend create attempts are rejected before any Supabase payment request record is stored.

## Assumptions

- The mock sign-in is only a demo entry point and is not intended to establish real identity, permissions, security, or account recovery behavior.
- Demo friend list data is acceptable until real friend management is available.
- Demo receiver account data is available for the current demo user and each receiver account has one clear currency.
- Demo user, friend, and receiver account records remain mock data for this feature; only system-generated payment request records are stored in Supabase.
- Public shareable links are generated for sharing or later viewing, but payment processing through those links is outside this feature.
- The minimal UI should include only the screens and controls needed to complete the create request flow plus the requested simple sidebar.
