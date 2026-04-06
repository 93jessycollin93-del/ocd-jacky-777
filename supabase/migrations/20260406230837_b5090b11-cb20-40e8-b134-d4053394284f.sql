-- Transaction ledger for all premium currency operations
CREATE TABLE public.game_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'spend', 'reward', 'claim')),
  currency_type text NOT NULL CHECK (currency_type IN ('diamonds', 'stars', 'usd', 'ton', 'gold')),
  amount integer NOT NULL,
  balance_before integer NOT NULL DEFAULT 0,
  balance_after integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  source_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.game_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
ON public.game_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies - immutable audit log

-- Purchase deduplication lock table
CREATE TABLE public.game_purchase_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id text NOT NULL,
  source text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, transaction_id)
);

ALTER TABLE public.game_purchase_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locks"
ON public.game_purchase_locks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locks"
ON public.game_purchase_locks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_game_transactions_user_id ON public.game_transactions(user_id);
CREATE INDEX idx_game_transactions_source ON public.game_transactions(source);
CREATE INDEX idx_game_purchase_locks_lookup ON public.game_purchase_locks(user_id, transaction_id);