-- ========================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Mental Health Resource Hub - Project 3
-- ========================================
--
-- INSTRUCTIONS:
-- 1. Make sure you have PostgreSQL installed and running
-- 2. Create a database called 'project3' in pgAdmin or via command line:
--    CREATE DATABASE project3;
-- 3. Connect to the project3 database
-- 4. Copy this ENTIRE file and paste it into the Query Tool in pgAdmin
-- 5. Click Execute (▶) or press F5
-- 6. You should see "✓ DATABASE SETUP COMPLETE!" at the end
--
-- This script will:
-- - Drop any existing tables (so you can run it multiple times)
-- - Create all required tables with correct schema
-- - Populate categories and resources
-- - Create necessary indexes for performance
-- ========================================

-- Verify you're connected to the right database
SELECT 'Connected to database: ' || current_database() as status;

-- ========================================
-- STEP 1: DROP EXISTING TABLES
-- ========================================

DROP TABLE IF EXISTS public.user_resource CASCADE;
DROP TABLE IF EXISTS public.resources CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- ========================================
-- STEP 2: CREATE TABLES
-- ========================================

-- Create ROLES table
CREATE TABLE public.roles
(
    roleid SERIAL PRIMARY KEY,
    rolename VARCHAR(50) NOT NULL
);

-- Create USERS table with userid (NOT id)
CREATE TABLE public.users
(
    userid SERIAL PRIMARY KEY,
    username VARCHAR(40) NOT NULL UNIQUE,
    password VARCHAR(60) NOT NULL,
    email VARCHAR(100) NOT NULL,
    level VARCHAR(1) NOT NULL,
    phone VARCHAR(15),
    roleid INTEGER REFERENCES public.roles(roleid)
);

-- Create CATEGORIES table
CREATE TABLE public.categories
(
    categoryid SERIAL PRIMARY KEY,
    categoryname VARCHAR(100) NOT NULL,
    categorydescription TEXT
);

-- Create RESOURCES table
CREATE TABLE public.resources
(
    resourceid SERIAL PRIMARY KEY,
    resourcename VARCHAR(200) NOT NULL,
    resourceurl VARCHAR(500),
    resourcephone VARCHAR(50),
    resourcedesc TEXT,
    categoryid INTEGER REFERENCES public.categories(categoryid),
    submittedby_userid INTEGER REFERENCES public.users(userid),
    isvetted BOOLEAN DEFAULT false
);

-- Create USER_RESOURCE table (junction table for many-to-many relationship)
CREATE TABLE public.user_resource
(
    userid INTEGER REFERENCES public.users(userid) ON DELETE CASCADE,
    resourceid INTEGER REFERENCES public.resources(resourceid) ON DELETE CASCADE,
    numviewed INTEGER DEFAULT 0,
    favoritestatus BOOLEAN DEFAULT false,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    PRIMARY KEY (userid, resourceid)
);

-- ========================================
-- STEP 3: INSERT DEFAULT DATA
-- ========================================

-- Insert default roles
INSERT INTO public.roles (rolename) VALUES ('User'), ('Manager'), ('Admin');

-- Insert test users for login testing
-- Username: user, Password: userpass, Level: U (User)
-- Username: manager, Password: managerpass, Level: M (Manager)
-- Username: admin, Password: adminpass, Level: M (Manager - acts as admin)
INSERT INTO public.users (username, password, email, level, phone, roleid) VALUES
('user', '$2b$10$wevXGYmtsHNQc6bfEruDi.l7MxFPnWky8rbtoCJja79LkvyJoOJbe', 'user@test.com', 'U', '555-0001', 1),
('manager', '$2b$10$UdMpiGnCaff1HhJKghPFWe9b9CInK2nnselZizLn1mq2kfRtcVS7O', 'manager@test.com', 'M', '555-0002', 2),
('admin', '$2b$10$GxgG6Q7KBml8IlPA4pDzvucPMNJ89xfHVK6cCrM8MPE8i/xmaKeG.', 'admin@test.com', 'M', '555-0003', 3);

