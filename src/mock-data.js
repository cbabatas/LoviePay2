export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP"];

export const users = [
  {
    id: "user_001",
  fullName: "Ayla Demir",
  email: "ayla.demo@loviepay.test",
  password: "1234",
  active: true,
  customerNumber: "LP-204813",
  avatarLabel: "AD",
  receiverAccounts: [
    {
      id: "user_001_acct_eur",
      ownerId: "user_001",
      label: "Everyday EUR",
      displayName: "Everyday EUR",
      accountNumber: "FI21 1234 5600 0007 85",
      accountType: "current_account",
      currency: "EUR",
      balance: 412
    },
    {
      id: "user_001_acct_usd",
      ownerId: "user_001",
      label: "Travel USD",
      displayName: "Travel USD",
      accountNumber: "US42 9988 7766 5544 33",
      accountType: "current_account",
      currency: "USD",
      balance: 280
    },
    {
      id: "user_001_acct_gbp",
      ownerId: "user_001",
      label: "Family GBP",
      displayName: "Family GBP",
      accountNumber: "GB29 NWBK 6016 1331 9268 19",
      accountType: "term_deposit",
      currency: "GBP",
      balance: 56
    }
  ],
  friends: ["user_002", "user_003", "user_004", "user_005", "user_006", "user_007", "user_008"]
  },
  {
    id: "user_002",
    fullName: "Mika Korhonen",
    email: "mika.korhonen@example.test",
    password: "1234",
    phone: "+358 40 123 4567",
    active: true,
    customerNumber: "LP-319042",
    avatarLabel: "MK",
    receiverAccounts: [
      { id: "user_002_acct_eur", ownerId: "user_002", label: "Everyday EUR", displayName: "Everyday EUR", accountNumber: "FI19 1010 0001 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_002_acct_usd", ownerId: "user_002", label: "Travel USD", displayName: "Travel USD", accountNumber: "US10 0001 0001 0001 0102", accountType: "current_account", currency: "USD", balance: 1000 }
    ],
    friends: ["user_001", "user_003", "user_006"]
  },
  {
    id: "user_003",
    fullName: "Leila Santos",
    email: "leila.santos@example.test",
    password: "1234",
    phone: "+358 45 222 1188",
    active: true,
    customerNumber: "LP-472815",
    avatarLabel: "LS",
    receiverAccounts: [
      { id: "user_003_acct_eur", ownerId: "user_003", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0002 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_003_acct_gbp", ownerId: "user_003", label: "GBP Savings", displayName: "GBP Savings", accountNumber: "GB29 NWBK 0002 0002 0202 02", accountType: "term_deposit", currency: "GBP", balance: 1000 }
    ],
    friends: ["user_002", "user_004", "user_007"]
  },
  {
    id: "user_004",
    fullName: "Jonas Berg",
    email: "jonas.berg@example.test",
    password: "1234",
    phone: "+46 70 555 0199",
    active: true,
    customerNumber: "LP-538290",
    avatarLabel: "JB",
    receiverAccounts: [
      { id: "user_004_acct_eur", ownerId: "user_004", label: "Personal EUR", displayName: "Personal EUR", accountNumber: "FI19 1010 0003 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_004_acct_usd", ownerId: "user_004", label: "USD Account", displayName: "USD Account", accountNumber: "US10 0003 0003 0003 0103", accountType: "current_account", currency: "USD", balance: 1000 },
      { id: "user_004_acct_gbp", ownerId: "user_004", label: "Family GBP", displayName: "Family GBP", accountNumber: "GB29 NWBK 0003 0003 0303 03", accountType: "term_deposit", currency: "GBP", balance: 1000 }
    ],
    friends: ["user_001", "user_003", "user_008"]
  },
  {
    id: "user_005",
    fullName: "Noora Laine",
    email: "noora.laine@example.test",
    password: "1234",
    phone: "+358 50 911 2233",
    active: false,
    customerNumber: "LP-601734",
    avatarLabel: "NL",
    receiverAccounts: [
      { id: "user_005_acct_eur", ownerId: "user_005", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0004 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 }
    ],
    friends: ["user_006", "user_007"]
  },
  {
    id: "user_006",
    fullName: "Pekka Aalto",
    email: "pekka.aalto@example.test",
    password: "1234",
    phone: "+358 40 777 5544",
    active: true,
    customerNumber: "LP-714561",
    avatarLabel: "PA",
    receiverAccounts: [
      { id: "user_006_acct_eur", ownerId: "user_006", label: "Everyday EUR", displayName: "Everyday EUR", accountNumber: "FI19 1010 0005 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_006_acct_usd", ownerId: "user_006", label: "Travel USD", displayName: "Travel USD", accountNumber: "US10 0005 0005 0005 0105", accountType: "current_account", currency: "USD", balance: 1000 }
    ],
    friends: ["user_001", "user_002", "user_005"]
  },
  {
    id: "user_007",
    fullName: "Sara Lindqvist",
    email: "sara.lindqvist@example.test",
    password: "1234",
    phone: "+46 73 333 8899",
    active: true,
    customerNumber: "LP-823407",
    avatarLabel: "SL",
    receiverAccounts: [
      { id: "user_007_acct_eur", ownerId: "user_007", label: "Main EUR", displayName: "Main EUR", accountNumber: "FI19 1010 0006 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_007_acct_gbp", ownerId: "user_007", label: "GBP Account", displayName: "GBP Account", accountNumber: "GB29 NWBK 0006 0006 0606 06", accountType: "current_account", currency: "GBP", balance: 1000 }
    ],
    friends: ["user_003", "user_005", "user_008"]
  },
  {
    id: "user_008",
    fullName: "Tomas Virtanen",
    email: "tomas.virtanen@example.test",
    password: "1234",
    phone: "+358 50 444 1212",
    active: true,
    customerNumber: "LP-937182",
    avatarLabel: "TV",
    receiverAccounts: [
      { id: "user_008_acct_eur", ownerId: "user_008", label: "Personal EUR", displayName: "Personal EUR", accountNumber: "FI19 1010 0007 0001 11", accountType: "current_account", currency: "EUR", balance: 1000 },
      { id: "user_008_acct_usd", ownerId: "user_008", label: "USD Savings", displayName: "USD Savings", accountNumber: "US10 0007 0007 0007 0107", accountType: "term_deposit", currency: "USD", balance: 1000 },
      { id: "user_008_acct_gbp", ownerId: "user_008", label: "GBP Account", displayName: "GBP Account", accountNumber: "GB29 NWBK 0007 0007 0707 07", accountType: "current_account", currency: "GBP", balance: 1000 }
    ],
    friends: ["user_001", "user_004", "user_007"]
  }
];

export const paymentRequests = [
  {
    id: "e039ca67-aa00-4bb6-a69f-86051c725ea4",
    senderId: "user_001",
    recipientId: "user_002",
    receiverAccountId: "user_001_acct_eur",
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
    id: "4ef20f5a-830b-4867-a0ec-d3ea6b6ea4e6",
    senderId: "user_001",
    recipientId: "user_003",
    receiverAccountId: "user_001_acct_usd",
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
    id: "35eda6a1-6831-4467-8488-6f2fd8976251",
    senderId: "user_001",
    recipientId: "user_004",
    receiverAccountId: "user_001_acct_gbp",
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
    id: "33b2d1b5-cc13-4e06-af1d-f4b2c52e79e1",
    senderId: "user_002",
    recipientId: "user_001",
    receiverAccountId: "user_002_acct_eur",
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
    id: "a5099a43-d5d1-494a-b4cf-533c16eaf721",
    senderId: "user_006",
    recipientId: "user_001",
    receiverAccountId: "user_006_acct_usd",
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
    id: "8ee581ea-8fb8-46bb-b4f8-8bbf488007b6",
    senderId: "user_007",
    recipientId: "user_001",
    receiverAccountId: "user_007_acct_gbp",
    amount: 56,
    currency: "GBP",
    note: "Boundary case (exactly 7 days)",
    status: "expired",
    hash: "hash_incoming_003",
    shareableLink: "/r/hash_incoming_003",
    createdAt: "2026-04-29T13:00:00.000Z",
    updatedAt: "2026-04-29T13:00:00.000Z"
  },
  {
    id: "d9ba4e1b-ecd4-4fe8-a13d-f8d7c69d1fe6",
    senderId: "user_008",
    recipientId: "user_001",
    receiverAccountId: "user_008_acct_eur",
    amount: 145.75,
    currency: "EUR",
    note: "Old shared dinner",
    status: "expired",
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
