import { users } from "./mock-data.js";

const ALL_USERS = users;
import {
  ERROR_MESSAGES,
  canDeclineIncoming,
  canPayIncoming,
  canWithdrawPaymentRequest,
  computeDaysRemaining,
  computeExpiresAt,
  currencySymbol,
  defaultSelectedSourceAccountId,
  deriveCurrency,
  describeSourceAccountState,
  filterIncomingPaymentRequests,
  filterOutgoingPaymentRequests,
  findEligibleSourceAccounts,
  findRecipientDisplay,
  findSelectedSourceAccount,
  findSenderDisplay,
  formatAmount,
  formatPlainAmount,
  formatRequestDate,
  formatStatusLabel,
  receiverAccountLabel,
  unavailableRequestMessage,
  validatePaymentRequestForm
} from "./payment-request.js";
import {
  createPaymentRequest,
  declineIncomingPaymentRequest,
  fetchCustomerAccounts,
  fetchIncomingPaymentRequest,
  fetchIncomingPaymentRequests,
  fetchPaymentRequestByHash,
  getOutgoingPaymentRequest,
  listOutgoingPaymentRequests,
  payIncomingPaymentRequest,
  setCurrentUserId,
  withdrawPaymentRequest
} from "./request-api.js";

const PROCESSING_DELAY_MS = 2200;

const PAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><path d="M6.5 15h2"/><path d="M11.5 15h4"/></svg>`;
const DECLINE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>`;
const BACK_ARROW_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>`;
const COPY_OK_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5 11-11"/></svg>`;

function renderCopyLinkButton(link) {
  const isCopied = state.copiedLink === link;
  const icon = isCopied ? COPY_OK_ICON : COPY_ICON;
  const label = isCopied ? "Copied" : "Copy link";
  return `<button type="button" class="copy-link-button ${isCopied ? "is-copied" : ""}" data-copy-link="${escapeHtml(link)}" aria-label="${label}" title="${label}">${icon}</button>`;
}

const ACCOUNT_TYPE_LABELS = {
  current_account: "Current account",
  term_deposit: "Term deposit"
};

function formatAccountTypeLabel(value) {
  return ACCOUNT_TYPE_LABELS[value] ?? "Current account";
}

function absoluteShareUrl(link) {
  if (!link) return "";
  try {
    return new URL(link, window.location.origin).toString();
  } catch {
    return link;
  }
}

function renderShareableLinkCell(link) {
  const absolute = absoluteShareUrl(link);
  return `<dd class="shareable-link-cell">
    <a href="${escapeHtml(absolute)}" target="_blank" rel="noopener noreferrer" class="shareable-link-text">${escapeHtml(absolute)}</a>
    ${renderCopyLinkButton(absolute)}
  </dd>`;
}

function renderBackBreadcrumb(id, label) {
  return `<nav class="detail-breadcrumb" aria-label="Breadcrumb"><button type="button" class="back-link" id="${id}">${BACK_ARROW_ICON}<span>${escapeHtml(label)}</span></button></nav>`;
}

const app = document.querySelector("#app");
const SESSION_KEY = "loviepay.demoSignedIn";
const SESSION_USER_KEY = "loviepay.demoUserId";
const NOTE_LIMIT = 100;

const ROUTES = {
  login: "/log-in",
  outgoingList: "/outgoing-list",
  incomingList: "/incoming-list",
  create: "/create-payment-request"
};

function routePathForState() {
  if (state.view === "incoming") return ROUTES.incomingList;
  if (state.view === "incoming-detail") {
    return state.detailId ? `${ROUTES.incomingList}/${encodeURIComponent(state.detailId)}` : ROUTES.incomingList;
  }
  if (state.view === "outgoing") return ROUTES.outgoingList;
  if (state.view === "detail") {
    return state.detailId ? `${ROUTES.outgoingList}/${encodeURIComponent(state.detailId)}` : ROUTES.outgoingList;
  }
  if (state.view === "create") return ROUTES.create;
  return ROUTES.outgoingList;
}

function syncUrlToState({ replace = false } = {}) {
  const target = routePathForState();
  const current = window.location.pathname + window.location.search;
  if (target === current) return;
  if (replace) {
    window.history.replaceState({ view: state.view, detailId: state.detailId }, "", target);
  } else {
    window.history.pushState({ view: state.view, detailId: state.detailId }, "", target);
  }
}

function parseRoute(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === ROUTES.login) return { view: "login" };
  if (path === "/" || path === ROUTES.outgoingList) return { view: "outgoing" };
  if (path === ROUTES.incomingList) return { view: "incoming" };
  if (path === ROUTES.create) return { view: "create" };

  const outgoingDetail = path.match(/^\/outgoing-list\/([^/]+)$/);
  if (outgoingDetail) return { view: "detail", detailId: decodeURIComponent(outgoingDetail[1]) };

  const incomingDetail = path.match(/^\/incoming-list\/([^/]+)$/);
  if (incomingDetail) return { view: "incoming-detail", detailId: decodeURIComponent(incomingDetail[1]) };

  const shareLink = path.match(/^\/r\/([^/]+)$/);
  if (shareLink) return { view: "share", hash: decodeURIComponent(shareLink[1]) };

  return { view: "outgoing" };
}

function resolveSessionUser() {
  const id = sessionStorage.getItem(SESSION_USER_KEY);
  return ALL_USERS.find((u) => u.id === id) ?? null;
}

const state = {
  signedIn: sessionStorage.getItem(SESSION_KEY) === "true",
  currentUser: resolveSessionUser(),
  signInError: "",
  view: "outgoing",
  detailId: "",
  searchQuery: "",
  selectedRecipientId: "",
  receiverAccountId: "",
  amount: "",
  note: "",
  errors: {},
  isSubmitting: false,
  submitError: "",
  success: null,
  copyMessage: "",
  copiedLink: "",
  sidebarOpen: false,
  outgoing: {
    loaded: false,
    loading: false,
    error: "",
    items: [],
    status: "",
    recipientQuery: "",
    detail: null,
    detailLoading: false,
    detailError: "",
    withdraw: null,
    withdrawing: false,
    withdrawError: "",
    successMessage: ""
  },
  incoming: {
    loaded: false,
    loading: false,
    error: "",
    items: [],
    status: "",
    senderQuery: "",
    detail: null,
    detailLoading: false,
    detailError: "",
    decline: null,
    declining: false,
    declineError: "",
    pay: null,
    paying: false,
    payProcessing: false,
    payError: "",
    successMessage: ""
  },
  customer: {
    accounts: [],
    accountsLoading: false,
    accountsError: ""
  }
};

