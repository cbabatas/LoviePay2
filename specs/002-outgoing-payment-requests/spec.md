# Feature Specification: Manage Outgoing Payment Requests

**Feature Branch**: `002-outgoing-payment-requests`  
**Created**: 2026-05-06  
**Status**: Draft  
**Input**: User description: "Build a feature that allows users to view and manage their outgoing payment requests. This feature belongs to Epic: LP-001 Payment Request Feature. Users can access the Payment Request section and show the outgoing request tab, view a list of outgoing payment requests (requests created by the current user), filter the outgoing request list, select a request to view its details on a separate page, withdraw a request from the list, withdraw a request from the detail view, and use a Create Request button to open the create request screen. The system should identify outgoing requests where the current user is the sender, display requests in a list with relevant attributes (amount, status, recipient, date), support filtering on the list, open a detail view when a request is selected, show a confirmation step before withdrawing a request, update the request status to withdrawn after confirmation, and ensure only eligible requests (e.g., pending) can be withdrawn. Incoming requests are out of scope and no payment processing is included."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Outgoing Requests (Priority: P1)

As a user, I want to open the Payment Request section and see my outgoing requests so I can track payment requests I created.

**Why this priority**: The outgoing list is the foundation of the management feature and provides the smallest independently useful view for the user.

**Independent Test**: Can be fully tested by accessing Payment Request, selecting the outgoing requests tab, and verifying that only requests where the current user is the sender are listed with amount, status, recipient, and date.

**Acceptance Scenarios**:

1. **Given** the current user has created payment requests, **When** the user opens the Payment Request section and selects the outgoing requests tab, **Then** the system shows a list containing only requests where the current user is the sender.
2. **Given** outgoing requests are displayed, **When** the user reviews the list, **Then** each request shows the amount, status, recipient, and request date in a scannable format.
3. **Given** the current user has not created any payment requests, **When** the user opens the outgoing requests tab, **Then** the system shows an empty state and offers access to create a new request.

---

### User Story 2 - Filter Outgoing Requests (Priority: P2)

As a user, I want to filter my outgoing requests so I can quickly find requests by status, recipient, date, or other visible request details.

**Why this priority**: Filtering improves usability once the user has more than a small number of outgoing requests.

**Independent Test**: Can be tested by applying supported filters to a known set of outgoing requests and verifying that the list updates to include only matching requests without showing incoming requests.

**Acceptance Scenarios**:

1. **Given** the outgoing list contains requests with multiple statuses, **When** the user filters by status, **Then** the list shows only outgoing requests with the selected status.
2. **Given** the outgoing list contains requests for multiple recipients, **When** the user searches or filters by recipient information visible in the list, **Then** matching outgoing requests remain visible and non-matching requests are hidden.
3. **Given** a filter returns no matches, **When** the filtered state is displayed, **Then** the system shows a clear no-results state and provides a way to clear or change the filter.

---

### User Story 3 - View Request Details (Priority: P3)

As a user, I want to open a separate detail page for an outgoing request so I can inspect its full information before taking action.

**Why this priority**: Detail viewing supports review and management decisions without overloading the list view.

**Independent Test**: Can be tested by selecting a request from the outgoing list and verifying that a separate detail page opens for that same outgoing request with the expected request information and available actions.

**Acceptance Scenarios**:

1. **Given** an outgoing request is visible in the list, **When** the user selects the request, **Then** the system opens a separate detail view for that request.
2. **Given** the detail view is open, **When** the user reviews the page, **Then** the system shows the request amount, status, recipient, date, and any additional available request information needed to identify the request.
3. **Given** the user attempts to open a request not sent by the current user, **When** access is evaluated, **Then** the system does not present it as an outgoing request for the current user.

---

### User Story 4 - Withdraw Eligible Requests (Priority: P4)

As a user, I want to withdraw a pending outgoing request from either the list or detail view so I can cancel requests I no longer want recipients to act on.

**Why this priority**: Withdrawal is the core management action beyond viewing and must protect users from accidental cancellation.

**Independent Test**: Can be tested by withdrawing a pending outgoing request from the list and from the detail view, confirming the action, and verifying the status changes to "withdrawn" while ineligible requests cannot be withdrawn.

**Acceptance Scenarios**:

1. **Given** an outgoing request has status "pending", **When** the user chooses withdraw from the list and confirms the action, **Then** the request status changes to "withdrawn" and the list reflects the updated status.
2. **Given** an outgoing request has status "pending", **When** the user opens the detail view, chooses withdraw, and confirms the action, **Then** the request status changes to "withdrawn" and the detail view reflects the updated status.
3. **Given** an outgoing request is not eligible for withdrawal, **When** the user views it in the list or detail view, **Then** the system does not allow withdrawal and communicates that the request cannot be withdrawn.
4. **Given** the user starts withdrawal but cancels or dismisses the confirmation step, **When** the confirmation is not completed, **Then** the request status remains unchanged.

---

### User Story 5 - Open Create Request Screen (Priority: P5)

As a user, I want a Create Request button on the Payment Request screen so I can start creating a new payment request from the main payment request area.

**Why this priority**: This links the management experience to the existing create request flow in the LP-001 epic.

**Independent Test**: Can be tested by selecting the Create Request button from the Payment Request screen and verifying that the create request screen opens properly.

**Acceptance Scenarios**:

1. **Given** the user is on the Payment Request screen, **When** the user selects Create Request, **Then** the system opens the create request screen properly.

