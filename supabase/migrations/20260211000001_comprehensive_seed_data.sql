-- Comprehensive Seed Data for ISS Project
-- This adds realistic data with multiple users, skills, trends, and relationships

-- =====================================================
-- ADD MORE SKILLS (50+ total)
-- =====================================================
INSERT INTO skills (name, category) VALUES
    ('Java', 'Programming Language'),
    ('C#', 'Programming Language'),
    ('Go', 'Programming Language'),
    ('Rust', 'Programming Language'),
    ('PHP', 'Programming Language'),
    ('Ruby', 'Programming Language'),
    ('Swift', 'Programming Language'),
    ('Kotlin', 'Programming Language'),
    ('Next.js', 'Frontend Framework'),
    ('Svelte', 'Frontend Framework'),
    ('Django', 'Backend Framework'),
    ('Flask', 'Backend Framework'),
    ('Spring Boot', 'Backend Framework'),
    ('FastAPI', 'Backend Framework'),
    ('MySQL', 'Database'),
    ('Microsoft SQL Server', 'Database'),
    ('Oracle', 'Database'),
    ('Cassandra', 'Database'),
    ('DynamoDB', 'Database'),
    ('Azure', 'Cloud Platform'),
    ('Google Cloud', 'Cloud Platform'),
    ('Jenkins', 'DevOps'),
    ('GitLab CI', 'DevOps'),
    ('GitHub Actions', 'CI/CD'),
    ('Ansible', 'Infrastructure as Code'),
    ('Prometheus', 'Monitoring'),
    ('Grafana', 'Monitoring'),
    ('ELK Stack', 'Logging'),
    ('Deep Learning', 'AI/ML'),
    ('Natural Language Processing', 'AI/ML'),
    ('Computer Vision', 'AI/ML'),
    ('TensorFlow', 'AI/ML'),
    ('PyTorch', 'AI/ML'),
    ('scikit-learn', 'AI/ML'),
    ('HTML/CSS', 'Web Development'),
    ('Tailwind CSS', 'CSS Framework'),
    ('Bootstrap', 'CSS Framework'),
    ('SASS/SCSS', 'CSS Preprocessor'),
    ('Webpack', 'Build Tool'),
    ('Vite', 'Build Tool'),
    ('Jest', 'Testing'),
    ('Cypress', 'Testing'),
    ('Selenium', 'Testing'),
    ('Agile/Scrum', 'Methodology'),
    ('Jira', 'Project Management'),
    ('Figma', 'Design'),
    ('Adobe XD', 'Design'),
    ('Socket.io', 'Real-time'),
    ('RabbitMQ', 'Message Queue'),
    ('Kafka', 'Message Queue')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ADD MORE TRENDS (20+ total)
-- =====================================================
INSERT INTO trends (domain, title, description, source) VALUES
    ('Software Development', 'Microservices Architecture', 'Breaking down monolithic applications into smaller, independent services', 'Martin Fowler'),
    ('AI/ML', 'MLOps', 'Applying DevOps principles to machine learning workflows', 'Google Cloud'),
    ('Web Development', 'Jamstack', 'Modern web development architecture based on JavaScript, APIs, and Markup', 'Netlify'),
    ('DevOps', 'Platform Engineering', 'Building internal developer platforms to improve productivity', 'Gartner'),
    ('Security', 'DevSecOps', 'Integrating security practices within the DevOps process', 'OWASP'),
    ('Cloud Computing', 'FinOps', 'Cloud financial management practices', 'FinOps Foundation'),
    ('Data Engineering', 'Data Mesh', 'Decentralized approach to data architecture', 'Thoughtworks'),
    ('Software Development', 'API-First Design', 'Designing APIs before building applications', 'Postman'),
    ('Web Development', 'Progressive Web Apps', 'Web apps that work like native mobile apps', 'Google'),
    ('AI/ML', 'Prompt Engineering', 'Crafting effective prompts for AI models', 'OpenAI'),
    ('Cloud Computing', 'Hybrid Cloud', 'Combining on-premises and cloud infrastructure', 'IBM'),
    ('DevOps', 'Infrastructure as Code', 'Managing infrastructure through code and automation', 'HashiCorp'),
    ('Security', 'Application Security Testing', 'Automated security testing in CI/CD pipelines', 'OWASP'),
    ('Software Development', 'Event-Driven Architecture', 'Building systems that react to events', 'AWS'),
    ('Data Science', 'AutoML', 'Automating machine learning model development', 'Google');

