-- Moify — Multi-event schema
-- Run: psql -U postgres -f setup_db.sql

CREATE DATABASE moify_db;
\c moify_db;

-- ─── Users (must be created first — events references users) ──────────────

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(50)  NOT NULL DEFAULT 'admin',  -- admin | superadmin | user
    full_name     VARCHAR(200),
    mobile_number VARCHAR(15)  UNIQUE,                    -- can be used to login
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username        ON users(lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile          ON users(mobile_number) WHERE mobile_number IS NOT NULL;
CREATE        INDEX IF NOT EXISTS idx_users_role            ON users(role);
CREATE        INDEX IF NOT EXISTS idx_users_is_active       ON users(is_active);
CREATE        INDEX IF NOT EXISTS idx_users_active_username ON users(lower(username)) WHERE is_active = TRUE;

COMMENT ON TABLE users IS 'Application users — role: admin | superadmin | user. Login by username or mobile_number.';

-- ─── Events ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id             SERIAL PRIMARY KEY,
    event_type     VARCHAR(30)  NOT NULL DEFAULT 'wedding',
    primary_name   VARCHAR(100) NOT NULL,
    secondary_name VARCHAR(100),
    family_name    VARCHAR(100),
    event_date     DATE         NOT NULL,
    venue          VARCHAR(300),
    city           VARCHAR(100),
    district       VARCHAR(100),
    notes          TEXT,
    created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- FK to owner user
    status         VARCHAR(20)  NOT NULL DEFAULT 'approved',         -- pending | approved
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_event_date   ON events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_event_type   ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_primary_name ON events(lower(primary_name));
CREATE INDEX IF NOT EXISTS idx_events_created_by   ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_status       ON events(status);

COMMENT ON TABLE events IS 'Events: wedding, birthday, baby_shower, engagement, anniversary, other';

-- ─── Moi Entries ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS moi_entries (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    guest_name      VARCHAR(150) NOT NULL,
    relationship    VARCHAR(100),
    side            VARCHAR(20)  DEFAULT 'groom',   -- groom | bride | both
    amount          NUMERIC(10, 2) NOT NULL,
    payment_mode    VARCHAR(30)  DEFAULT 'cash',    -- cash | cheque | online
    cheque_number   VARCHAR(50),
    transaction_ref VARCHAR(100),
    city            VARCHAR(100),
    district        VARCHAR(100),
    phone           VARCHAR(20),
    notes           TEXT,
    received_by     VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by      INTEGER REFERENCES public.users(id)
);

-- Indexes for moi_entries
CREATE INDEX IF NOT EXISTS idx_moi_event_id         ON moi_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_moi_side             ON moi_entries(side);
CREATE INDEX IF NOT EXISTS idx_moi_payment_mode     ON moi_entries(payment_mode);
CREATE INDEX IF NOT EXISTS idx_moi_guest_name       ON moi_entries(lower(guest_name));
CREATE INDEX IF NOT EXISTS idx_moi_relationship     ON moi_entries(lower(relationship));
CREATE INDEX IF NOT EXISTS idx_moi_event_side       ON moi_entries(event_id, side);
CREATE INDEX IF NOT EXISTS idx_moi_created_at       ON moi_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moi_city             ON moi_entries(lower(city)) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_moi_district         ON moi_entries(lower(district)) WHERE district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_city          ON events(lower(city)) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_district      ON events(lower(district)) WHERE district IS NOT NULL;

COMMENT ON TABLE moi_entries IS 'Moi (cash gift) entries per event';

-- ─── Default admin user ───────────────────────────────────────────────────────
-- Password: moify@2024  (bcrypt rounds=12)
-- Change via: POST /api/auth/change-password
-- Or call:    GET  /api/auth/setup  (auto-creates table + this user)

INSERT INTO users (username, password_hash, role, full_name, mobile_number, is_active)
VALUES (
    'admin',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LDHfE6vKYS0GwBqOG',
    'admin',
    'Administrator',
    '9789616611',
    TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Update mobile number for existing admin (migration)
UPDATE users SET mobile_number = '9789616611'
WHERE username = 'admin' AND mobile_number IS NULL;

-- ─── Sample data ─────────────────────────────────────────────────────────────

INSERT INTO events (event_type, primary_name, secondary_name, family_name, event_date, venue, city, created_by) VALUES
('wedding',     'Karthik',  'Priya',  'Krishnaswamy', '2025-02-14', 'Sri Mahalakshmi Kalyana Mahal', 'Chennai',    (SELECT id FROM users WHERE username = 'admin')),
('birthday',    'Suresh',   NULL,     NULL,            '2025-03-05', 'Raj Hotel Banquet Hall',        'Coimbatore', (SELECT id FROM users WHERE username = 'admin')),
('baby_shower', 'Meena',    'Ravi',   NULL,            '2025-04-10', 'Home',                          'Madurai',    (SELECT id FROM users WHERE username = 'admin'));

INSERT INTO moi_entries (event_id, guest_name, relationship, side, amount, payment_mode, city, received_by) VALUES
(1, 'Annamalai',       'Periappa (Uncle)',  'groom', 5000,  'cash',   'Madurai',    'Karthik'),
(1, 'Meenakshi Achi',  'Periyamma (Aunt)',  'groom', 3000,  'cash',   'Chennai',    'Karthik'),
(1, 'Ramesh & Family', 'Friend',            'groom', 2001,  'cash',   'Bangalore',  'Karthik'),
(1, 'Sundaram Chitti', 'Chitti (Uncle)',    'bride', 10000, 'online', 'Singapore',  'Priya'),
(2, 'Murugan',         'Uncle',             'groom', 1001,  'cash',   'Coimbatore', 'Suresh'),
(3, 'Kamala Aunty',    'Maternal Aunt',     'groom', 2500,  'cash',   'Madurai',    'Meena');

-- ─── Migration: existing DB — add new columns if upgrading ───────────────────
-- Run these ALTER statements on an existing moify_db:
--
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15) UNIQUE;
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15) UNIQUE;
--   ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
--   ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';
--   CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
--   CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
--   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile_number) WHERE mobile_number IS NOT NULL;
--   -- Assign existing events to admin:
--   UPDATE events SET created_by = (SELECT id FROM users WHERE username = 'admin') WHERE created_by IS NULL;