if (state.currentUser) {
  setCurrentUserId(state.currentUser.id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedRecipient() {
  return ALL_USERS.find((user) => user.id === state.selectedRecipientId) ?? null;
}

function fieldError(name) {
  const code = state.errors[name];
  return code ? ERROR_MESSAGES[code] ?? ERROR_MESSAGES.request_creation_failed : "";
}

function requestedAmountText(currency = deriveCurrency(state.receiverAccountId)) {
  const validation = validatePaymentRequestForm({
    recipientId: state.selectedRecipientId || "user_002",
    receiverAccountId: state.receiverAccountId || "user_001_acct_eur",
    amount: state.amount || "0",
    note: state.note
  });

  return currency && validation.value?.amount
    ? formatAmount(validation.value.amount, currency)
    : "Not entered";
}

function resetRequestState() {
  state.searchQuery = "";
  state.selectedRecipientId = "";
  state.receiverAccountId = "";
  state.amount = "";
  state.note = "";
  state.errors = {};
  state.isSubmitting = false;
  state.submitError = "";
  state.success = null;
  state.copyMessage = "";
}

function resetOutgoingTransient() {
  state.outgoing.detail = null;
  state.outgoing.detailError = "";
  state.outgoing.detailLoading = false;
  state.outgoing.withdraw = null;
  state.outgoing.withdrawError = "";
  state.outgoing.withdrawing = false;
}

function resetIncomingTransient() {
  state.incoming.detail = null;
  state.incoming.detailError = "";
  state.incoming.detailLoading = false;
  state.incoming.decline = null;
  state.incoming.declineError = "";
  state.incoming.declining = false;
  state.incoming.pay = null;
  state.incoming.paying = false;
  state.incoming.payProcessing = false;
  state.incoming.payError = "";
}

function resetListsState() {
  state.outgoing.loaded = false;
  state.outgoing.items = [];
  state.outgoing.error = "";
  state.outgoing.status = "";
  state.outgoing.recipientQuery = "";
  state.outgoing.successMessage = "";
  state.incoming.loaded = false;
  state.incoming.items = [];
  state.incoming.error = "";
  state.incoming.status = "";
  state.incoming.senderQuery = "";
  state.incoming.successMessage = "";
}

function shapeIncomingForDisplay(request, now = new Date()) {
  if (!request) return request;
  const expiresAt = request.expiresAt ?? computeExpiresAt(request.createdAt)?.toISOString() ?? null;
  const daysRemaining =
    request.daysRemaining !== undefined
      ? request.daysRemaining
      : request.status === "pending"
        ? computeDaysRemaining(expiresAt, now)
        : 0;
  return { ...request, expiresAt, daysRemaining };
}

function requiredLabel(text) {
  return `${escapeHtml(text)} <span class="required-marker" aria-hidden="true">*</span>`;
}

function render() {
  if (!state.signedIn || !state.currentUser) {
    app.innerHTML = renderSignIn();
    bindSignIn();
    return;
  }

  app.innerHTML = renderWorkspace();
  bindWorkspace();
}

function renderSignIn() {
  return `
    <main class="auth-shell">
      <section class="auth-panel" aria-labelledby="signin-title">
        <div class="brand-mark" aria-hidden="true">LP</div>
        <h1 id="signin-title">LoviePay</h1>
        <form id="signin-form" class="form-stack" novalidate>
          <label>
            <span>Email</span>
            <input id="signin-email" name="email" type="email" autocomplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input id="signin-password" name="password" type="password" autocomplete="current-password" required />
          </label>
          ${
            state.signInError
              ? `<p class="banner banner-error" role="alert">${escapeHtml(state.signInError)}</p>`
              : ""
          }
          <button class="primary-action" type="submit">Log in</button>
        </form>
      </section>
    </main>
  `;
}

function renderWorkspace() {
  const sidebarOpen = state.sidebarOpen ? "is-open" : "";
  return `
    <div class="app-shell ${sidebarOpen}">
      <button type="button" class="sidebar-toggle" id="sidebar-toggle" aria-label="${state.sidebarOpen ? "Close menu" : "Open menu"}" aria-expanded="${state.sidebarOpen ? "true" : "false"}" aria-controls="primary-sidebar">
        <span class="sidebar-toggle-icon" aria-hidden="true"></span>
        <span class="sidebar-toggle-icon" aria-hidden="true"></span>
        <span class="sidebar-toggle-icon" aria-hidden="true"></span>
      </button>
      <div class="sidebar-backdrop" data-sidebar-backdrop></div>
      <aside class="sidebar" id="primary-sidebar" aria-label="Demo user">
        <div class="sidebar-top">
          <div class="avatar" aria-hidden="true">${escapeHtml(state.currentUser.avatarLabel)}</div>
          <div>
            <p class="sidebar-name">${escapeHtml(state.currentUser.fullName)}</p>
            <p class="sidebar-meta">${escapeHtml(state.currentUser.customerNumber)}</p>
            <p class="sidebar-email">${escapeHtml(state.currentUser.email)}</p>
          </div>
          <nav class="sidebar-nav" aria-label="Workspace">
            <a href="#" aria-current="page">Payment request</a>
          </nav>
        </div>
        <button type="button" class="secondary-action sidebar-logout" id="sign-out">Log out</button>
      </aside>

      <main class="workspace" aria-labelledby="page-title">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">${eyebrowForView()}</p>
            <h1 id="page-title">Payment request</h1>
          </div>
          <button type="button" class="primary-action" id="open-create-request">Create request</button>
        </header>

        <div class="payment-tabs" role="tablist" aria-label="Payment request views">
          <button type="button" role="tab" id="outgoing-tab" aria-selected="${state.view === "outgoing" || state.view === "detail"}" class="tab-action ${state.view === "outgoing" || state.view === "detail" ? "is-active" : ""}">Outgoing</button>
          <button type="button" role="tab" id="incoming-tab" aria-selected="${state.view === "incoming" || state.view === "incoming-detail"}" class="tab-action ${state.view === "incoming" || state.view === "incoming-detail" ? "is-active" : ""}">Incoming</button>
        </div>

        ${state.view === "create" ? renderCreateView() : ""}
        ${state.view === "outgoing" ? renderOutgoingView() : ""}
        ${state.view === "detail" ? renderOutgoingDetailView() : ""}
        ${state.view === "incoming" ? renderIncomingView() : ""}
        ${state.view === "incoming-detail" ? renderIncomingDetailView() : ""}
        ${renderWithdrawDialog()}
        ${renderDeclineDialog()}
        ${renderPayDialog()}
      </main>
    </div>
  `;
}

function renderCreateView() {
  const accountOptions = state.currentUser.receiverAccounts
    .map(
      (account) => `
        <option value="${account.id}" ${state.receiverAccountId === account.id ? "selected" : ""}>
          ${escapeHtml(account.label)}
        </option>
      `
    )
    .join("");
  const currency = deriveCurrency(state.receiverAccountId);
  const recipient = selectedRecipient();
  const results = recipient ? [] : searchFriendsForCreate(state.searchQuery);
  const hasSearch = !recipient && state.searchQuery.trim().length > 0;
  const amountSummary = requestedAmountText(currency);

  return `
    <section class="request-layout">
      <form id="request-form" class="request-form" novalidate>
        <div class="field-group">
          <label for="recipient-search">${requiredLabel("Recipient")}</label>
          <input
            id="recipient-search"
            name="recipientSearch"
            type="search"
            placeholder="Search by name, email, or phone"
            value="${escapeHtml(state.searchQuery)}"
            autocomplete="off"
            aria-describedby="recipient-error"
          />
          ${renderRecipientResults(results, hasSearch)}
          ${renderSelectedRecipient(recipient)}
          ${renderInlineError("recipient-error", fieldError("recipientId"))}
        </div>

        <div class="two-column">
          <div class="field-group">
            <label for="receiver-account">${requiredLabel("Receiver account")}</label>
            <select id="receiver-account" name="receiverAccountId" aria-describedby="receiver-account-error">
              <option value="">Select account</option>
              ${accountOptions}
            </select>
            ${renderInlineError("receiver-account-error", fieldError("receiverAccountId"))}
          </div>
          <div class="field-group">
            <span class="field-label">Currency</span>
            <output id="derived-currency" class="derived-value" aria-live="polite">
              ${currency ? `${escapeHtml(currencySymbol(currency))} ${escapeHtml(currency)}` : "Select account"}
            </output>
          </div>
        </div>

        <div class="field-group">
          <label for="amount">${requiredLabel("Amount")}</label>
          <div class="amount-control">
            <span class="amount-symbol" aria-hidden="true">${escapeHtml(currencySymbol(currency))}</span>
            <input
              id="amount"
              name="amount"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              value="${escapeHtml(state.amount)}"
              aria-describedby="amount-error"
            />
          </div>
          ${renderInlineError("amount-error", fieldError("amount"))}
        </div>

        <div class="field-group">
          <label for="note">Note</label>
          <textarea id="note" name="note" rows="4" maxlength="${NOTE_LIMIT}" aria-describedby="note-count">${escapeHtml(state.note)}</textarea>
          <p id="note-count" class="hint">${state.note.length}/${NOTE_LIMIT}</p>
        </div>

        ${
          state.submitError
            ? `<p class="banner banner-error" role="alert">${escapeHtml(state.submitError)}</p>`
            : ""
        }
        <button id="submit-request" class="primary-action" type="submit" ${state.isSubmitting ? "disabled" : ""}>
          ${state.isSubmitting ? "Creating request..." : "Create payment request"}
        </button>
      </form>

      <aside class="summary-panel" aria-label="Request summary">
        <h2>Summary</h2>
        <dl>
          <div>
            <dt>Recipient</dt>
            <dd>${recipient ? escapeHtml(recipient.fullName) : "Not selected"}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>${currency ? `${escapeHtml(currencySymbol(currency))} ${escapeHtml(currency)}` : "Not selected"}</dd>
          </div>
          <div>
            <dt>Requested amount</dt>
            <dd id="summary-amount">${escapeHtml(amountSummary)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Pending</dd>
          </div>
        </dl>
      </aside>
    </section>

    ${state.success ? renderSuccess(state.success) : ""}
  `;
}

function searchFriendsForCreate(query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  if (!normalized) return [];

  const allowedIds = Array.isArray(state.currentUser?.friends)
    ? new Set(state.currentUser.friends)
    : null;

  return ALL_USERS.filter((friend) => {
    if (!friend.active || friend.id === state.currentUser.id) return false;
    if (allowedIds && !allowedIds.has(friend.id)) return false;
    return [friend.fullName, friend.email, friend.phone]
      .map((value) => String(value ?? "").toLowerCase())
      .join(" ")
      .includes(normalized);
  });
}

function renderRecipientResults(results, hasSearch) {
  if (selectedRecipient()) return "";
  if (!hasSearch) return `<p class="hint">Search active friends to select one recipient.</p>`;
  if (results.length === 0) {
    return `<p id="recipient-results-empty" class="empty-state" role="status">No active friends found.</p>`;
  }

  return `
    <ul id="recipient-results" class="recipient-results" aria-label="Search results">
      ${results
        .map(
          (friend) => `
            <li>
              <button
                type="button"
                class="recipient-result ${state.selectedRecipientId === friend.id ? "is-selected" : ""}"
                data-recipient-id="${friend.id}"
                aria-pressed="${state.selectedRecipientId === friend.id ? "true" : "false"}"
              >
                <span>${escapeHtml(friend.fullName)}</span>
                <small>${escapeHtml(friend.email)} · ${escapeHtml(friend.phone)}</small>
              </button>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderSelectedRecipient(recipient) {
  if (!recipient) return "";

  return `
    <div id="selected-recipient" class="selected-recipient" role="status">
      <div>
        <strong>${escapeHtml(recipient.fullName)}</strong>
        <span>${escapeHtml(recipient.email)}</span>
      </div>
      <button type="button" class="secondary-action" id="change-recipient">Change</button>
    </div>
  `;
}

function renderInlineError(id, message) {
  return `<p id="${id}" class="field-error" ${message ? "role=\"alert\"" : ""}>${escapeHtml(message)}</p>`;
}

function renderSuccess(paymentRequest) {
  const recipient = ALL_USERS.find((user) => user.id === paymentRequest.recipientId);
  return `
    <section id="success-state" class="success-panel" aria-live="polite" tabindex="-1">
      <p class="eyebrow">Request created</p>
      <h2>Pending payment request</h2>
      <dl>
        <div>
          <dt>Recipient</dt>
          <dd>${escapeHtml(recipient?.fullName ?? paymentRequest.recipientId)}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>${escapeHtml(formatAmount(paymentRequest.amount, paymentRequest.currency))}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>${escapeHtml(paymentRequest.status)}</dd>
        </div>
        <div>
          <dt>Shareable link</dt>
          ${renderShareableLinkCell(paymentRequest.shareableLink)}
        </div>
      </dl>
    </section>
  `;
}

function filteredOutgoingItems() {
  return filterOutgoingPaymentRequests(state.outgoing.items, {
    status: state.outgoing.status,
    recipientQuery: state.outgoing.recipientQuery
  });
}

function renderOutgoingView() {
  if (state.outgoing.loading) {
    return `<section class="outgoing-panel" aria-live="polite"><p class="empty-state">Loading outgoing requests...</p></section>`;
  }

  if (state.outgoing.error) {
    return `
      <section class="outgoing-panel">
        <p class="banner banner-error" role="alert">${escapeHtml(state.outgoing.error)}</p>
        <button type="button" class="secondary-action" id="retry-outgoing">Retry</button>
      </section>
    `;
  }

  const rows = filteredOutgoingItems();
  const hasFilters = Boolean(state.outgoing.status || state.outgoing.recipientQuery.trim());

  return `
    <section class="outgoing-panel" aria-labelledby="outgoing-title">
      <div class="section-heading">
        <div>
          <h2 id="outgoing-title">Outgoing requests</h2>
          <p class="muted">Requests created by ${escapeHtml(state.currentUser.fullName)}.</p>
        </div>
        ${state.outgoing.successMessage ? `<p class="banner banner-success" role="status">${escapeHtml(state.outgoing.successMessage)}</p>` : ""}
      </div>

      <div class="filter-bar">
        <label for="outgoing-status">
          <span>Status</span>
          <select id="outgoing-status">
            <option value="">All statuses</option>
            <option value="pending" ${state.outgoing.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="withdrawn" ${state.outgoing.status === "withdrawn" ? "selected" : ""}>Withdrawn</option>
            <option value="declined" ${state.outgoing.status === "declined" ? "selected" : ""}>Declined</option>
            <option value="expired" ${state.outgoing.status === "expired" ? "selected" : ""}>Expired</option>
            <option value="paid" ${state.outgoing.status === "paid" ? "selected" : ""}>Paid</option>
          </select>
        </label>
        <label for="outgoing-recipient-query">
          <span>Recipient</span>
          <input id="outgoing-recipient-query" type="search" value="${escapeHtml(state.outgoing.recipientQuery)}" placeholder="Search recipient details" />
        </label>
        <button type="button" class="secondary-action" id="clear-outgoing-filters" ${hasFilters ? "" : "disabled"}>Clear filters</button>
      </div>

      ${renderOutgoingRows(rows, hasFilters)}
    </section>
  `;
}

function renderOutgoingRows(rows, hasFilters) {
  if (state.outgoing.items.length === 0) {
    return `
      <div class="empty-block" role="status">
        <h3>No outgoing requests</h3>
        <p class="muted">Create a request to start tracking outgoing requests.</p>
      </div>
    `;
  }

  if (rows.length === 0 && hasFilters) {
    return `
      <div class="empty-block" role="status">
        <h3>No matching outgoing requests</h3>
        <p class="muted">Clear filters or search for another recipient.</p>
      </div>
    `;
  }

  return `
    <ul class="outgoing-list" aria-label="Outgoing requests">
      ${rows.map(renderOutgoingRow).join("")}
    </ul>
  `;
}

function renderOutgoingRow(request) {
  const recipient = findRecipientDisplay(request.recipientId);
  const canWithdraw = canWithdrawPaymentRequest(request);

  return `
    <li class="outgoing-row" role="row" aria-label="${escapeHtml(`${recipient.fullName} ${formatAmount(request.amount, request.currency)} ${request.currency} ${formatStatusLabel(request.status)} ${formatRequestDate(request.createdAt)}`)}">
      <button type="button" class="row-main" data-open-detail="${escapeHtml(request.id)}">
        <span class="row-amount">${escapeHtml(formatAmount(request.amount, request.currency))} ${escapeHtml(request.currency)}</span>
        <span>
          <strong>${escapeHtml(recipient.fullName)}</strong>
          <small>${escapeHtml([recipient.email, recipient.phone].filter(Boolean).join(" · "))}</small>
        </span>
        <span class="status-label status-${escapeHtml(request.status)}">${escapeHtml(formatStatusLabel(request.status))}</span>
        <span>${escapeHtml(formatRequestDate(request.createdAt))}</span>
      </button>
      <div class="row-actions">
        ${
          canWithdraw
            ? `<button type="button" class="secondary-action danger-action" data-withdraw="${escapeHtml(request.id)}" data-source="list">Withdraw</button>`
            : `<p class="ineligible-message">${escapeHtml(ERROR_MESSAGES.unavailable_action)}</p>`
        }
      </div>
    </li>
  `;
}

function renderOutgoingDetailView() {
  if (state.outgoing.detailLoading) {
    return `${renderBackBreadcrumb("back-to-outgoing", "Outgoing requests")}<section class="outgoing-panel" aria-live="polite"><p class="empty-state">Loading request details...</p></section>`;
  }

  if (state.outgoing.detailError || !state.outgoing.detail) {
    return `
      ${renderBackBreadcrumb("back-to-outgoing", "Outgoing requests")}
      <section class="outgoing-panel detail-panel">
        <div class="empty-block" role="alert">
          <h2>Outgoing request unavailable</h2>
          <p>${escapeHtml(unavailableRequestMessage(state.outgoing.detailError))}</p>
        </div>
      </section>
    `;
  }

  const request = state.outgoing.detail;
  const recipient = findRecipientDisplay(request.recipientId);
  const canWithdraw = canWithdrawPaymentRequest(request);

  return `
    ${renderBackBreadcrumb("back-to-outgoing", "Outgoing requests")}
    <section class="outgoing-panel detail-panel" aria-labelledby="detail-title">
      ${state.outgoing.successMessage ? `<p class="banner banner-success" role="status">${escapeHtml(state.outgoing.successMessage)}</p>` : ""}
      <div class="detail-header">
        <div>
          <p class="eyebrow">Outgoing request</p>
          <h2 id="detail-title">${escapeHtml(formatAmount(request.amount, request.currency))}</h2>
          <p class="muted">Requested from ${escapeHtml(recipient.fullName)}</p>
        </div>
        <span class="status-label status-${escapeHtml(request.status)}">${escapeHtml(formatStatusLabel(request.status))}</span>
      </div>
      <dl class="detail-grid">
        <div><dt>Recipient</dt><dd>${escapeHtml(recipient.fullName)}</dd></div>
        <div><dt>Recipient email</dt><dd>${escapeHtml(recipient.email || "Unavailable")}</dd></div>
        <div><dt>Request date</dt><dd>${escapeHtml(formatRequestDate(request.createdAt))}</dd></div>
        <div><dt>Receiver account</dt><dd>${escapeHtml(receiverAccountLabel(request.receiverAccountId))}</dd></div>
        <div><dt>Note</dt><dd>${escapeHtml(request.note || "No note")}</dd></div>
        <div><dt>Shareable link</dt>${renderShareableLinkCell(request.shareableLink)}</div>
      </dl>
      <div class="detail-actions">
        ${
          canWithdraw
            ? `<button type="button" class="primary-action danger-primary" data-withdraw="${escapeHtml(request.id)}" data-source="detail">Withdraw</button>`
            : `<p class="ineligible-message">${escapeHtml(ERROR_MESSAGES.unavailable_action)}</p>`
        }
      </div>
    </section>
  `;
}

function eyebrowForView() {
  if (state.view === "create") return "Create request";
  if (state.view === "outgoing" || state.view === "detail") return "Outgoing requests";
  if (state.view === "incoming" || state.view === "incoming-detail") return "Incoming requests";
  return "Payment request";
}

function filteredIncomingItems() {
  return filterIncomingPaymentRequests(state.incoming.items, {
    status: state.incoming.status,
    senderQuery: state.incoming.senderQuery
  });
}

function renderDaysRemainingLabel(request) {
  if (request.status !== "pending") return "-";
  const days = request.daysRemaining ?? 0;
  if (days <= 0) return "expires today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

function renderIncomingView() {
  if (state.incoming.loading) {
    return `<section class="incoming-panel" aria-live="polite"><p class="empty-state">Loading incoming requests...</p></section>`;
  }

  if (state.incoming.error) {
    return `
      <section class="incoming-panel">
        <p class="banner banner-error" role="alert">${escapeHtml(state.incoming.error)}</p>
        <button type="button" class="secondary-action" id="retry-incoming">Retry</button>
      </section>
    `;
  }

  const rows = filteredIncomingItems();
  const hasFilters = Boolean(state.incoming.status || state.incoming.senderQuery.trim());

  return `
    <section class="incoming-panel outgoing-panel" aria-labelledby="incoming-title">
      <div class="section-heading">
        <div>
          <h2 id="incoming-title">Incoming requests</h2>
          <p class="muted">Requests addressed to ${escapeHtml(state.currentUser.fullName)}.</p>
        </div>
        ${state.incoming.successMessage ? `<p class="banner banner-success" role="status">${escapeHtml(state.incoming.successMessage)}</p>` : ""}
      </div>

      <div class="filter-bar">
        <label for="incoming-status">
          <span>Status</span>
          <select id="incoming-status">
            <option value="">All statuses</option>
            <option value="pending" ${state.incoming.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="declined" ${state.incoming.status === "declined" ? "selected" : ""}>Declined</option>
            <option value="expired" ${state.incoming.status === "expired" ? "selected" : ""}>Expired</option>
            <option value="paid" ${state.incoming.status === "paid" ? "selected" : ""}>Paid</option>
          </select>
        </label>
        <label for="incoming-sender-query">
          <span>Sender</span>
          <input id="incoming-sender-query" type="search" value="${escapeHtml(state.incoming.senderQuery)}" placeholder="Search sender details" />
        </label>
        <button type="button" class="secondary-action" id="clear-incoming-filters" ${hasFilters ? "" : "disabled"}>Clear filters</button>
      </div>

      ${renderIncomingRows(rows, hasFilters)}
    </section>
  `;
}

function renderIncomingRows(rows, hasFilters) {
  if (state.incoming.items.length === 0) {
    return `
      <div class="empty-block" role="status">
        <h3>No incoming requests</h3>
        <p class="muted">Requests sent to you will appear here.</p>
      </div>
    `;
  }

  if (rows.length === 0 && hasFilters) {
    return `
      <div class="empty-block" role="status">
        <h3>No matching incoming requests</h3>
        <p class="muted">Clear filters or search for another sender.</p>
      </div>
    `;
  }

  return `
    <ul class="incoming-list outgoing-list" aria-label="Incoming requests">
      ${rows.map(renderIncomingRow).join("")}
    </ul>
  `;
}

function renderIncomingRow(request) {
  const sender = findSenderDisplay(request.senderId);
  const declinable = canDeclineIncoming(request);
  const payable = canPayIncoming(request, state.currentUser);
  const daysLabel = renderDaysRemainingLabel(request);

  return `
    <li class="outgoing-row incoming-row" role="row" aria-label="${escapeHtml(`${sender.fullName} ${formatAmount(request.amount, request.currency)} ${request.currency} ${formatStatusLabel(request.status)} ${formatRequestDate(request.createdAt)}`)}">
      <button type="button" class="row-main" data-open-incoming-detail="${escapeHtml(request.id)}">
        <span class="row-amount">${escapeHtml(formatAmount(request.amount, request.currency))} ${escapeHtml(request.currency)}</span>
        <span>
          <strong>${escapeHtml(sender.fullName)}</strong>
          <small>${escapeHtml([sender.email, sender.phone].filter(Boolean).join(" · "))}</small>
        </span>
        <span class="status-label status-${escapeHtml(request.status)}">${escapeHtml(formatStatusLabel(request.status))}</span>
        <span>${escapeHtml(formatRequestDate(request.createdAt))}</span>
        <span class="days-remaining">${escapeHtml(daysLabel)}</span>
      </button>
      <div class="row-actions">
        ${
          payable
            ? `<button type="button" class="icon-action icon-pay" data-pay="${escapeHtml(request.id)}" data-source="list" aria-label="Pay" title="Pay">${PAY_ICON}</button>`
            : ""
        }
        ${
          declinable
            ? `<button type="button" class="icon-action icon-decline" data-decline="${escapeHtml(request.id)}" data-source="list" aria-label="Decline" title="Decline">${DECLINE_ICON}</button>`
            : request.status === "pending"
              ? `<p class="ineligible-message">${escapeHtml(ERROR_MESSAGES.unavailable_decline_action)}</p>`
              : ""
        }
      </div>
    </li>
  `;
}

function renderIncomingDetailView() {
  if (state.incoming.detailLoading) {
    return `${renderBackBreadcrumb("back-to-incoming", "Incoming requests")}<section class="incoming-panel outgoing-panel" aria-live="polite"><p class="empty-state">Loading request details...</p></section>`;
  }

  if (state.incoming.detailError || !state.incoming.detail) {
    return `
      ${renderBackBreadcrumb("back-to-incoming", "Incoming requests")}
      <section class="incoming-panel outgoing-panel detail-panel">
        <div class="empty-block" role="alert">
          <h2>Incoming request unavailable</h2>
          <p>${escapeHtml(unavailableRequestMessage(state.incoming.detailError))}</p>
        </div>
      </section>
    `;
  }

  const request = state.incoming.detail;
  const sender = findSenderDisplay(request.senderId);
  const declinable = canDeclineIncoming(request);
  const daysLabel = renderDaysRemainingLabel(request);

  return `
    ${renderBackBreadcrumb("back-to-incoming", "Incoming requests")}
    <section class="incoming-panel outgoing-panel detail-panel" aria-labelledby="incoming-detail-title">
      ${state.incoming.successMessage ? `<p class="banner banner-success" role="status">${escapeHtml(state.incoming.successMessage)}</p>` : ""}
      <div class="detail-header">
        <div>
          <p class="eyebrow">Incoming request</p>
          <h2 id="incoming-detail-title">${escapeHtml(formatAmount(request.amount, request.currency))}</h2>
          <p class="muted">From ${escapeHtml(sender.fullName)}</p>
        </div>
        <span class="status-label status-${escapeHtml(request.status)}">${escapeHtml(formatStatusLabel(request.status))}</span>
      </div>
      <dl class="detail-grid">
        <div><dt>Sender</dt><dd>${escapeHtml(sender.fullName)}</dd></div>
        <div><dt>Sender email</dt><dd>${escapeHtml(sender.email || "Unavailable")}</dd></div>
        <div><dt>Request date</dt><dd>${escapeHtml(formatRequestDate(request.createdAt))}</dd></div>
        <div><dt>Expires</dt><dd>${escapeHtml(formatRequestDate(request.expiresAt))}</dd></div>
        <div><dt>Days remaining</dt><dd>${escapeHtml(daysLabel)}</dd></div>
        <div><dt>Receiver account</dt><dd>${escapeHtml(receiverAccountLabel(request.receiverAccountId))}</dd></div>
        <div><dt>Note</dt><dd>${escapeHtml(request.note || "No note")}</dd></div>
        <div><dt>Shareable link</dt>${renderShareableLinkCell(request.shareableLink)}</div>
      </dl>
      <div class="detail-actions">
        ${
          canPayIncoming(request, state.currentUser)
            ? `<button type="button" class="primary-action pay-action" data-pay="${escapeHtml(request.id)}" data-source="detail">Pay</button>`
            : ""
        }
        ${
          declinable
            ? `<button type="button" class="primary-action danger-primary" data-decline="${escapeHtml(request.id)}" data-source="detail">Decline</button>`
            : request.status === "pending"
              ? `<p class="ineligible-message">${escapeHtml(ERROR_MESSAGES.unavailable_decline_action)}</p>`
              : ""
        }
      </div>
    </section>
  `;
}

function renderDeclineDialog() {
  const dialog = state.incoming.decline;
  if (!dialog) return "";
  const request =
    state.incoming.items.find((item) => item.id === dialog.requestId) ??
    state.incoming.detail;
  const sender = findSenderDisplay(request?.senderId);

  return `
    <div class="modal-backdrop" role="presentation" data-decline-backdrop>
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="decline-title">
        <h2 id="decline-title">Decline request?</h2>
        <p>Confirm decline for the request from ${escapeHtml(sender.fullName)}. This changes the request status to declined.</p>
        ${
          state.incoming.declineError
            ? `<p class="banner banner-error" role="alert">${escapeHtml(state.incoming.declineError)}</p>`
            : ""
        }
        <div class="dialog-actions">
          <button type="button" class="secondary-action" id="cancel-decline">Cancel</button>
          <button type="button" class="primary-action danger-primary" id="confirm-decline" ${state.incoming.declining ? "disabled" : ""}>
            ${state.incoming.declining ? "Declining..." : "Confirm decline"}
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderPayDialog() {
  const dialog = state.incoming.pay;
  if (!dialog) return "";
  const request =
    state.incoming.items.find((item) => item.id === dialog.requestId) ??
    state.incoming.detail;
  if (!request) return "";

  const sender = findSenderDisplay(request.senderId);
  const accounts = state.customer.accounts;
  const accountsLoading = state.customer.accountsLoading;
  const accountsError = state.customer.accountsError;
  const eligible = findEligibleSourceAccounts(request, accounts);
  const description = describeSourceAccountState(request, accounts);
  const selectedAccount = findSelectedSourceAccount(dialog.selectedAccountId, accounts);
  const balance = selectedAccount ? Number(selectedAccount.balance) : null;
  const amount = Number(request.amount);
  const insufficient =
    selectedAccount && balance < amount && !state.incoming.payProcessing;
  const noAccount = !accountsLoading && !accountsError && description.state === "none";
  const requiresSelection = description.state === "multiple" && !selectedAccount;

  const confirmDisabled =
    state.incoming.paying ||
    state.incoming.payProcessing ||
    accountsLoading ||
    Boolean(accountsError) ||
    noAccount ||
    requiresSelection ||
    !selectedAccount ||
    insufficient;

  const accountSelector = accountsLoading
    ? `<p class="banner banner-info" role="status">Loading your accounts...</p>`
    : accountsError
      ? `<p class="banner banner-error" role="alert">${escapeHtml(accountsError)}</p>`
      : description.state === "single"
      ? `<p class="pay-account-fixed">Source account: <strong>${escapeHtml(eligible[0].displayName ?? eligible[0].label)}</strong> · ${escapeHtml(formatAccountTypeLabel(eligible[0].accountType))}<br /><span class="pay-account-number">${escapeHtml(eligible[0].accountNumber ?? "")}</span> · ${escapeHtml(formatAmount(eligible[0].balance, eligible[0].currency))} ${escapeHtml(eligible[0].currency)}</p>`
      : description.state === "multiple"
        ? `<label class="pay-account-label" for="pay-source-account">
            Source account
            <select id="pay-source-account" class="pay-account-select">
              <option value="">Select an account</option>
              ${eligible
                .map(
                  (account) => `
                <option value="${escapeHtml(account.id)}" ${dialog.selectedAccountId === account.id ? "selected" : ""}>
                  ${escapeHtml(account.displayName ?? account.label)} · ${escapeHtml(formatAmount(account.balance, account.currency))} ${escapeHtml(account.currency)}
                </option>
              `
                )
                .join("")}
            </select>
          </label>`
        : `<p class="banner banner-error pay-no-account" role="alert">${escapeHtml(ERROR_MESSAGES.no_matching_source_account)}</p>`;

  const balanceSummary =
    selectedAccount && description.state !== "single"
      ? `<p class="pay-balance-summary">
          <span class="pay-account-type">${escapeHtml(formatAccountTypeLabel(selectedAccount.accountType))}</span>
          ${selectedAccount.accountNumber ? `<span class="pay-account-number">${escapeHtml(selectedAccount.accountNumber)}</span>` : ""}
          <span class="pay-account-balance">Balance: ${escapeHtml(formatAmount(balance, selectedAccount.currency))} ${escapeHtml(selectedAccount.currency)}</span>
        </p>`
      : "";

  const insufficientBanner = insufficient
    ? `<p class="banner banner-error" role="alert">${escapeHtml(ERROR_MESSAGES.source_account_insufficient_balance)}</p>`
    : "";

  const errorBanner = state.incoming.payError
    ? `<p class="banner banner-error" role="alert">${escapeHtml(state.incoming.payError)}</p>`
    : "";

  const processingBanner = state.incoming.payProcessing
    ? `<p class="banner banner-info" role="status">Processing payment...</p>`
    : "";

  const confirmLabel = state.incoming.payProcessing
    ? "Processing..."
    : state.incoming.paying
      ? "Confirming..."
      : "Confirm payment";

  return `
    <div class="modal-backdrop" role="presentation" data-pay-backdrop>
      <section class="confirm-dialog pay-dialog" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <h2 id="pay-title">Pay request?</h2>
        <p>Confirm payment to ${escapeHtml(sender.fullName)} for <strong>${escapeHtml(formatAmount(request.amount, request.currency))} ${escapeHtml(request.currency)}</strong>.</p>
        ${request.note ? `<p class="pay-note muted">Note: ${escapeHtml(request.note)}</p>` : ""}
        ${accountSelector}
        ${balanceSummary}
        ${insufficientBanner}
        ${errorBanner}
        ${processingBanner}
        <div class="dialog-actions">
          <button type="button" class="secondary-action" id="cancel-pay" ${state.incoming.payProcessing ? "disabled" : ""}>Cancel</button>
          <button type="button" class="primary-action" id="confirm-pay" ${confirmDisabled ? "disabled" : ""}>
            ${escapeHtml(confirmLabel)}
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderWithdrawDialog() {
  const dialog = state.outgoing.withdraw;
  if (!dialog) return "";
  const request =
    state.outgoing.items.find((item) => item.id === dialog.requestId) ??
    state.outgoing.detail;
  const recipient = findRecipientDisplay(request?.recipientId);

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
        <h2 id="withdraw-title">Withdraw request?</h2>
        <p>Confirm withdrawal for ${escapeHtml(recipient.fullName)}. This changes the request status to withdrawn.</p>
        ${
          state.outgoing.withdrawError
            ? `<p class="banner banner-error" role="alert">${escapeHtml(state.outgoing.withdrawError)}</p>`
            : ""
        }
        <div class="dialog-actions">
          <button type="button" class="secondary-action" id="cancel-withdraw">Cancel</button>
          <button type="button" class="primary-action danger-primary" id="confirm-withdraw" ${state.outgoing.withdrawing ? "disabled" : ""}>
            ${state.outgoing.withdrawing ? "Withdrawing..." : "Confirm withdrawal"}
          </button>
        </div>
      </section>
    </div>
  `;
}

function bindSignIn() {
  document.querySelector("#signin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const matched = ALL_USERS.find((u) => u.email === email && u.password === password);
    if (matched) {
      state.signedIn = true;
      state.currentUser = matched;
      sessionStorage.setItem(SESSION_KEY, "true");
      sessionStorage.setItem(SESSION_USER_KEY, matched.id);
      setCurrentUserId(matched.id);
      state.signInError = "";
      resetRequestState();
      resetListsState();
      openOutgoingList();
      return;
    }
    state.signInError = "Invalid email or password.";
    render();
  });
}

function bindWorkspace() {
  document.querySelector("#sidebar-toggle")?.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    render();
  });

  document.querySelector("[data-sidebar-backdrop]")?.addEventListener("click", () => {
    state.sidebarOpen = false;
    render();
  });

  document.querySelector("#sign-out").addEventListener("click", () => {
    state.signedIn = false;
    state.currentUser = null;
    state.signInError = "";
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    setCurrentUserId(null);
    resetRequestState();
    resetListsState();
    window.history.replaceState({}, "", ROUTES.login);
    render();
  });

  document.querySelector(".sidebar-nav a").addEventListener("click", (event) => {
    event.preventDefault();
    state.sidebarOpen = false;
    resetRequestState();
    resetIncomingTransient();
    openOutgoingList();
  });

  document.querySelector("#open-create-request").addEventListener("click", () => {
    state.view = "create";
    state.detailId = "";
    resetRequestState();
    resetOutgoingTransient();
    resetIncomingTransient();
    syncUrlToState();
    render();
  });

  document.querySelector("#outgoing-tab").addEventListener("click", () => {
    openOutgoingList();
  });

  document.querySelector("#incoming-tab").addEventListener("click", () => {
    openIncomingList();
  });

  bindCreateView();
  bindOutgoingView();
  bindIncomingView();

  document.querySelectorAll("[data-copy-link]").forEach((button) => {
    button.addEventListener("click", () => {
      copyLinkToClipboard(button.dataset.copyLink, { kind: "detail" });
    });
  });
}

function bindCreateView() {
  if (state.view !== "create") return;

  document.querySelector("#recipient-search").addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    state.errors.recipientId = "";
    render();
    const recipientSearch = document.querySelector("#recipient-search");
    recipientSearch.focus();
    recipientSearch.setSelectionRange(state.searchQuery.length, state.searchQuery.length);
  });

  document.querySelectorAll("[data-recipient-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRecipientId = button.dataset.recipientId;
      state.searchQuery = "";
      state.errors.recipientId = "";
      state.submitError = "";
      render();
    });
  });

  document.querySelector("#change-recipient")?.addEventListener("click", () => {
    state.selectedRecipientId = "";
    state.searchQuery = "";
    state.errors.recipientId = "";
    state.submitError = "";
    render();
    document.querySelector("#recipient-search").focus();
  });

  document.querySelector("#receiver-account").addEventListener("change", (event) => {
    state.receiverAccountId = event.target.value;
    state.errors.receiverAccountId = "";
    state.submitError = "";
    render();
  });

  document.querySelector("#amount").addEventListener("input", (event) => {
    state.amount = event.target.value.replace(/[^\d.,-]/g, "");
    state.errors.amount = "";
    state.submitError = "";
    document.querySelector("#summary-amount").textContent = requestedAmountText();
  });

  document.querySelector("#amount").addEventListener("blur", (event) => {
    state.amount = formatPlainAmount(event.target.value);
    event.target.value = state.amount;
    document.querySelector("#summary-amount").textContent = requestedAmountText();
  });

  document.querySelector("#note").addEventListener("input", (event) => {
    state.note = event.target.value.slice(0, NOTE_LIMIT);
    event.target.value = state.note;
    document.querySelector("#note-count").textContent = `${state.note.length}/${NOTE_LIMIT}`;
  });

  document.querySelector("#request-form").addEventListener("submit", submitRequest);
}

function bindOutgoingView() {
  if (state.view === "outgoing") {
    document.querySelector("#retry-outgoing")?.addEventListener("click", () => loadOutgoingRequests(true));
    document.querySelector("#outgoing-status")?.addEventListener("change", (event) => {
      state.outgoing.status = event.target.value;
      render();
    });
    document.querySelector("#outgoing-recipient-query")?.addEventListener("input", (event) => {
      state.outgoing.recipientQuery = event.target.value;
      render();
      const input = document.querySelector("#outgoing-recipient-query");
      input.focus();
      input.setSelectionRange(state.outgoing.recipientQuery.length, state.outgoing.recipientQuery.length);
    });
    document.querySelector("#clear-outgoing-filters")?.addEventListener("click", () => {
      state.outgoing.status = "";
      state.outgoing.recipientQuery = "";
      render();
    });
    document.querySelectorAll("[data-open-detail]").forEach((button) => {
      button.addEventListener("click", () => openOutgoingDetail(button.dataset.openDetail));
    });
  }

  if (state.view === "detail") {
    document.querySelector("#back-to-outgoing")?.addEventListener("click", () => openOutgoingList(false));
  }

  document.querySelectorAll("[data-withdraw]").forEach((button) => {
    button.addEventListener("click", () => {
      state.outgoing.withdraw = {
        requestId: button.dataset.withdraw,
        source: button.dataset.source
      };
      state.outgoing.withdrawError = "";
      render();
    });
  });

  document.querySelector("#cancel-withdraw")?.addEventListener("click", () => {
    closeWithdrawDialog();
  });

  document.querySelector(".modal-backdrop")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeWithdrawDialog();
  });

  if (state.outgoing.withdraw) {
    document.addEventListener("keydown", handleWithdrawKeydown, { once: true });
  }

  document.querySelector("#confirm-withdraw")?.addEventListener("click", confirmWithdraw);
}

function handleWithdrawKeydown(event) {
  if (event.key === "Escape" && state.outgoing.withdraw) {
    closeWithdrawDialog();
  }
}

function closeWithdrawDialog() {
  state.outgoing.withdraw = null;
  state.outgoing.withdrawError = "";
  render();
}

async function openOutgoingList(reload = false) {
  state.view = "outgoing";
  state.detailId = "";
  resetOutgoingTransient();
  syncUrlToState();
  render();
  if (reload || !state.outgoing.loaded) {
    await loadOutgoingRequests(reload);
  }
}

async function loadOutgoingRequests(force = false) {
  if (state.outgoing.loading) return;
  if (state.outgoing.loaded && !force) return;

  state.outgoing.loading = true;
  state.outgoing.error = "";
  state.outgoing.successMessage = "";
  render();

  try {
    state.outgoing.items = await listOutgoingPaymentRequests();
    state.outgoing.loaded = true;
  } catch (error) {
    state.outgoing.error = error.message || ERROR_MESSAGES.outgoing_list_failed;
  } finally {
    state.outgoing.loading = false;
    render();
  }
}

async function openOutgoingDetail(id, { skipUrlSync = false } = {}) {
  state.view = "detail";
  state.detailId = id;
  state.outgoing.detail = null;
  state.outgoing.detailError = "";
  state.outgoing.detailLoading = true;
  state.outgoing.successMessage = "";
  if (!skipUrlSync) syncUrlToState();
  render();

  try {
    state.outgoing.detail = await getOutgoingPaymentRequest(id);
  } catch (error) {
    const fallback = state.outgoing.items.find((item) => item.id === id);
    if (fallback) {
      state.outgoing.detail = fallback;
    } else {
      state.outgoing.detailError = error.code || "request_not_found";
    }
  } finally {
    state.outgoing.detailLoading = false;
    render();
  }
}

function mergeUpdatedRequest(updatedRequest) {
  state.outgoing.items = state.outgoing.items.map((item) =>
    item.id === updatedRequest.id ? updatedRequest : item
  );
  if (state.outgoing.detail?.id === updatedRequest.id) {
    state.outgoing.detail = updatedRequest;
  }
}

async function confirmWithdraw() {
  const dialog = state.outgoing.withdraw;
  if (!dialog || state.outgoing.withdrawing) return;

  state.outgoing.withdrawing = true;
  state.outgoing.withdrawError = "";
  render();

  try {
    const updatedRequest = await withdrawPaymentRequest(dialog.requestId, { confirm: true });
    if (updatedRequest) mergeUpdatedRequest(updatedRequest);
    state.outgoing.withdraw = null;
    state.outgoing.successMessage = "Request withdrawn.";
  } catch (error) {
    if (error.body?.paymentRequest) {
      mergeUpdatedRequest(error.body.paymentRequest);
    }
    state.outgoing.withdrawError = error.message || ERROR_MESSAGES.withdraw_failed;
  } finally {
    state.outgoing.withdrawing = false;
    render();
  }
}

async function copyLinkToClipboard(link, { kind = "detail" } = {}) {
  if (!link) return;
  const absoluteUrl = new URL(link, window.location.origin).toString();
  try {
    await navigator.clipboard.writeText(absoluteUrl);
    if (kind === "create") {
      state.copyMessage = "Copied";
    }
    state.copiedLink = link;
  } catch {
    if (kind === "create") {
      state.copyMessage = "Copy failed";
    }
    state.copiedLink = "";
  }
  render();
  if (state.copiedLink === link) {
    setTimeout(() => {
      if (state.copiedLink === link) {
        state.copiedLink = "";
        render();
      }
    }, 1800);
  }
}

async function submitRequest(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  const validation = validatePaymentRequestForm({
    recipientId: state.selectedRecipientId,
    receiverAccountId: state.receiverAccountId,
    amount: state.amount,
    note: state.note
  });

  state.errors = validation.errors;
  state.submitError = "";
  state.success = null;

  if (!validation.ok) {
    render();
    return;
  }

  state.isSubmitting = true;
  render();

  try {
    const created = await createPaymentRequest(validation.value);
    state.success = created;
    state.searchQuery = "";
    state.selectedRecipientId = "";
    state.receiverAccountId = "";
    state.amount = "";
    state.note = "";
    state.errors = {};
    state.submitError = "";
    state.copyMessage = "";
  } catch (error) {
    state.submitError = error.message || ERROR_MESSAGES.request_creation_failed;
  } finally {
    state.isSubmitting = false;
    render();
    document.querySelector("#success-state")?.focus();
  }
}

function bindIncomingView() {
  if (state.view === "incoming") {
    document.querySelector("#retry-incoming")?.addEventListener("click", () => loadIncomingRequests(true));
    document.querySelector("#incoming-status")?.addEventListener("change", (event) => {
      state.incoming.status = event.target.value;
      render();
    });
    document.querySelector("#incoming-sender-query")?.addEventListener("input", (event) => {
      state.incoming.senderQuery = event.target.value;
      render();
      const input = document.querySelector("#incoming-sender-query");
      input.focus();
      input.setSelectionRange(state.incoming.senderQuery.length, state.incoming.senderQuery.length);
    });
    document.querySelector("#clear-incoming-filters")?.addEventListener("click", () => {
      state.incoming.status = "";
      state.incoming.senderQuery = "";
      render();
    });
    document.querySelectorAll("[data-open-incoming-detail]").forEach((button) => {
      button.addEventListener("click", () => openIncomingDetail(button.dataset.openIncomingDetail));
    });
  }

  if (state.view === "incoming-detail") {
    document.querySelector("#back-to-incoming")?.addEventListener("click", () => openIncomingList(false));
  }

  document.querySelectorAll("[data-decline]").forEach((button) => {
    button.addEventListener("click", () => {
      state.incoming.decline = {
        requestId: button.dataset.decline,
        source: button.dataset.source
      };
      state.incoming.declineError = "";
      render();
    });
  });

  document.querySelector("#cancel-decline")?.addEventListener("click", () => {
    closeDeclineDialog();
  });

  document.querySelector("[data-decline-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeDeclineDialog();
  });

  if (state.incoming.decline) {
    document.addEventListener("keydown", handleDeclineKeydown, { once: true });
  }

  document.querySelector("#confirm-decline")?.addEventListener("click", confirmDecline);

  document.querySelectorAll("[data-pay]").forEach((button) => {
    button.addEventListener("click", () => {
      openPayDialog(button.dataset.pay, button.dataset.source);
    });
  });

  document.querySelector("#cancel-pay")?.addEventListener("click", () => {
    closePayDialog();
  });

  document.querySelector("[data-pay-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closePayDialog();
  });

  document.querySelector("#pay-source-account")?.addEventListener("change", (event) => {
    if (state.incoming.pay) {
      state.incoming.pay.selectedAccountId = event.target.value;
      state.incoming.payError = "";
      render();
    }
  });

  if (state.incoming.pay && !state.incoming.payProcessing) {
    document.addEventListener("keydown", handlePayKeydown, { once: true });
  }

  document.querySelector("#confirm-pay")?.addEventListener("click", confirmPay);
}

function handlePayKeydown(event) {
  if (event.key === "Escape" && state.incoming.pay && !state.incoming.payProcessing) {
    closePayDialog();
  }
}

async function openPayDialog(requestId, source) {
  state.incoming.pay = {
    requestId,
    source,
    selectedAccountId: ""
  };
  state.incoming.payError = "";
  state.incoming.payProcessing = false;
  state.customer.accounts = [];
  state.customer.accountsLoading = true;
  state.customer.accountsError = "";
  render();

  let accounts = [];
  try {
    accounts = await fetchCustomerAccounts();
  } catch (error) {
    if (state.incoming.pay?.requestId !== requestId) return;
    state.customer.accountsLoading = false;
    state.customer.accountsError =
      error?.message || ERROR_MESSAGES.customer_accounts_failed;
    render();
    return;
  }

  if (state.incoming.pay?.requestId !== requestId) return;

  const request =
    state.incoming.items.find((item) => item.id === requestId) ?? state.incoming.detail;
  state.customer.accounts = accounts;
  state.customer.accountsLoading = false;
  state.customer.accountsError = "";
  state.incoming.pay.selectedAccountId = defaultSelectedSourceAccountId(request, accounts);
  render();
}

function closePayDialog() {
  if (state.incoming.payProcessing) return;
  state.incoming.pay = null;
  state.incoming.payError = "";
  state.incoming.paying = false;
  state.customer.accounts = [];
  state.customer.accountsLoading = false;
  state.customer.accountsError = "";
  render();
}

async function confirmPay() {
  const dialog = state.incoming.pay;
  if (!dialog || state.incoming.paying || state.incoming.payProcessing) return;

  const request =
    state.incoming.items.find((item) => item.id === dialog.requestId) ?? state.incoming.detail;
  if (!request) return;

  const selectedAccount = findSelectedSourceAccount(
    dialog.selectedAccountId,
    state.customer.accounts
  );
  if (!selectedAccount) {
    state.incoming.payError = ERROR_MESSAGES.source_account_required;
    render();
    return;
  }
  if (Number(selectedAccount.balance) < Number(request.amount)) {
    state.incoming.payError = ERROR_MESSAGES.source_account_insufficient_balance;
    render();
    return;
  }

  state.incoming.paying = true;
  state.incoming.payProcessing = true;
  state.incoming.payError = "";
  render();

  const startTime = Date.now();
  let payResponse = null;
  let payError = null;
  try {
    payResponse = await payIncomingPaymentRequest(dialog.requestId, {
      confirm: true,
      sourceAccountId: dialog.selectedAccountId
    });
  } catch (error) {
    payError = error;
  }

  const elapsed = Date.now() - startTime;
  const remaining = Math.max(0, PROCESSING_DELAY_MS - elapsed);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  state.incoming.payProcessing = false;
  state.incoming.paying = false;

  if (payError) {
    if (payError.body?.paymentRequest) {
      mergeUpdatedIncomingRequest(payError.body.paymentRequest);
    }
    if (payError.body?.sourceAccount) {
      applyUpdatedSourceAccount(payError.body.sourceAccount);
    }
    state.incoming.payError = payError.message || ERROR_MESSAGES.pay_failed;
    render();
    return;
  }

  if (payResponse?.paymentRequest) {
    mergeUpdatedIncomingRequest(payResponse.paymentRequest);
  }
  if (payResponse?.sourceAccount) {
    applyUpdatedSourceAccount(payResponse.sourceAccount);
  }
  state.incoming.pay = null;
  state.incoming.successMessage = "Payment completed.";
  state.customer.accounts = [];
  state.customer.accountsLoading = false;
  state.customer.accountsError = "";
  render();
}

function applyUpdatedSourceAccount(updated) {
  state.customer.accounts = state.customer.accounts.map((account) =>
    account.id === updated.id
      ? {
          ...account,
          balance: Number(updated.balance),
          displayName: updated.displayName ?? account.displayName,
          accountNumber: updated.accountNumber ?? account.accountNumber,
          accountType: updated.accountType ?? account.accountType
        }
      : account
  );
}

function handleDeclineKeydown(event) {
  if (event.key === "Escape" && state.incoming.decline) {
    closeDeclineDialog();
  }
}

function closeDeclineDialog() {
  state.incoming.decline = null;
  state.incoming.declineError = "";
  render();
}

async function openIncomingList(reload = false) {
  const cameFromDetail = state.view === "incoming-detail";
  state.view = "incoming";
  state.detailId = "";
  resetIncomingTransient();
  resetOutgoingTransient();
  syncUrlToState();
  render();
  if (reload || (!state.incoming.loaded && !cameFromDetail)) {
    await loadIncomingRequests(reload);
  } else if (!state.incoming.loaded) {
    await loadIncomingRequests(false);
  }
}

async function loadIncomingRequests(force = false) {
  if (state.incoming.loading) return;
  if (state.incoming.loaded && !force) return;

  state.incoming.loading = true;
  state.incoming.error = "";
  state.incoming.successMessage = "";
  render();

  try {
    const items = await fetchIncomingPaymentRequests();
    state.incoming.items = items.map((request) => shapeIncomingForDisplay(request));
    state.incoming.loaded = true;
  } catch (error) {
    state.incoming.error = error.message || ERROR_MESSAGES.incoming_list_failed;
  } finally {
    state.incoming.loading = false;
    render();
  }
}

async function openIncomingDetail(id, { skipUrlSync = false } = {}) {
  state.view = "incoming-detail";
  state.detailId = id;
  state.incoming.detail = null;
  state.incoming.detailError = "";
  state.incoming.detailLoading = true;
  state.incoming.successMessage = "";
  if (!skipUrlSync) syncUrlToState();
  render();

  try {
    const detail = await fetchIncomingPaymentRequest(id);
    state.incoming.detail = shapeIncomingForDisplay(detail);
  } catch (error) {
    const fallback = state.incoming.items.find((item) => item.id === id);
    if (fallback) {
      state.incoming.detail = fallback;
    } else {
      state.incoming.detailError = error.code || "request_not_found";
    }
  } finally {
    state.incoming.detailLoading = false;
    render();
  }
}

function mergeUpdatedIncomingRequest(updatedRequest) {
  const shaped = shapeIncomingForDisplay(updatedRequest);
  state.incoming.items = state.incoming.items.map((item) =>
    item.id === shaped.id ? shaped : item
  );
  if (state.incoming.detail?.id === shaped.id) {
    state.incoming.detail = shaped;
  }
}

async function confirmDecline() {
  const dialog = state.incoming.decline;
  if (!dialog || state.incoming.declining) return;

  state.incoming.declining = true;
  state.incoming.declineError = "";
  render();

  try {
    const updated = await declineIncomingPaymentRequest(dialog.requestId, { confirm: true });
    if (updated) mergeUpdatedIncomingRequest(updated);
    state.incoming.decline = null;
    state.incoming.successMessage = "Request declined.";
  } catch (error) {
    if (error.body?.paymentRequest) {
      mergeUpdatedIncomingRequest(error.body.paymentRequest);
    }
    state.incoming.declineError = error.message || ERROR_MESSAGES.decline_failed;
  } finally {
    state.incoming.declining = false;
    render();
  }
}

function applyRouteFromLocation({ replaceUrl = true } = {}) {
  if (!state.signedIn || !state.currentUser) {
    if (window.location.pathname !== ROUTES.login) {
      window.history.replaceState({}, "", ROUTES.login);
    }
    render();
    return;
  }

  const route = parseRoute(window.location.pathname);
  if (route.view === "outgoing") {
    openOutgoingList();
  } else if (route.view === "incoming") {
    openIncomingList();
  } else if (route.view === "create") {
    state.view = "create";
    state.detailId = "";
    resetRequestState();
    resetOutgoingTransient();
    resetIncomingTransient();
    if (replaceUrl) syncUrlToState({ replace: true });
    render();
  } else if (route.view === "detail" && route.detailId) {
    openOutgoingDetail(route.detailId, { skipUrlSync: replaceUrl });
    if (replaceUrl) syncUrlToState({ replace: true });
  } else if (route.view === "incoming-detail" && route.detailId) {
    openIncomingDetail(route.detailId, { skipUrlSync: replaceUrl });
    if (replaceUrl) syncUrlToState({ replace: true });
  } else if (route.view === "share" && route.hash) {
    resolveShareableLink(route.hash);
  } else {
    openOutgoingList();
  }
}

async function resolveShareableLink(hash) {
  state.view = "outgoing";
  state.outgoing.loading = true;
  state.outgoing.error = "";
  render();

  try {
    const result = await fetchPaymentRequestByHash(hash);
    const request = result?.paymentRequest;
    const direction = result?.direction;
    if (!request) {
      throw new Error("Request not found");
    }
    if (direction === "incoming") {
      await openIncomingDetail(request.id);
    } else {
      await openOutgoingDetail(request.id);
    }
  } catch (error) {
    state.outgoing.loading = false;
    state.outgoing.error = error?.message || ERROR_MESSAGES.request_not_found;
    state.view = "outgoing";
    window.history.replaceState({}, "", ROUTES.outgoingList);
    render();
  }
}

window.addEventListener("popstate", () => {
  applyRouteFromLocation({ replaceUrl: false });
});

applyRouteFromLocation({ replaceUrl: true });