-- =====================================================
-- ADD MORE TEST USERS (10+ users)
-- =====================================================
-- All passwords: password123
INSERT INTO users (email, password_hash, full_name) VALUES
    ('sarah.smith@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Sarah Smith'),
    ('mike.johnson@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Mike Johnson'),
    ('emily.brown@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Emily Brown'),
    ('david.wilson@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'David Wilson'),
    ('lisa.garcia@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Lisa Garcia'),
    ('james.martinez@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'James Martinez'),
    ('anna.lee@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Anna Lee'),
    ('robert.taylor@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Robert Taylor'),
    ('maria.anderson@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Maria Anderson'),
    ('chris.thomas@example.com', '$2a$10$rN.vUqKqSZCZZXf0nTcIKuKkV.mQzYJLQPqDZh8VQV8xZLwYx8xKO', 'Chris Thomas')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ADD PROFILES FOR NEW USERS
-- =====================================================
INSERT INTO profiles (user_id, domain, title, experience_level, bio, last_analysis_at)
SELECT id, 'Software Development', 'Frontend Developer', 'junior', 'Specializing in React and modern web technologies', NOW() FROM users WHERE email = 'sarah.smith@example.com'
UNION ALL
SELECT id, 'DevOps', 'DevOps Engineer', 'senior', 'Expert in Kubernetes, Docker, and CI/CD pipelines', NOW() FROM users WHERE email = 'mike.johnson@example.com'
UNION ALL
SELECT id, 'Data Science', 'Data Scientist', 'mid', 'Passionate about machine learning and data visualization', NOW() FROM users WHERE email = 'emily.brown@example.com'
UNION ALL
SELECT id, 'Software Development', 'Backend Developer', 'mid', 'Building scalable APIs with Node.js and Python', NOW() FROM users WHERE email = 'david.wilson@example.com'
UNION ALL
SELECT id, 'Cloud Computing', 'Cloud Architect', 'senior', 'Designing cloud-native solutions on AWS and Azure', NOW() FROM users WHERE email = 'lisa.garcia@example.com'
UNION ALL
SELECT id, 'AI/ML', 'ML Engineer', 'mid', 'Deploying machine learning models in production', NOW() FROM users WHERE email = 'james.martinez@example.com'
UNION ALL
SELECT id, 'Software Development', 'Full Stack Developer', 'student', 'Learning web development and building personal projects', NOW() FROM users WHERE email = 'anna.lee@example.com'
UNION ALL
SELECT id, 'Security', 'Security Engineer', 'senior', 'Implementing security best practices and compliance', NOW() FROM users WHERE email = 'robert.taylor@example.com'
UNION ALL
SELECT id, 'Software Development', 'Mobile Developer', 'junior', 'Developing iOS and Android applications', NOW() FROM users WHERE email = 'maria.anderson@example.com'
UNION ALL
SELECT id, 'Software Development', 'Tech Lead', 'senior', 'Leading development teams and architecting solutions', NOW() FROM users WHERE email = 'chris.thomas@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- ADD USER SKILLS (Populate junction table)
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    random_skills INTEGER;
    skill_counter INTEGER;
BEGIN
    -- For each user, assign 5-15 random skills
    FOR user_record IN SELECT id FROM users LOOP
        random_skills := 5 + floor(random() * 10)::INTEGER;
        skill_counter := 0;
        
        FOR skill_record IN 
            SELECT id FROM skills ORDER BY random() LIMIT random_skills
        LOOP
            INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_of_experience)
            VALUES (
                user_record.id,
                skill_record.id,
                (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])[1 + floor(random() * 4)::INTEGER],
                (random() * 10)::DECIMAL(3,1)
            )
            ON CONFLICT (user_id, skill_id) DO NOTHING;
            
            skill_counter := skill_counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- ADD TREND-SKILL RELATIONSHIPS