-- ─── Migration: add event approval status (run on existing moify_db) ───────
--
--   ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'approved';
--   CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- ─── Migration: add created_by to moi_entries ────────────────────────────────
--   ALTER TABLE moi_entries ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES public.users(id);

-- ─── Migration: add district column ──────────────────────────────────────────
--   ALTER TABLE events      ADD COLUMN IF NOT EXISTS district VARCHAR(100);
--   ALTER TABLE moi_entries ADD COLUMN IF NOT EXISTS district VARCHAR(100);
--   CREATE INDEX IF NOT EXISTS idx_events_district  ON events(lower(district))      WHERE district IS NOT NULL;
--   CREATE INDEX IF NOT EXISTS idx_moi_city         ON moi_entries(lower(city))     WHERE city IS NOT NULL;
--   CREATE INDEX IF NOT EXISTS idx_moi_district     ON moi_entries(lower(district)) WHERE district IS NOT NULL;

-- ─── Migration: moi_manager_db → moify_db rename (reference only) ──────
-- If you already have data in the old moi_manager_db, dump and restore:
--
--   pg_dump -U postgres moi_manager_db > backup.sql
--   psql  -U postgres moify_db   < backup.sql

-- ─── Migration: v1 weddings table → v2 events table ──────────────────────────
-- Run ONLY if upgrading from the old schema that had a "weddings" table.
--
-- BEGIN;
--
-- INSERT INTO events (id, event_type, primary_name, secondary_name, family_name,
--                     event_date, venue, city, notes, created_at, updated_at)
-- SELECT id, 'wedding', groom_name, bride_name, family_name,
--        wedding_date, venue, city, notes, created_at, updated_at
-- FROM weddings;
--
-- SELECT setval('events_id_seq', (SELECT MAX(id) FROM events));
--
-- ALTER TABLE moi_entries ADD COLUMN event_id INTEGER;
-- UPDATE moi_entries SET event_id = wedding_id;
-- ALTER TABLE moi_entries ALTER COLUMN event_id SET NOT NULL;
-- ALTER TABLE moi_entries ADD CONSTRAINT moi_entries_event_id_fkey
--     FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
--
-- UPDATE moi_entries SET side = 'groom' WHERE side = 'groom_side';
-- UPDATE moi_entries SET side = 'bride' WHERE side = 'bride_side';
--
-- ALTER TABLE moi_entries DROP COLUMN wedding_id;
-- DROP TABLE weddings;
--
-- COMMIT;

-- ─── Missing columns on existing tables ──────────────────────────────────────

ALTER TABLE public.moi_entries ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES public.users(id);
ALTER TABLE public.moi_entries ADD COLUMN IF NOT EXISTS received_by VARCHAR(100);

-- ─── Soft-delete columns ──────────────────────────────────────────────────────

ALTER TABLE public.moi_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ─── CHECK constraints ────────────────────────────────────────────────────────

ALTER TABLE public.moi_entries ADD CONSTRAINT IF NOT EXISTS chk_amount_positive CHECK (amount > 0);
ALTER TABLE public.moi_entries ADD CONSTRAINT IF NOT EXISTS chk_side CHECK (side IN ('groom','bride','both'));
ALTER TABLE public.moi_entries ADD CONSTRAINT IF NOT EXISTS chk_payment_mode CHECK (payment_mode IN ('cash','cheque','online','dd'));
ALTER TABLE public.events ADD CONSTRAINT IF NOT EXISTS chk_event_status CHECK (status IN ('pending','approved','rejected','completed'));
ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS chk_user_role CHECK (role IN ('admin','user'));

-- ─── Composite indexes for paginated queries ──────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_moi_entries_event_created ON public.moi_entries(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moi_entries_deleted ON public.moi_entries(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_deleted ON public.events(deleted_at) WHERE deleted_at IS NULL;

-- ─── Audit log table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  actor_username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id, created_at DESC);

-- ─── Token blocklist table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.token_blocklist (
  id SERIAL PRIMARY KEY,
  jti VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_token_blocklist_jti ON public.token_blocklist(jti);
CREATE INDEX IF NOT EXISTS idx_token_blocklist_expires ON public.token_blocklist(expires_at);

-- ─── party_size column on moi_entries ────────────────────────────────────────

ALTER TABLE public.moi_entries ADD COLUMN IF NOT EXISTS party_size INTEGER DEFAULT 1 CHECK (party_size > 0);

