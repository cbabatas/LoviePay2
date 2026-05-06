import { demoUser, friends } from "./mock-data.js";
import {
  ERROR_MESSAGES,
  deriveCurrency,
  formatAmount,
  searchFriends,
  validatePaymentRequestForm
} from "./payment-request.js";
import { createPaymentRequest } from "./request-api.js";

const app = document.querySelector("#app");

const state = {
  signedIn: false,
  signInError: "",
  searchQuery: "",
  selectedRecipientId: "",
  receiverAccountId: "",
  amount: "",
  note: "",
  errors: {},
  isSubmitting: false,
  submitError: "",
  success: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedRecipient() {
  return friends.find((friend) => friend.id === state.selectedRecipientId) ?? null;
}

function fieldError(name) {
  const code = state.errors[name];
  return code ? ERROR_MESSAGES[code] ?? ERROR_MESSAGES.request_creation_failed : "";
}

function render() {
  if (!state.signedIn) {
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
        <p class="muted">Sign in with the demo account to create a payment request.</p>
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
          <button class="primary-action" type="submit">Sign in</button>
        </form>
      </section>
    </main>
  `;
}

function renderWorkspace() {
  const accountOptions = demoUser.receiverAccounts
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
  const results = searchFriends(state.searchQuery);
  const hasSearch = state.searchQuery.trim().length > 0;

  return `
    <div class="app-shell">
      <aside class="sidebar" aria-label="Demo user">
        <div class="avatar" aria-hidden="true">${escapeHtml(demoUser.avatarLabel)}</div>
        <div>
          <p class="sidebar-name">${escapeHtml(demoUser.fullName)}</p>
          <p class="sidebar-meta">${escapeHtml(demoUser.customerNumber)}</p>
          <p class="sidebar-email">${escapeHtml(demoUser.email)}</p>
        </div>
        <nav class="sidebar-nav" aria-label="Workspace">
          <a href="#" aria-current="page">Payment request</a>
        </nav>
      </aside>

      <main class="workspace" aria-labelledby="page-title">
        <header class="workspace-header">
          <div>
            <p class="eyebrow">Create request</p>
            <h1 id="page-title">Payment request</h1>
          </div>
          <div class="status-pill">Pending on submit</div>
        </header>

        <section class="request-layout">
          <form id="request-form" class="request-form" novalidate>
            <div class="field-group">
              <label for="recipient-search">Recipient</label>
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
                <label for="receiver-account">Receiver account</label>
                <select id="receiver-account" name="receiverAccountId" aria-describedby="receiver-account-error">
                  <option value="">Select account</option>
                  ${accountOptions}
                </select>
                ${renderInlineError("receiver-account-error", fieldError("receiverAccountId"))}
              </div>
              <div class="field-group">
                <span class="field-label">Currency</span>
                <output id="derived-currency" class="derived-value" aria-live="polite">
                  ${currency ? escapeHtml(currency) : "Select account"}
                </output>
              </div>
            </div>

            <div class="field-group">
              <label for="amount">Amount</label>
              <input
                id="amount"
                name="amount"
                type="text"
                inputmode="decimal"
                value="${escapeHtml(state.amount)}"
                aria-describedby="amount-error"
              />
              ${renderInlineError("amount-error", fieldError("amount"))}
            </div>

            <div class="field-group">
              <label for="note">Note</label>
              <textarea id="note" name="note" rows="4" maxlength="240">${escapeHtml(state.note)}</textarea>
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
                <dd>${currency || "Not selected"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>Pending</dd>
              </div>
            </dl>
          </aside>
        </section>

        ${state.success ? renderSuccess(state.success) : ""}
      </main>
    </div>
  `;
}

function renderRecipientResults(results, hasSearch) {
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
      <strong>${escapeHtml(recipient.fullName)}</strong>
      <span>${escapeHtml(recipient.email)}</span>
    </div>
  `;
}

function renderInlineError(id, message) {
  return `<p id="${id}" class="field-error" ${message ? "role=\"alert\"" : ""}>${escapeHtml(message)}</p>`;
}

function renderSuccess(paymentRequest) {
  const recipient = friends.find((friend) => friend.id === paymentRequest.recipientId);
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
          <dd><a href="${escapeHtml(paymentRequest.shareableLink)}">${escapeHtml(paymentRequest.shareableLink)}</a></dd>
        </div>
      </dl>
      <p class="hash-line">Hash: <span>${escapeHtml(paymentRequest.hash)}</span></p>
    </section>
  `;
}

function bindSignIn() {
  document.querySelector("#signin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (email === demoUser.email && password === demoUser.password) {
      state.signedIn = true;
      state.signInError = "";
    } else {
      state.signInError = "Use the demo email and password for this workspace.";
    }

    render();
  });
}

function bindWorkspace() {
  document.querySelector(".sidebar-nav a").addEventListener("click", (event) => {
    event.preventDefault();
  });

  document.querySelector("#recipient-search").addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    state.errors.recipientId = "";
    render();
    document.querySelector("#recipient-search").focus();
  });

  document.querySelectorAll("[data-recipient-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRecipientId = button.dataset.recipientId;
      state.errors.recipientId = "";
      state.submitError = "";
      render();
    });
  });

  document.querySelector("#receiver-account").addEventListener("change", (event) => {
    state.receiverAccountId = event.target.value;
    state.errors.receiverAccountId = "";
    state.submitError = "";
    render();
  });

  document.querySelector("#amount").addEventListener("input", (event) => {
    state.amount = event.target.value;
    state.errors.amount = "";
    state.submitError = "";
  });

  document.querySelector("#note").addEventListener("input", (event) => {
    state.note = event.target.value;
  });

  document.querySelector("#request-form").addEventListener("submit", submitRequest);
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
    state.success = await createPaymentRequest(validation.value);
  } catch (error) {
    state.submitError = error.message || ERROR_MESSAGES.request_creation_failed;
  } finally {
    state.isSubmitting = false;
    render();
    document.querySelector("#success-state")?.focus();
  }
}

render();