-- Auto-pin the 988 Suicide & Crisis Lifeline for all test users
-- (Resource ID 1 will be the 988 hotline after it's inserted below)

-- Insert Categories
INSERT INTO public.categories (categoryname, categorydescription) VALUES
('Crisis Hotlines', 'Immediate crisis support and suicide prevention hotlines available 24/7'),
('Therapy & Counseling', 'Professional therapy services, counseling, and mental health treatment options'),
('Support Groups', 'Peer support groups and communities for mental health support'),
('Education', 'Educational resources, research, and information about mental health'),
('Wellness Tools', 'Apps and tools for meditation, mindfulness, and mental wellness');

-- Insert ALL Resources (20 total)
INSERT INTO public.resources (resourcename, resourceurl, resourcephone, resourcedesc, categoryid, isvetted) VALUES
-- Crisis Hotlines (CategoryID = 1)
('988 Suicide & Crisis Lifeline', 'https://988lifeline.org', '988', 'Free, confidential support for people in distress. Prevention and crisis resources for you or your loved ones. Available 24/7 nationwide.', 1, true),
('Crisis Text Line', 'https://www.crisistextline.org', '741741', 'Free, 24/7 crisis support via text. Connect with a trained Crisis Counselor who will listen and help you move from a hot moment to a cool calm. Text HOME to 741741.', 1, true),
('Veterans Crisis Line', 'https://www.veteranscrisisline.net', '988', 'Confidential help for Veterans and their families. Connect with caring, qualified responders from the Department of Veterans Affairs. Call 988 then Press 1.', 1, true),
('The Trevor Project', 'https://www.thetrevorproject.org', '1-866-488-7386', 'Crisis intervention and suicide prevention for LGBTQ+ young people under 25. Text, chat, or call with trained counselors. Text START to 678-678.', 1, true),
-- Therapy & Counseling (CategoryID = 2)
('SAMHSA Treatment Locator', 'https://findtreatment.gov', NULL, 'Find mental health and substance use treatment facilities in your area. Confidential and free service from the Substance Abuse and Mental Health Services Administration.', 2, true),
('Psychology Today Therapist Finder', 'https://www.psychologytoday.com/us/therapists', NULL, 'Search for therapists, psychiatrists, and treatment centers. Filter by insurance, specialty, location, and more to find the right fit for you.', 2, true),
('BetterHelp', 'https://www.betterhelp.com', NULL, 'Online counseling and therapy services with licensed therapists. Accessible, affordable, and convenient professional counseling anytime, anywhere.', 2, true),
('Open Path Collective', 'https://openpathcollective.org', NULL, 'A nonprofit network providing affordable mental health care. Sessions between $30-$80 with licensed therapists offering in-office and online care.', 2, true),
-- Support Groups (CategoryID = 3)
('NAMI (National Alliance on Mental Illness)', 'https://www.nami.org', '1-800-950-6264', 'Advocacy, education, support and public awareness for individuals and families affected by mental illness. Find local support groups and resources.', 3, true),
('Mental Health America', 'https://www.mhanational.org', NULL, 'Leading community-based nonprofit dedicated to addressing mental health needs. Free mental health screenings and resources available.', 3, true),
('7 Cups', 'https://www.7cups.com', NULL, 'Free emotional support through trained active listeners. Connect 24/7 with people who care and receive judgment-free support.', 3, true),
('Support Groups Central', 'https://www.supportgroupscentral.com', NULL, 'Directory of support groups for mental health, addiction, grief, chronic illness, and more. Find support groups meeting in your local area.', 3, true),
-- Education (CategoryID = 4)
('National Institute of Mental Health (NIMH)', 'https://www.nimh.nih.gov', NULL, 'Leading federal agency for research on mental disorders. Comprehensive information on mental health topics, treatment options, and latest research.', 4, true),
('American Foundation for Suicide Prevention', 'https://afsp.org', NULL, 'Educational resources on warning signs, prevention strategies, and support for loss survivors. Research-based information and advocacy.', 4, true),
('Mental Health First Aid', 'https://www.mentalhealthfirstaid.org', NULL, 'Learn how to identify, understand and respond to signs of mental illnesses and substance use disorders. Evidence-based training courses available.', 4, true),
('Anxiety & Depression Association of America', 'https://adaa.org', NULL, 'Information about anxiety, depression, and related conditions including symptoms, treatment options, and finding help.', 4, true),
-- Wellness Tools (CategoryID = 5)
('Calm', 'https://www.calm.com', NULL, 'Meditation and sleep app designed to help reduce stress, sleep better, and live a happier, healthier life. Guided meditations and sleep stories.', 5, true),
('Headspace', 'https://www.headspace.com', NULL, 'Hundreds of guided meditations on stress, sleep, focus, and anxiety. Science-backed approach to mindfulness and meditation.', 5, true),
('Sanvello', 'https://www.sanvello.com', NULL, 'Mental health app for stress, anxiety, and depression based on cognitive behavioral therapy, mindfulness, and mood tracking.', 5, true),
('What''s Up?', 'https://www.whatsupapp.com', NULL, 'Free mental health app using Cognitive Behavioral Therapy and Acceptance Commitment Therapy methods to help cope with depression and anxiety.', 5, true);

-- Auto-pin 988 Suicide & Crisis Lifeline (resourceid = 1) for all test users
INSERT INTO public.user_resource (userid, resourceid, favoritestatus) VALUES
(1, 1, true),  -- user account
(2, 1, true),  -- manager account
(3, 1, true);  -- admin account

-- ========================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_resources_category ON public.resources(categoryid);
CREATE INDEX idx_resources_submitter ON public.resources(submittedby_userid);
CREATE INDEX idx_user_resource_userid ON public.user_resource(userid);
CREATE INDEX idx_user_resource_resourceid ON public.user_resource(resourceid);
CREATE INDEX idx_user_resource_favorite ON public.user_resource(userid, favoritestatus);

-- ========================================
-- STEP 5: SET PERMISSIONS
-- ========================================

ALTER TABLE public.users OWNER to postgres;
ALTER TABLE public.roles OWNER to postgres;
ALTER TABLE public.categories OWNER to postgres;
ALTER TABLE public.resources OWNER to postgres;
ALTER TABLE public.user_resource OWNER to postgres;

-- ========================================
-- VERIFICATION & SUCCESS MESSAGE
-- ========================================

SELECT '✓ DATABASE SETUP COMPLETE!' as status;
SELECT 'Connected to: ' || current_database() as database_name;
SELECT '----------------------------------------' as separator;
SELECT 'Tables Created:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_catalog = current_database()
ORDER BY table_name;
SELECT '----------------------------------------' as separator;
SELECT 'Data Summary:' as info;
SELECT 'Roles: ' || COUNT(*)::text as count FROM public.roles
UNION ALL
SELECT 'Categories: ' || COUNT(*)::text FROM public.categories
UNION ALL
SELECT 'Resources: ' || COUNT(*)::text FROM public.resources
UNION ALL
SELECT 'Users: ' || COUNT(*)::text FROM public.users;
SELECT '----------------------------------------' as separator;
SELECT 'Test Accounts Created:' as info;
SELECT '1. Username: user     | Password: userpass     | Level: User' as account
UNION ALL
SELECT '2. Username: manager  | Password: managerpass  | Level: Manager' as account
UNION ALL
SELECT '3. Username: admin    | Password: adminpass    | Level: Admin' as account;
SELECT '----------------------------------------' as separator;
SELECT 'Next Steps:' as info;
SELECT '1. Update your .env file with database credentials' as step
UNION ALL
SELECT '2. Run: npm install' as step
UNION ALL
SELECT '3. Run: npm start' as step
UNION ALL
SELECT '4. Go to: http://localhost:3000/login' as step
UNION ALL
SELECT '5. Login with any test account above!' as step;
