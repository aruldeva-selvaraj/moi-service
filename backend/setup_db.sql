-- Moi Manager v2 — Multi-event schema
-- Run: psql -U postgres -f setup_db.sql

CREATE DATABASE moi_manager_db;
\c moi_manager_db;

-- Tables are auto-created by SQLAlchemy on first startup.
-- Use this script for manual setup or migration.

-- ─── Fresh install ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id            SERIAL PRIMARY KEY,
    event_type    VARCHAR(30)  NOT NULL DEFAULT 'wedding',
    primary_name  VARCHAR(100) NOT NULL,
    secondary_name VARCHAR(100),
    family_name   VARCHAR(100),
    event_date    DATE         NOT NULL,
    venue         VARCHAR(300),
    city          VARCHAR(100),
    notes         TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moi_entries (
    id              SERIAL PRIMARY KEY,
    event_id        INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    guest_name      VARCHAR(150) NOT NULL,
    relationship    VARCHAR(100),
    side            VARCHAR(20)  DEFAULT 'groom',  -- groom, bride, both
    amount          NUMERIC(10, 2) NOT NULL,
    payment_mode    VARCHAR(30)  DEFAULT 'cash',
    cheque_number   VARCHAR(50),
    transaction_ref VARCHAR(100),
    city            VARCHAR(100),
    phone           VARCHAR(20),
    notes           TEXT,
    received_by     VARCHAR(100),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE events IS 'Events: wedding, birthday, baby_shower, engagement, anniversary, other';
COMMENT ON TABLE moi_entries IS 'Moi (cash gift) entries per event';

-- ─── Sample data ─────────────────────────────────────────────────────────────

INSERT INTO events (event_type, primary_name, secondary_name, family_name, event_date, venue, city) VALUES
('wedding',     'Karthik',  'Priya',     'Krishnaswamy', '2025-02-14', 'Sri Mahalakshmi Kalyana Mahal', 'Chennai'),
('birthday',    'Suresh',   NULL,        NULL,           '2025-03-05', 'Raj Hotel Banquet Hall',        'Coimbatore'),
('baby_shower', 'Meena',    'Ravi',      NULL,           '2025-04-10', 'Home',                          'Madurai');

INSERT INTO moi_entries (event_id, guest_name, relationship, side, amount, payment_mode, city, received_by) VALUES
(1, 'Annamalai',       'Periappa (Uncle)',   'groom', 5000,  'cash',   'Madurai',    'Karthik'),
(1, 'Meenakshi Achi',  'Periyamma (Aunt)',   'groom', 3000,  'cash',   'Chennai',    'Karthik'),
(1, 'Ramesh & Family', 'Friend',             'groom', 2001,  'cash',   'Bangalore',  'Karthik'),
(1, 'Sundaram Chitti', 'Chitti (Uncle)',     'bride', 10000, 'online', 'Singapore',  'Priya'),
(2, 'Murugan',         'Uncle',              'groom', 1001,  'cash',   'Coimbatore', 'Suresh'),
(3, 'Kamala Aunty',    'Maternal Aunt',      'groom', 2500,  'cash',   'Madurai',    'Meena');

-- ─── Migration from v1 (weddings → events) ───────────────────────────────────
-- Run ONLY if upgrading from the old schema that had a "weddings" table.

-- BEGIN;
--
-- CREATE TABLE IF NOT EXISTS events (
--     id            SERIAL PRIMARY KEY,
--     event_type    VARCHAR(30)  NOT NULL DEFAULT 'wedding',
--     primary_name  VARCHAR(100) NOT NULL,
--     secondary_name VARCHAR(100),
--     family_name   VARCHAR(100),
--     event_date    DATE         NOT NULL,
--     venue         VARCHAR(300),
--     city          VARCHAR(100),
--     notes         TEXT,
--     created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
--
-- INSERT INTO events (id, event_type, primary_name, secondary_name, family_name, event_date, venue, city, notes, created_at, updated_at)
-- SELECT id, 'wedding', groom_name, bride_name, family_name, wedding_date, venue, city, notes, created_at, updated_at
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
