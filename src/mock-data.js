export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP"];

export const demoUser = {
  id: "demo_user_001",
  fullName: "Ayla Demir",
  email: "ayla.demo@loviepay.test",
  password: "1234",
  customerNumber: "LP-204813",
  avatarLabel: "AD",
  receiverAccounts: [
    {
      id: "acct_eur_main",
      ownerId: "demo_user_001",
      label: "Everyday EUR",
      displayName: "Everyday EUR",
      accountNumber: "FI21 1234 5600 0007 85",
      accountType: "current_account",
      currency: "EUR",
      balance: 412
    },
    {
      id: "acct_usd_travel",
      ownerId: "demo_user_001",
      label: "Travel USD",
      displayName: "Travel USD",
      accountNumber: "US42 9988 7766 5544 33",
      accountType: "current_account",
      currency: "USD",
      balance: 280
    },
    {
      id: "acct_gbp_family",
      ownerId: "demo_user_001",
      label: "Family GBP",
      displayName: "Family GBP",
      accountNumber: "GB29 NWBK 6016 1331 9268 19",
      accountType: "term_deposit",
      currency: "GBP",
      balance: 56
    }
  ],
  friends: ["friend_001", "friend_002", "friend_003", "friend_004", "friend_005", "friend_006", "friend_007"]
};