### Edge Cases

- If the current user has both incoming and outgoing payment requests, only outgoing requests where the current user is the sender are shown in this feature.
- If an outgoing request changes status while the list or detail page is open, the system must prevent an ineligible withdrawal and show the current status.
- If a withdrawal confirmation fails to complete, the system must preserve the existing request status and show a recoverable error state.
- If filters are applied and a withdrawn request no longer matches the active filters, the list must update consistently after withdrawal.
- If the selected outgoing request no longer exists, the detail view must show a clear unavailable state and provide navigation back to the outgoing list.
- If a request has missing optional information, the list and detail view must still show the required amount, status, recipient, and date values when available.
- If the user is on the Payment Request screen with any tab or filters active, the Create Request button must still open the create request screen without depending on the outgoing tab state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to access a Payment Request section that includes an outgoing requests tab or equivalent outgoing request view.
- **FR-002**: System MUST identify outgoing payment requests as requests where the current user is the sender.
- **FR-003**: System MUST exclude incoming payment requests from the outgoing requests list, filters, and outgoing detail navigation.
- **FR-004**: Users MUST be able to view a list of their outgoing payment requests.
- **FR-005**: Each outgoing request list item MUST display the request amount, current status, recipient, and request date.
- **FR-006**: System MUST provide consistent loading, empty, no-results, error, and updated-success states where those states can occur.
- **FR-007**: Users MUST be able to filter the outgoing request list by supported visible request attributes, including status and recipient.
- **FR-008**: System MUST keep active filters scoped to outgoing requests only.
- **FR-009**: Users MUST be able to clear or change filters after filtering the outgoing request list.
- **FR-010**: Users MUST be able to select an outgoing request from the list to open a separate detail view.
- **FR-011**: The detail view MUST show enough information for the user to identify the selected outgoing request, including amount, status, recipient, and date.
- **FR-012**: System MUST prevent users from viewing or managing a request as outgoing unless the current user is the sender.
- **FR-013**: Users MUST be able to initiate withdrawal for an eligible outgoing request from the list.
- **FR-014**: Users MUST be able to initiate withdrawal for an eligible outgoing request from the detail view.
- **FR-015**: System MUST show a confirmation step before withdrawing an outgoing request.
- **FR-016**: System MUST update the request status to "withdrawn" only after the user confirms withdrawal.
- **FR-017**: System MUST preserve the existing request status when the user cancels or dismisses withdrawal confirmation.
- **FR-018**: System MUST allow withdrawal only for eligible outgoing requests; by default, only requests with status "pending" are eligible.
- **FR-019**: System MUST prevent withdrawal actions for ineligible request statuses and explain that the request cannot be withdrawn.
- **FR-020**: Users MUST be able to open the create request screen from the Payment Request screen using a Create Request button that is not scoped only to the outgoing requests tab.
- **FR-021**: System MUST exclude payment processing, incoming request management, request payment completion, and recipient-side actions from this feature.

### Key Entities *(include if feature involves data)*

- **Current User**: The authenticated or demo acting user whose identifier determines which payment requests are outgoing.
- **Outgoing Payment Request**: A payment request created by the current user. Key attributes include sender, recipient, amount, status, request date, and any detail fields available from the request record.
- **Recipient**: The person or account expected to respond to the outgoing payment request. Key attributes include display name and available contact or identifying information shown in the request.
- **Filter Criteria**: User-selected list constraints used to narrow outgoing requests. Key attributes include status, recipient query, and any other visible request attribute supported by the product.
- **Withdrawal Confirmation**: A user confirmation step that records the user's intent before an eligible request is marked withdrawn.
- **Create Request Entry Point**: A Payment Request screen action that opens the separate create request screen and does not depend on the selected outgoing tab or active outgoing list filters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of users can access the outgoing requests list from the Payment Request section in under 30 seconds during acceptance testing.
- **SC-002**: 100% of displayed outgoing list items belong to the current user as sender and include amount, status, recipient, and date.
- **SC-003**: At least 95% of filter actions over a typical user request list show matching results or a no-results state within 1 second.
- **SC-004**: 100% of selected outgoing requests open a detail view that matches the request selected from the list.
- **SC-005**: 100% of confirmed withdrawals for eligible pending outgoing requests update the request status to "withdrawn".
- **SC-006**: 100% of canceled withdrawal confirmations leave the request status unchanged.
- **SC-007**: 100% of withdrawal attempts for ineligible requests are blocked with a clear explanation.
- **SC-008**: 100% of attempts to manage incoming requests through this feature are excluded from the outgoing list and outgoing detail flow.
- **SC-009**: 100% of Create Request button selections from the Payment Request screen open the create request screen correctly during acceptance testing.

## Assumptions

- The current user is already established by the surrounding demo or authentication context from the LP-001 payment request experience.
- The existing create request screen from LP-001.1 is the destination for the Create Request button.
- The Create Request button is a Payment Request screen-level action, not an action inside only the outgoing requests tab.
- "Eligible for withdrawal" means a request with status "pending" unless a later product rule defines additional eligible statuses.
- Filtering includes status and recipient by default because these are the highest-value visible attributes specified for the outgoing list.
- Request dates are displayed using a user-friendly format appropriate to the user's locale.
- No payment movement, settlement, or payment processing state changes occur as part of viewing, filtering, or withdrawing outgoing requests.
