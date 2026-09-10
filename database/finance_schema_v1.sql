-- Financeiro V1
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_account_id TEXT,
  bank_last4 TEXT,
  account_status TEXT NOT NULL DEFAULT 'pending',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  provider TEXT NOT NULL,
  external_payment_id TEXT NOT NULL,
  method TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  fee NUMERIC(14,2) DEFAULT 0,
  net_amount NUMERIC(14,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT UNIQUE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, external_payment_id)
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  available_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  available_at TIMESTAMPTZ,
  transferred_at TIMESTAMPTZ
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id),
  payment_account_id UUID NOT NULL REFERENCES payment_accounts(id),
  provider TEXT NOT NULL,
  external_payout_id TEXT,
  amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT,
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, external_event_id)
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_payouts_status ON payouts(status);
