-- ============================================================
-- MIGRATION: Add role column + fix password hashes
-- Run this in: Supabase Dashboard → SQL Editor
-- URL: https://supabase.com/dashboard/project/fjvdgpyiwtppanuoczwz/sql
-- ============================================================

-- Step 1: Add role column (safe — only adds if missing)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Step 2: Fix all regular user hashes → SkillPulse@2026!
UPDATE users
SET
    password_hash = '$2b$10$CfnFCxSeWrKkONM1Vl1E.uoYuHUxOl98M7iMZXk7aBrnP.piTku.O',
    role = 'user'
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000006',
    '20000000-0000-0000-0000-000000000007',
    '20000000-0000-0000-0000-000000000008',
    '20000000-0000-0000-0000-000000000009'
);

-- Step 3: Fix admin hash → Adm!n@SP#2026, set role = admin
UPDATE users
SET
    password_hash = '$2b$12$52c4.KbFuz0cV2KfzrBuyuQctVBGPKpEyA/cSIoIjsCDuQ.j.QUq2',
    role = 'admin'
WHERE id = '20000000-0000-0000-0000-000000000010';

-- Step 4: Verify results
SELECT id, email, role,
       LEFT(password_hash, 20) AS hash_prefix
FROM users
WHERE id IN (
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000010'
)
ORDER BY id;
