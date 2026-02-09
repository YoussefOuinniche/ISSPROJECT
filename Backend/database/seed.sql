-- Seed data for SecureHire AI
-- Run this after schema.sql

-- =====================================================
-- SEED SKILLS
-- =====================================================
INSERT INTO skills (name, category) VALUES
    ('JavaScript', 'Programming Language'),
    ('Python', 'Programming Language'),
    ('React', 'Frontend Framework'),
    ('Node.js', 'Backend Framework'),
    ('PostgreSQL', 'Database'),
    ('Docker', 'DevOps'),
    ('Kubernetes', 'DevOps'),
    ('Machine Learning', 'AI/ML'),
    ('TypeScript', 'Programming Language'),
    ('AWS', 'Cloud Platform'),
    ('Git', 'Version Control'),
    ('MongoDB', 'Database'),
    ('Vue.js', 'Frontend Framework'),
    ('Angular', 'Frontend Framework'),
    ('GraphQL', 'API'),
    ('Redis', 'Cache/Database'),
    ('Terraform', 'Infrastructure as Code'),
    ('CI/CD', 'DevOps'),
    ('REST API', 'API'),
    ('Microservices', 'Architecture');

-- =====================================================
-- SEED TRENDS
-- =====================================================
INSERT INTO trends (domain, title, description, source) VALUES
    ('Software Development', 'AI-Powered Development Tools', 'Integration of AI assistants like GitHub Copilot in development workflows', 'GitHub'),
    ('Cloud Computing', 'Serverless Architecture', 'Growing adoption of serverless computing for scalable applications', 'AWS'),
    ('Web Development', 'Edge Computing', 'Processing data closer to users for better performance', 'Vercel'),
    ('Data Science', 'Large Language Models', 'Increasing use of LLMs in various applications', 'OpenAI'),
    ('DevOps', 'GitOps', 'Managing infrastructure and deployments via Git', 'CNCF'),
    ('Software Development', 'Low-Code/No-Code Platforms', 'Rise of visual development platforms for faster application delivery', 'Gartner'),
    ('Security', 'Zero Trust Security', 'Never trust, always verify approach to cybersecurity', 'NIST'),
    ('Web Development', 'Web Assembly', 'Running high-performance code in browsers', 'W3C'),
    ('Cloud Computing', 'Multi-Cloud Strategy', 'Using multiple cloud providers to avoid vendor lock-in', 'Forrester'),
    ('AI/ML', 'Generative AI', 'AI systems that can generate new content, code, and designs', 'OpenAI');

-- =====================================================
-- SEED TEST USER
-- =====================================================
-- Password: password123 (hashed with bcrypt, cost 10)
-- Hash generated: $2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO

INSERT INTO users (email, password_hash, full_name) VALUES
    ('john.doe@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'John Doe');

-- Get the user_id (will be used for profile, skill_gaps, and recommendations)
-- In Supabase, you can use the returned ID from the insert

-- =====================================================
-- SEED TEST PROFILE
-- =====================================================
-- Note: Replace 'USER_ID_HERE' with actual user ID after inserting user
-- Or use a subquery to get the user_id

INSERT INTO profiles (user_id, domain, title, experience_level, bio, last_analysis_at)
SELECT 
    id,
    'Software Development',
    'Full Stack Developer',
    'mid',
    'Passionate developer with 3 years of experience in web development',
    NOW()
FROM users WHERE email = 'john.doe@example.com';

-- =====================================================
-- SEED SKILL GAPS
-- =====================================================
INSERT INTO skill_gaps (user_id, domain, skill_name, gap_level, reason)
SELECT 
    id,
    'Software Development',
    'Kubernetes',
    4,
    'Limited experience with container orchestration'
FROM users WHERE email = 'john.doe@example.com'
UNION ALL
SELECT 
    id,
    'Software Development',
    'Machine Learning',
    5,
    'No prior experience with ML frameworks'
FROM users WHERE email = 'john.doe@example.com'
UNION ALL
SELECT 
    id,
    'Cloud Computing',
    'AWS',
    3,
    'Basic knowledge, needs advanced services expertise'
FROM users WHERE email = 'john.doe@example.com';

-- =====================================================
-- SEED RECOMMENDATIONS
-- =====================================================
INSERT INTO recommendations (user_id, type, title, content, skill_name, trend_title)
SELECT 
    id,
    'skill',
    'Learn Kubernetes Fundamentals',
    'Start with the official Kubernetes documentation and complete the interactive tutorials at kubernetes.io',
    'Kubernetes',
    NULL
FROM users WHERE email = 'john.doe@example.com'
UNION ALL
SELECT 
    id,
    'trend',
    'Explore AI-Powered Development Tools',
    'Try GitHub Copilot or similar AI assistants to boost your productivity',
    NULL,
    'AI-Powered Development Tools'
FROM users WHERE email = 'john.doe@example.com'
UNION ALL
SELECT 
    id,
    'career',
    'Consider Cloud Certifications',
    'AWS or Azure certifications can significantly boost your career prospects in cloud development',
    NULL,
    NULL
FROM users WHERE email = 'john.doe@example.com'
UNION ALL
SELECT 
    id,
    'workflow',
    'Implement CI/CD Pipeline',
    'Set up automated testing and deployment using GitHub Actions or GitLab CI',
    NULL,
    NULL
FROM users WHERE email = 'john.doe@example.com';
