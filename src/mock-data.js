export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP"];

export const demoUser = {
  id: "demo_user_001",
  fullName: "Ayla Demir",
  email: "ayla.demo@loviepay.test",
  password: "demo-pass-001",
  customerNumber: "LP-204813",
  avatarLabel: "AD",
  receiverAccounts: [
    {
      id: "acct_eur_main",
      label: "Everyday EUR",
      currency: "EUR"
    },
    {
      id: "acct_usd_travel",
      label: "Travel USD",
      currency: "USD"
    },
    {
      id: "acct_gbp_family",
      label: "Family GBP",
      currency: "GBP"
    }
  ]
};

export const friends = [
  {
    id: "friend_001",
    fullName: "Mika Korhonen",
    email: "mika.korhonen@example.test",
    phone: "+358 40 123 4567",
    active: true
  },
  {
    id: "friend_002",
    fullName: "Leila Santos",
    email: "leila.santos@example.test",
    phone: "+358 45 222 1188",
    active: true
  },
  {
    id: "friend_003",
    fullName: "Jonas Berg",
    email: "jonas.berg@example.test",
    phone: "+46 70 555 0199",
    active: true
  },
  {
    id: "friend_004",
    fullName: "Noora Laine",
    email: "noora.laine@example.test",
    phone: "+358 50 911 2233",
    active: false
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
    note: "Incoming record excluded from outgoing management",
    status: "pending",
    hash: "hash_incoming_001",
    shareableLink: "/r/hash_incoming_001",
    createdAt: "2026-05-06T13:00:00.000Z",
    updatedAt: "2026-05-06T13:00:00.000Z"
  }
];
