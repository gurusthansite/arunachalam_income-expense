-- Schema and migrations for Organization Income & Expense Management
-- Database: PostgreSQL on Supabase

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organization Settings
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    organization_name TEXT NOT NULL DEFAULT 'My Organization',
    logo_url TEXT,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    opening_balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    financial_year_start_month INTEGER NOT NULL DEFAULT 4 CHECK (financial_year_start_month BETWEEN 1 AND 12),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure the single settings record exists
INSERT INTO public.organization_settings (id, organization_name, opening_balance, opening_balance_date, financial_year_start_month)
VALUES (1, 'Organization', 0.00, CURRENT_DATE, 4)
ON CONFLICT (id) DO NOTHING;

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT categories_name_type_unique UNIQUE (name, type)
);

CREATE INDEX IF NOT EXISTS idx_categories_type_active ON public.categories (type, is_active);

-- Seed default categories if empty
INSERT INTO public.categories (name, type, is_active) VALUES
    ('Donations', 'income', true),
    ('Contributions', 'income', true),
    ('Grants', 'income', true),
    ('Membership Fees', 'income', true),
    ('Other Income', 'income', true),
    ('Food', 'expense', true),
    ('Travel', 'expense', true),
    ('Rent', 'expense', true),
    ('Electricity and Utilities', 'expense', true),
    ('Printing and Stationery', 'expense', true),
    ('Event Expenses', 'expense', true),
    ('Salaries and Honorariums', 'expense', true),
    ('Maintenance', 'expense', true),
    ('Other Expenses', 'expense', true)
ON CONFLICT (name, type) DO NOTHING;

-- 4. Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    category_id UUID NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
    person_name TEXT,
    payment_method TEXT NOT NULL,
    description TEXT,
    reference_number TEXT,
    created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);

-- 5. Organization Members
CREATE TABLE IF NOT EXISTS public.org_members (
    user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- 7. Audit Log Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_id TEXT;
BEGIN
    BEGIN
        v_email := current_setting('request.jwt.claims', true)::jsonb ->> 'email';
    EXCEPTION WHEN OTHERS THEN
        v_email := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        v_id := OLD.id::TEXT;
        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, user_email)
        VALUES (TG_TABLE_NAME, TG_OP, v_id, to_jsonb(OLD), v_email);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_id := NEW.id::TEXT;
        INSERT INTO public.audit_logs (table_name, action, record_id, old_data, new_data, user_email)
        VALUES (TG_TABLE_NAME, TG_OP, v_id, to_jsonb(OLD), to_jsonb(NEW), v_email);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_id := NEW.id::TEXT;
        INSERT INTO public.audit_logs (table_name, action, record_id, new_data, user_email)
        VALUES (TG_TABLE_NAME, TG_OP, v_id, to_jsonb(NEW), v_email);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_categories ON public.categories;
CREATE TRIGGER trg_audit_categories
AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_organization_settings ON public.organization_settings;
CREATE TRIGGER trg_audit_organization_settings
AFTER UPDATE ON public.organization_settings
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 8. Functions / RPCs for Financial Calculations

-- 8a. Financial Summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(
    p_start DATE DEFAULT NULL,
    p_end DATE DEFAULT NULL
)
RETURNS TABLE (
    opening_balance NUMERIC,
    prior_net NUMERIC,
    total_income NUMERIC,
    total_expense NUMERIC,
    transaction_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_opening NUMERIC;
    v_prior_net NUMERIC := 0;
    v_income NUMERIC := 0;
    v_expense NUMERIC := 0;
    v_count BIGINT := 0;
BEGIN
    SELECT COALESCE(os.opening_balance, 0)
    INTO v_opening
    FROM public.organization_settings os
    WHERE os.id = 1;

    IF v_opening IS NULL THEN
        v_opening := 0;
    END IF;

    -- Calculate net prior to start date if p_start is given
    IF p_start IS NOT NULL THEN
        SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)
        INTO v_prior_net
        FROM public.transactions t
        WHERE t.transaction_date < p_start;
    ELSE
        v_prior_net := 0;
    END IF;

    -- Calculate period income, expense, and transaction count
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0),
        COUNT(*)
    INTO
        v_income,
        v_expense,
        v_count
    FROM public.transactions t
    WHERE
        (p_start IS NULL OR t.transaction_date >= p_start)
        AND (p_end IS NULL OR t.transaction_date <= p_end);

    RETURN QUERY
    SELECT v_opening, v_prior_net, v_income, v_expense, v_count;