export const friends = [
  {
    id: "friend_001",
    fullName: "Mika Korhonen",
    email: "mika.korhonen@example.test",
    password: "1234",
    phone: "+358 40 123 4567",
    active: true,
    customerNumber: "LP-319042",
    avatarLabel: "MK",
    receiverAccounts: [
      { id: "friend_001_acct_eur", ownerId: "friend_001", label: "Everyday EUR", displayName: "Everyday EUR", accountNumber: "FI19 1010 0001 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_001_acct_usd", ownerId: "friend_001", label: "Travel USD", displayName: "Travel USD", accountNumber: "US10 0001 0001 0001 0102", accountType: "current_account", currency: "USD", balance: 1000 }
    ],
    friends: ["demo_user_001", "friend_002", "friend_005"]
  },
  {
    id: "friend_002",
    fullName: "Leila Santos",
    email: "leila.santos@example.test",
    password: "1234",
    phone: "+358 45 222 1188",
    active: true,
    customerNumber: "LP-472815",
    avatarLabel: "LS",
    receiverAccounts: [
      { id: "friend_002_acct_eur", ownerId: "friend_002", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0002 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_002_acct_gbp", ownerId: "friend_002", label: "GBP Savings", displayName: "GBP Savings", accountNumber: "GB29 NWBK 0002 0002 0202 02", accountType: "term_deposit", currency: "GBP", balance: 1000 }
    ],
    friends: ["friend_001", "friend_003", "friend_006"]
  },
  {
    id: "friend_003",
    fullName: "Jonas Berg",
    email: "jonas.berg@example.test",
    password: "1234",
    phone: "+46 70 555 0199",
    active: true,
    customerNumber: "LP-538290",
    avatarLabel: "JB",
    receiverAccounts: [
      { id: "friend_003_acct_eur", ownerId: "friend_003", label: "Personal EUR", displayName: "Personal EUR", accountNumber: "FI19 1010 0003 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_003_acct_usd", ownerId: "friend_003", label: "USD Account", displayName: "USD Account", accountNumber: "US10 0003 0003 0003 0103", accountType: "current_account", currency: "USD", balance: 1000 },
      { id: "friend_003_acct_gbp", ownerId: "friend_003", label: "Family GBP", displayName: "Family GBP", accountNumber: "GB29 NWBK 0003 0003 0303 03", accountType: "term_deposit", currency: "GBP", balance: 1000 }
    ],
    friends: ["demo_user_001", "friend_002", "friend_007"]
  },
  {
    id: "friend_004",
    fullName: "Noora Laine",
    email: "noora.laine@example.test",
    password: "1234",
    phone: "+358 50 911 2233",
    active: false,
    customerNumber: "LP-601734",
    avatarLabel: "NL",
    receiverAccounts: [
      { id: "friend_004_acct_eur", ownerId: "friend_004", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0004 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 }
    ],
    friends: ["friend_005", "friend_006"]
  },
  {
    id: "friend_005",
    fullName: "Pekka Aalto",
    email: "pekka.aalto@example.test",
    password: "1234",
    phone: "+358 40 777 5544",
    active: true,
    customerNumber: "LP-714561",
    avatarLabel: "PA",
    receiverAccounts: [
      { id: "friend_005_acct_eur", ownerId: "friend_005", label: "Everyday EUR", displayName: "Everyday EUR", accountNumber: "FI19 1010 0005 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_005_acct_usd", ownerId: "friend_005", label: "Travel USD", displayName: "Travel USD", accountNumber: "US10 0005 0005 0005 0105", accountType: "current_account", currency: "USD", balance: 1000 }
    ],
    friends: ["demo_user_001", "friend_001", "friend_004"]
  },
  {
    id: "friend_006",
    fullName: "Sara Lindqvist",
    email: "sara.lindqvist@example.test",
    password: "1234",
    phone: "+46 73 333 8899",
    active: true,
    customerNumber: "LP-823407",
    avatarLabel: "SL",
    receiverAccounts: [
      { id: "friend_006_acct_eur", ownerId: "friend_006", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0006 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_006_acct_gbp", ownerId: "friend_006", label: "GBP Account", displayName: "GBP Account", accountNumber: "GB29 NWBK 0006 0006 0606 06", accountType: "current_account", currency: "GBP", balance: 1000 }
    ],
    friends: ["friend_002", "friend_004", "friend_007"]
  },
  {
    id: "friend_007",
    fullName: "Tomas Virtanen",
    email: "tomas.virtanen@example.test",
    password: "1234",
    phone: "+358 50 444 1212",
    active: true,
    customerNumber: "LP-937182",
    avatarLabel: "TV",
    receiverAccounts: [
      { id: "friend_007_acct_eur", ownerId: "friend_007", label: "Personal EUR", displayName: "Personal EUR", accountNumber: "FI19 1010 0007 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "friend_007_acct_usd", ownerId: "friend_007", label: "USD Savings", displayName: "USD Savings", accountNumber: "US10 0007 0007 0007 0107", accountType: "term_deposit", currency: "USD", balance: 1000 },
      { id: "friend_007_acct_gbp", ownerId: "friend_007", label: "GBP Account", displayName: "GBP Account", accountNumber: "GB29 NWBK 0007 0007 0707 07", accountType: "current_account", currency: "GBP", balance: 1000 }
    ],
    friends: ["demo_user_001", "friend_003", "friend_006"]
  }
];

export const paymentRequests = [
  {
    id: "req_outgoing_001",
    senderId: demoUser.id,
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "hash_outgoing_001",
    shareableLink: "/r/hash_outgoing_001",
    createdAt: "2026-05-06T12:00:00.000Z",
    updatedAt: "2026-05-06T12:00:00.000Z"
  },
  {
    id: "req_outgoing_002",
    senderId: demoUser.id,
    recipientId: "friend_002",
    receiverAccountId: "acct_usd_travel",
    amount: 48.75,
    currency: "USD",
    note: "Taxi share",
    status: "withdrawn",
    hash: "hash_outgoing_002",
    shareableLink: "/r/hash_outgoing_002",
    createdAt: "2026-05-05T09:30:00.000Z",
    updatedAt: "2026-05-05T10:00:00.000Z"
  },
  {
    id: "req_outgoing_003",
    senderId: demoUser.id,
    recipientId: "friend_003",
    receiverAccountId: "acct_gbp_family",
    amount: 210,
    currency: "GBP",
    note: "",
    status: "pending",
    hash: "hash_outgoing_003",
    shareableLink: "/r/hash_outgoing_003",
    createdAt: "2026-05-04T16:15:00.000Z",
    updatedAt: "2026-05-04T16:15:00.000Z"
  },
  {
    id: "req_incoming_001",
    senderId: "friend_001",
    recipientId: demoUser.id,
    receiverAccountId: "acct_eur_main",
    amount: 88,
    currency: "EUR",
    note: "Concert ticket",
    status: "pending",
    hash: "hash_incoming_001",
    shareableLink: "/r/hash_incoming_001",
    createdAt: "2026-05-06T13:00:00.000Z",
    updatedAt: "2026-05-06T13:00:00.000Z"
  },
  {
    id: "req_incoming_002",
    senderId: "friend_005",
    recipientId: demoUser.id,
    receiverAccountId: "acct_usd_travel",
    amount: 32.4,
    currency: "USD",
    note: "Birthday gift split",
    status: "declined",
    hash: "hash_incoming_002",
    shareableLink: "/r/hash_incoming_002",
    createdAt: "2026-05-03T09:00:00.000Z",
    updatedAt: "2026-05-03T11:30:00.000Z"
  },
  {
    id: "req_incoming_003",
    senderId: "friend_006",
    recipientId: demoUser.id,
    receiverAccountId: "acct_gbp_family",
    amount: 56,
    currency: "GBP",
    note: "Boundary case (exactly 7 days)",
    status: "pending",
    hash: "hash_incoming_003",
    shareableLink: "/r/hash_incoming_003",
    createdAt: "2026-04-29T13:00:00.000Z",
    updatedAt: "2026-04-29T13:00:00.000Z"
  },
  {
    id: "req_incoming_004",
    senderId: "friend_007",
    recipientId: demoUser.id,
    receiverAccountId: "acct_eur_main",
    amount: 145.75,
    currency: "EUR",
    note: "Old shared dinner",
    status: "pending",
    hash: "hash_incoming_004",
    shareableLink: "/r/hash_incoming_004",
    createdAt: "2026-04-15T10:00:00.000Z",
    updatedAt: "2026-04-15T10:00:00.000Z"
  }
];

export const accountingAccounts = {
  paymentRequestsExpense: {
    id: "expense_payment_requests",
    accountCode: "5000"
  }
};

export const paymentTransactions = [];
export const ledgerEntries = [];
