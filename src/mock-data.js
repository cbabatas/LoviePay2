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
