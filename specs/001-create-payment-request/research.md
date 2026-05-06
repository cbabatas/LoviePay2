# Research: Create Payment Request

## Decision: Implement as a Browser Demo With One Backend Create Endpoint

**Rationale**: The feature explicitly excludes real authentication, registration, permissions, profile management, full navigation, payment processing, and request fulfillment, but payment request records must be stored in Supabase and validation must also run in the backend. A small browser app plus one backend create endpoint is the smallest design that satisfies both the demo flow and server-side persistence requirements.

**Alternatives considered**:

- Full backend web service: rejected because payment processing and real identity are out of scope.
- Frontend framework app: rejected for initial implementation because there is no existing app framework in the repository and the flow is small.
- Browser-only static app: rejected because it cannot provide backend validation or Supabase-backed request storage.
- CLI or non-visual prototype: rejected because the feature requires user-facing recipient search, sidebar, account selection, validation, and responsive UI.

## Decision: Use Static Mock Data for Demo User, Friends, and Receiver Accounts

**Rationale**: The spec allows mock/demo friend list data when real friend management is unavailable. Keeping demo data in a local module makes the current user, active friends, inactive friends, and receiver accounts explicit and testable.

**Alternatives considered**:

- External fixture service: rejected because it adds integration complexity without current value.
- User-editable friend management: rejected because friend management is outside this spec.

## Decision: Persist Created Requests in Supabase Postgres

**Rationale**: The user explicitly clarified that system-generated records such as payment requests must be stored in Supabase, while demo user, friend, and receiver account data remain mock. Supabase Postgres should store only validated payment request records for this feature.

**Alternatives considered**:

- Browser local storage: rejected because it does not satisfy the Supabase storage requirement.
- Storing all mock data in Supabase: rejected because the user specified that only system-generated records are stored and the other data remains mock.
- In-memory only storage: rejected because it loses created request records and does not satisfy persistence.

## Decision: Validate Payment Request Creation in the Backend Before Supabase Insert

**Rationale**: Client-side validation improves UX, but backend validation is required before storage so bypassed or malformed client requests cannot create invalid payment request records. Backend validation must check sender, recipient existence and active status from mock data, self-recipient exclusion, receiver account existence, derived currency, amount range, pending status, hash uniqueness, and shareable link generation.

**Alternatives considered**:

- Client-side validation only: rejected because the user explicitly requested backend validation.
- Database constraints only: rejected because recipient and receiver account data remain mock and must be validated before insert.
- Full authentication-backed authorization: rejected because real authentication and permissions are out of scope.

## Decision: Validate Amount as Greater Than Zero and Less Than 1,000,000

**Rationale**: This is now an explicit clarified requirement. Validation must block zero, negative, empty, non-numeric, and 1,000,000 or greater values before request creation.

**Alternatives considered**:

- Only greater-than-zero validation: rejected because the clarified spec adds an upper limit.
- Inclusive upper limit of 1,000,000: rejected because the clarification says smaller than 1,000,000.

## Decision: Exclude Current Demo User From Friend Data and Search Results

**Rationale**: The clarified spec states that the current user cannot choose themselves and their own record cannot be their friend. Demo data must not include the current user as a friend, and defensive filtering should exclude any current-user record if mock data is changed later.

**Alternatives considered**:

- Show current user but disable selection: rejected because the clarification says the self record cannot be a friend.
- Validate only on submit: rejected because it allows a confusing selectable self-recipient state.

## Decision: Responsive UI Across Desktop, Tablet, and Mobile With Desktop-Only Playwright

**Rationale**: The user explicitly requires the design to work well on desktop, mobile, and tablet while limiting Playwright to desktop. The implementation should use responsive CSS and manually verify tablet/mobile layouts; automated Playwright coverage should stay focused on desktop flows.

**Alternatives considered**:

- Playwright coverage for all breakpoints: rejected because the user limited Playwright to desktop.
- Desktop-only responsive design: rejected because the UI must work well across desktop, tablet, and mobile.