-- =====================================================
DO $$
DECLARE
    trend_record RECORD;
    skill_record RECORD;
    random_skills INTEGER;
BEGIN
    -- For each trend, link 2-5 relevant skills
    FOR trend_record IN SELECT id FROM trends LOOP
        random_skills := 2 + floor(random() * 3)::INTEGER;
        
        FOR skill_record IN 
            SELECT id FROM skills ORDER BY random() LIMIT random_skills
        LOOP
            INSERT INTO trend_skills (trend_id, skill_id, relevance_score)
            VALUES (
                trend_record.id,
                skill_record.id,
                5 + floor(random() * 5)::INTEGER
            )
            ON CONFLICT (trend_id, skill_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- ADD MORE SKILL GAPS
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    random_gaps INTEGER;
BEGIN
    -- For each user, add 2-5 skill gaps
    FOR user_record IN SELECT id FROM users LOOP
        random_gaps := 2 + floor(random() * 3)::INTEGER;
        
        FOR skill_record IN 
            SELECT id, name FROM skills 
            WHERE id NOT IN (
                SELECT skill_id FROM user_skills WHERE user_id = user_record.id
            )
            ORDER BY random() 
            LIMIT random_gaps
        LOOP
            INSERT INTO skill_gaps (user_id, skill_id, skill_name, gap_level, reason)
            VALUES (
                user_record.id,
                skill_record.id,
                skill_record.name,
                1 + floor(random() * 5)::INTEGER,
                'Identified as important for career growth'
            );
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- ADD MORE RECOMMENDATIONS
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    trend_record RECORD;
    random_recs INTEGER;
BEGIN
    -- For each user, add 3-8 recommendations
    FOR user_record IN SELECT id FROM users LOOP
        random_recs := 3 + floor(random() * 5)::INTEGER;
        
        -- Add skill recommendations
        FOR skill_record IN 
            SELECT id, name FROM skills ORDER BY random() LIMIT (random_recs / 2)::INTEGER
        LOOP
            INSERT INTO recommendations (user_id, type, title, content, skill_id, skill_name)
            VALUES (
                user_record.id,
                'skill',
                'Master ' || skill_record.name,
                'Learn ' || skill_record.name || ' to enhance your technical skillset',
                skill_record.id,
                skill_record.name
            );
        END LOOP;
        
        -- Add trend recommendations
        FOR trend_record IN 
            SELECT id, title FROM trends ORDER BY random() LIMIT (random_recs / 2)::INTEGER
        LOOP
            INSERT INTO recommendations (user_id, type, title, content, trend_id, trend_title)
            VALUES (
                user_record.id,
                'trend',
                'Explore: ' || trend_record.title,
                'This emerging trend could impact your career trajectory',
                trend_record.id,
                trend_record.title
            );
        END LOOP;
    END LOOP;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Display counts
DO $$
DECLARE
    user_count INTEGER;
    skill_count INTEGER;
    trend_count INTEGER;
    user_skill_count INTEGER;
    skill_gap_count INTEGER;
    rec_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO skill_count FROM skills;
    SELECT COUNT(*) INTO trend_count FROM trends;
    SELECT COUNT(*) INTO user_skill_count FROM user_skills;
    SELECT COUNT(*) INTO skill_gap_count FROM skill_gaps;
    SELECT COUNT(*) INTO rec_count FROM recommendations;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed Data Summary:';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Skills: %', skill_count;
    RAISE NOTICE 'Trends: %', trend_count;
    RAISE NOTICE 'User-Skills: %', user_skill_count;
    RAISE NOTICE 'Skill Gaps: %', skill_gap_count;
    RAISE NOTICE 'Recommendations: %', rec_count;
    RAISE NOTICE '========================================';
END $$;
