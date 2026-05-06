# Feature Specification: Incoming Payment Requests

**Feature Branch**: `003-incoming-payment-requests`  
**Created**: 2026-05-06  
**Status**: Draft  
**Epic**: LP-001 Payment Request Feature

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Incoming Requests List (Priority: P1)

A user navigates to the Payment Request screen and selects the "Incoming Requests" tab to see all payment requests sent to them. The list shows sender name, amount, status, creation date, and how many days remain before the request expires.

**Why this priority**: Core visibility into incoming payment obligations is the foundation of all other actions in this feature.

**Independent Test**: Can be fully tested by navigating to the Incoming Requests tab as a user who has received payment requests, and verifying the list renders with all required fields.

**Acceptance Scenarios**:

1. **Given** a user has received payment requests, **When** they open the Incoming Requests tab, **Then** each request displays sender name, amount, status, creation date, and days remaining to expiry
2. **Given** a request was created 7+ days ago, **When** it is displayed in the list, **Then** its status is shown as "expired" and no action buttons are available
3. **Given** a user has no incoming requests, **When** they open the Incoming Requests tab, **Then** an appropriate empty state message is displayed

---

### User Story 2 - Filter and Search Requests (Priority: P2)

A user wants to quickly locate a specific payment request. They use the filter control to narrow the list by status (e.g., pending, declined, expired) or type in a sender's name to search.

**Why this priority**: Filtering and search reduce friction when managing many requests; useless without the list but enables efficient action-taking.

**Independent Test**: Can be fully tested by applying status filters and entering sender names in the search field on a list with multiple requests of varied status.

**Acceptance Scenarios**:

1. **Given** multiple incoming requests with different statuses, **When** a user selects the "pending" filter, **Then** only pending requests are shown
2. **Given** multiple incoming requests from different senders, **When** a user types a sender's name in the search field, **Then** only matching requests are displayed
3. **Given** no requests match the active filter or search term, **When** the filter/search is applied, **Then** an empty state message is shown
4. **Given** a filter and search are both active, **When** results are displayed, **Then** only requests matching both criteria are shown

---

### User Story 3 - View Request Detail (Priority: P2)

A user selects a payment request from the list to see its full details on a dedicated detail page, including all available metadata and any available action buttons.

**Why this priority**: Detailed context is required before a user takes an action (e.g., declining).

**Independent Test**: Can be fully tested by tapping a request in the list and verifying the detail page loads with all relevant fields and correct action availability.

**Acceptance Scenarios**:

1. **Given** a user views the incoming requests list, **When** they select a request, **Then** a detail page opens showing sender, amount, status, creation date, expiry date, and days remaining
2. **Given** a pending request is viewed on the detail page, **When** the user sees the page, **Then** a "Decline" action button is available
3. **Given** an expired request is viewed on the detail page, **When** the user sees the page, **Then** no action buttons are available and the expired status is clearly indicated

---

### User Story 4 - Decline a Request (Priority: P3)

A user wants to decline a payment request. They can do this from either the list view or the detail view. Before the decline is confirmed, the system shows a confirmation step to prevent accidental declines.

**Why this priority**: Declining is a destructive, irreversible action requiring confirmation; it is less frequent than viewing but important for request lifecycle management.

**Independent Test**: Can be fully tested by initiating a decline from both the list and the detail view, confirming via the confirmation step, and verifying the request status updates to "declined".

**Acceptance Scenarios**:

1. **Given** a pending request in the list, **When** the user taps "Decline", **Then** a confirmation dialog appears asking the user to confirm
2. **Given** the confirmation dialog is shown, **When** the user confirms the decline, **Then** the request status is updated to "declined" and the UI reflects the change
3. **Given** the confirmation dialog is shown, **When** the user cancels, **Then** the request remains in its current status and no change is made
4. **Given** a pending request on the detail page, **When** the user taps "Decline" and confirms, **Then** the request status updates to "declined" and the user is returned to or can navigate back to the list
5. **Given** an expired request, **When** the user views the request, **Then** no "Decline" option is available