END;
$$;

-- 8b. Period Totals (Monthly or Daily)
CREATE OR REPLACE FUNCTION public.get_period_totals(
    p_start DATE DEFAULT NULL,
    p_end DATE DEFAULT NULL,
    p_granularity TEXT DEFAULT 'month'
)
RETURNS TABLE (
    period TEXT,
    income NUMERIC,
    expense NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    IF p_granularity = 'day' THEN
        RETURN QUERY
        SELECT
            to_char(t.transaction_date, 'YYYY-MM-DD') AS period,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense
        FROM public.transactions t
        WHERE
            (p_start IS NULL OR t.transaction_date >= p_start)
            AND (p_end IS NULL OR t.transaction_date <= p_end)
        GROUP BY t.transaction_date
        ORDER BY t.transaction_date ASC;
    ELSE
        RETURN QUERY
        SELECT
            to_char(t.transaction_date, 'YYYY-MM') AS period,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense
        FROM public.transactions t
        WHERE
            (p_start IS NULL OR t.transaction_date >= p_start)
            AND (p_end IS NULL OR t.transaction_date <= p_end)
        GROUP BY to_char(t.transaction_date, 'YYYY-MM')
        ORDER BY to_char(t.transaction_date, 'YYYY-MM') ASC;
    END IF;
END;
$$;

-- 8c. Category Totals
CREATE OR REPLACE FUNCTION public.get_category_totals(
    p_start DATE DEFAULT NULL,
    p_end DATE DEFAULT NULL,
    p_type TEXT DEFAULT 'expense'
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    total NUMERIC,
    tx_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS category_id,
        c.name AS category_name,
        COALESCE(SUM(t.amount), 0) AS total,
        COUNT(t.id) AS tx_count
    FROM public.categories c
    INNER JOIN public.transactions t ON t.category_id = c.id
    WHERE
        t.type = p_type
        AND (p_start IS NULL OR t.transaction_date >= p_start)
        AND (p_end IS NULL OR t.transaction_date <= p_end)
    GROUP BY c.id, c.name
    ORDER BY total DESC;
END;
$$;

-- 8d. Person / Source Totals
CREATE OR REPLACE FUNCTION public.get_person_totals(
    p_start DATE DEFAULT NULL,
    p_end DATE DEFAULT NULL,
    p_type TEXT DEFAULT 'expense'
)
RETURNS TABLE (
    person_name TEXT,
    total NUMERIC,
    tx_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.person_name,
        COALESCE(SUM(t.amount), 0) AS total,
        COUNT(t.id) AS tx_count
    FROM public.transactions t
    WHERE
        t.type = p_type
        AND t.person_name IS NOT NULL
        AND trim(t.person_name) <> ''
        AND (p_start IS NULL OR t.transaction_date >= p_start)
        AND (p_end IS NULL OR t.transaction_date <= p_end)
    GROUP BY t.person_name
    ORDER BY total DESC;
END;
$$;

-- 9. Row Level Security (RLS) Setup
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper check if user is a member
CREATE OR REPLACE FUNCTION public.is_org_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE user_id = auth.uid()
    );
$$;

-- Helper check if user is an admin
CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.org_members
        WHERE user_id = auth.uid() AND role = 'admin'
    );
$$;

-- Policies for organization_settings
CREATE POLICY "Members can view settings"
    ON public.organization_settings FOR SELECT
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Admins can update settings"
    ON public.organization_settings FOR UPDATE
    TO authenticated
    USING (public.is_org_admin());

-- Policies for categories
CREATE POLICY "Members can view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Members can insert categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (public.is_org_member());

CREATE POLICY "Members can update categories"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (public.is_org_admin());

-- Policies for transactions
CREATE POLICY "Members can view transactions"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Members can insert transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_org_member());

CREATE POLICY "Members can update transactions"
    ON public.transactions FOR UPDATE
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Members can delete transactions"
    ON public.transactions FOR DELETE
    TO authenticated
    USING (public.is_org_member());

-- Policies for org_members
CREATE POLICY "Members can view members"
    ON public.org_members FOR SELECT
    TO authenticated
    USING (public.is_org_member());

CREATE POLICY "Admins can manage members"
    ON public.org_members FOR ALL
    TO authenticated
    USING (public.is_org_admin());

-- Policies for audit_logs
CREATE POLICY "Members can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.is_org_member());