---

### Edge Cases

- What happens when a request transitions from pending to expired while the user is actively viewing the list? The list should reflect the expired status on next load or refresh; expired items become read-only immediately.
- What happens if two requests have the same sender name and similar amounts? The user sees both in the list; each is independently selectable and identifiable by creation date.
- What happens if the user's network connection drops during a decline action? The system should display an error state and the request status should remain unchanged until the action is confirmed server-side.
- What happens on the expiry boundary (exactly 7 days)? A request created exactly 7 days ago is considered expired; "0 days remaining" and "expired" status are shown.
- What happens if a request is already in "declined" status when the user loads the list? It is shown read-only with its final status; no actions are offered.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a dedicated "Incoming Requests" tab within the Payment Request screen that shows only requests where the current user is the recipient
- **FR-002**: System MUST display each incoming request with: sender name, requested amount, current status, creation date, and days remaining until expiry
- **FR-003**: System MUST calculate expiry as 7 days after the request creation date and display the number of remaining days (rounded down to whole days)
- **FR-004**: System MUST automatically set request status to "expired" when 7 or more days have elapsed since the creation date
- **FR-005**: System MUST prevent all user-initiated actions (decline) on expired or declined requests; expired and declined requests are read-only
- **FR-006**: System MUST allow users to filter the incoming requests list by status (pending, declined, expired, all)
- **FR-007**: System MUST allow users to search incoming requests by sender name, with real-time or near-real-time filtering of the displayed list
- **FR-008**: System MUST open a dedicated detail page when the user selects a request from the list
- **FR-009**: System MUST show a confirmation dialog before executing a decline action, from both the list view and the detail view
- **FR-010**: System MUST update request status to "declined" after the user confirms the decline action
- **FR-011**: System MUST provide consistent loading, empty, and error states on the list and detail views
- **FR-012**: System MUST reflect the status change to "declined" immediately in the UI after a successful decline action

### Key Entities

- **Incoming Payment Request**: A request created by another user targeting the current user as recipient. Key attributes: request ID, sender (name/identifier), recipient (current user), amount, currency, status (pending | declined | expired), creation date, expiry date (creation date + 7 days)
- **Request Status**: Lifecycle state of a payment request. Valid terminal states: declined, expired. Active state: pending. Status transitions: pending → declined, pending → expired (automatic)
- **Sender**: The user who created the payment request targeting the current user. Represented by a display name for list and detail views

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to the Incoming Requests tab and see their full list of incoming requests within 2 seconds of opening the tab under normal network conditions
- **SC-002**: Users can locate a specific incoming request using search or filter in under 30 seconds when the list contains up to 50 requests
- **SC-003**: Users can complete a decline action (from tap to confirmed status change) in under 4 steps and under 30 seconds
- **SC-004**: Expired requests are automatically identified and presented as read-only with no manual intervention required
- **SC-005**: 100% of action buttons (Decline) are absent for expired and declined requests — no invalid state is reachable by the user
- **SC-006**: All changed behavior is covered by automated tests or documented manual verification steps

## Assumptions

- Users are authenticated before accessing the Payment Request screen; no additional authentication is required for this feature
- The existing payment request data model includes a creation date and recipient identifier that can be used to identify incoming requests and calculate expiry
- The "Incoming Requests" tab is a sibling of the existing "Outgoing Requests" tab within the Payment Request screen
- Expiry status is enforced at query/display time; the system does not require a background job to batch-update statuses, though one may exist
- Currency display follows the conventions already established in the existing payment request screens
- The sender's display name is available as part of the payment request record
- The maximum number of incoming requests a user can have is manageable within a single paginated or scrollable list (pagination is assumed if the count is large, consistent with existing list patterns in the app)
