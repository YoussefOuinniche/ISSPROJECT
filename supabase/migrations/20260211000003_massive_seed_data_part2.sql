-- MASSIVE SEED DATA PART 2: Relationships and Generated Data
-- This creates profiles and generates extensive relationship data

-- =====================================================
-- CREATE PROFILES FOR ALL USERS
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    domains TEXT[] := ARRAY['Software Development', 'DevOps', 'Data Science', 'AI/ML', 'Cloud Computing', 'Security', 'Web Development', 'Mobile Development', 'Game Development', 'Blockchain'];
    titles TEXT[] := ARRAY['Software Engineer', 'Senior Developer', 'Tech Lead', 'Staff Engineer', 'Principal Engineer', 'Engineering Manager', 'Solutions Architect', 'Lead Developer', 'Full Stack Developer', 'Backend Engineer', 'Frontend Engineer', 'DevOps Engineer', 'Data Scientist', 'ML Engineer', 'Security Engineer', 'Cloud Architect'];
    levels TEXT[] := ARRAY['student', 'junior', 'mid', 'senior'];
    bios TEXT[] := ARRAY[
        'Passionate about building scalable applications and mentoring junior developers',
        'Experienced in modern web technologies and cloud-native architecture',
        'Specializing in distributed systems and microservices architecture',
        'Focused on creating exceptional user experiences and performant applications',
        'Expert in DevOps practices and infrastructure automation',
        'Dedicated to writing clean, maintainable, and well-tested code',
        'Building innovative solutions using cutting-edge technologies',
        'Strong believer in agile methodologies and continuous improvement',
        'Enthusiastic about open source and contributing to the developer community',
        'Committed to continuous learning and staying updated with industry trends'
    ];
BEGIN
    FOR user_record IN SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM profiles) LOOP
        INSERT INTO profiles (user_id, domain, title, experience_level, bio, last_analysis_at)
        VALUES (
            user_record.id,
            domains[1 + floor(random() * array_length(domains, 1))::INTEGER],
            titles[1 + floor(random() * array_length(titles, 1))::INTEGER],
            levels[1 + floor(random() * array_length(levels, 1))::INTEGER],
            bios[1 + floor(random() * array_length(bios, 1))::INTEGER],
            NOW() - (random() * interval '30 days')
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- =====================================================
-- POPULATE USER_SKILLS (10-25 skills per user)
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    num_skills INTEGER;
    skill_count INTEGER;
    proficiency_levels TEXT[] := ARRAY['beginner', 'intermediate', 'advanced', 'expert'];
BEGIN
    RAISE NOTICE 'Populating user_skills...';
    
    FOR user_record IN SELECT id FROM users LOOP
        -- Each user gets 10-25 random skills
        num_skills := 10 + floor(random() * 15)::INTEGER;
        skill_count := 0;
        
        FOR skill_record IN 
            SELECT id FROM skills ORDER BY random() LIMIT num_skills
        LOOP
            INSERT INTO user_skills (user_id, skill_id, proficiency_level, years_of_experience)
            VALUES (
                user_record.id,
                skill_record.id,
                proficiency_levels[1 + floor(random() * 4)::INTEGER],
                (0.5 + random() * 12)::DECIMAL(3,1)  -- 0.5 to 12.5 years
            )
            ON CONFLICT (user_id, skill_id) DO NOTHING;
            
            skill_count := skill_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'user_skills populated!';
END $$;

-- =====================================================
-- POPULATE TREND_SKILLS (3-8 skills per trend)
-- =====================================================
DO $$
DECLARE
    trend_record RECORD;
    skill_record RECORD;
    num_skills INTEGER;
BEGIN
    RAISE NOTICE 'Populating trend_skills...';
    
    FOR trend_record IN SELECT id FROM trends LOOP
        -- Each trend gets 3-8 relevant skills
        num_skills := 3 + floor(random() * 5)::INTEGER;
        
        FOR skill_record IN 
            SELECT id FROM skills ORDER BY random() LIMIT num_skills
        LOOP
            INSERT INTO trend_skills (trend_id, skill_id, relevance_score)
            VALUES (
                trend_record.id,
                skill_record.id,
                5 + floor(random() * 5)::INTEGER  -- Score 5-10
            )
            ON CONFLICT (trend_id, skill_id) DO NOTHING;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'trend_skills populated!';
END $$;

-- =====================================================
-- POPULATE SKILL_GAPS (3-10 gaps per user)
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    num_gaps INTEGER;
    gap_reasons TEXT[] := ARRAY[
        'Critical for career advancement in current domain',
        'Increasingly demanded by employers in the industry',
        'Essential for upcoming project requirements',
        'Identified as missing competency in performance review',
        'Required for transition to senior role',
        'Competitive advantage in the job market',
        'Complements existing skill set effectively',
        'Emerging technology with growing adoption',
        'Key skill in modern development workflows',
        'Necessary for cross-functional collaboration'
    ];
BEGIN
    RAISE NOTICE 'Populating skill_gaps...';
    
    FOR user_record IN SELECT id FROM users LOOP
        -- Each user gets 3-10 skill gaps
        num_gaps := 3 + floor(random() * 7)::INTEGER;
        
        -- Select skills the user doesn't have
        FOR skill_record IN 
            SELECT s.id, s.name 
            FROM skills s
            WHERE s.id NOT IN (
                SELECT skill_id FROM user_skills WHERE user_id = user_record.id
            )
            ORDER BY random() 
            LIMIT num_gaps
        LOOP
            INSERT INTO skill_gaps (user_id, skill_id, skill_name, gap_level, reason)
            VALUES (
                user_record.id,
                skill_record.id,
                skill_record.name,
                1 + floor(random() * 5)::INTEGER,  -- Gap level 1-5
                gap_reasons[1 + floor(random() * array_length(gap_reasons, 1))::INTEGER]
            );
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'skill_gaps populated!';
END $$;

-- =====================================================
-- POPULATE RECOMMENDATIONS (5-15 per user)
-- =====================================================
DO $$
DECLARE
    user_record RECORD;
    skill_record RECORD;
    trend_record RECORD;
    num_recs INTEGER;
    rec_count INTEGER;
    rec_types TEXT[] := ARRAY['skill', 'trend', 'career', 'workflow'];
    skill_contents TEXT[] := ARRAY[
        'Consider taking an online course or certification to master this skill',
        'Practice by building personal projects that leverage this technology',
        'Join relevant community forums and contribute to open source projects',
        'Attend workshops or conferences focused on this skill area',
        'Pair program with experienced colleagues to accelerate learning',
        'Follow thought leaders and read technical blogs about this topic',
        'Complete hands-on tutorials and coding challenges',
        'Seek mentorship from experts in this technology'
    ];
    trend_contents TEXT[] := ARRAY[
        'Stay informed about this emerging trend through industry publications',
        'Explore how this trend impacts your current role and responsibilities',
        'Consider how adopting this trend could benefit your organization',
        'Experiment with tools and frameworks related to this trend',
        'Network with professionals already working in this space',
        'Evaluate potential benefits and challenges of adoption'
    ];
    career_contents TEXT[] := ARRAY[
        'Consider specialization in this area for career differentiation',
        'Seek cross-functional projects to broaden your experience',
        'Build a strong portfolio showcasing relevant projects',
        'Network with industry professionals and attend meetups',
        'Consider mentoring others to strengthen your expertise',
        'Pursue relevant certifications to validate your knowledge'
    ];
    workflow_contents TEXT[] := ARRAY[
        'Implement this practice to improve team productivity',
        'Automate repetitive tasks to focus on high-value work',
        'Adopt this methodology for better project outcomes',
        'Integrate this tool into your development workflow',
        'Establish this practice as a team standard',
        'Optimize this aspect of your development process'
    ];
BEGIN
    RAISE NOTICE 'Populating recommendations...';
    
    FOR user_record IN SELECT id FROM users LOOP
        num_recs := 5 + floor(random() * 10)::INTEGER;
        rec_count := 0;
        
        -- Generate skill recommendations (40%)
        FOR skill_record IN 
            SELECT s.id, s.name 
            FROM skills s
            WHERE s.id IN (SELECT skill_id FROM skill_gaps WHERE user_id = user_record.id)
            ORDER BY random() 
            LIMIT floor(num_recs * 0.4)::INTEGER
        LOOP
            INSERT INTO recommendations (user_id, type, title, content, skill_id, skill_name)
            VALUES (
                user_record.id,
                'skill',
                'Master ' || skill_record.name,
                skill_contents[1 + floor(random() * array_length(skill_contents, 1))::INTEGER],
                skill_record.id,
                skill_record.name
            );
            rec_count := rec_count + 1;
        END LOOP;
        
        -- Generate trend recommendations (30%)
        FOR trend_record IN 
            SELECT id, title 
            FROM trends 
            ORDER BY random() 
            LIMIT floor(num_recs * 0.3)::INTEGER
        LOOP
            INSERT INTO recommendations (user_id, type, title, content, trend_id, trend_title)
            VALUES (
                user_record.id,
                'trend',
                'Explore: ' || trend_record.title,
                trend_contents[1 + floor(random() * array_length(trend_contents, 1))::INTEGER],
                trend_record.id,
                trend_record.title
            );
            rec_count := rec_count + 1;
        END LOOP;
        
        -- Generate career recommendations (15%)
        FOR i IN 1..floor(num_recs * 0.15)::INTEGER LOOP
            INSERT INTO recommendations (user_id, type, title, content)
            VALUES (
                user_record.id,
                'career',
                'Career Growth: Focus Area ' || i,
                career_contents[1 + floor(random() * array_length(career_contents, 1))::INTEGER]
            );
            rec_count := rec_count + 1;
        END LOOP;
        
        -- Generate workflow recommendations (15%)
        FOR i IN 1..floor(num_recs * 0.15)::INTEGER LOOP
            INSERT INTO recommendations (user_id, type, title, content)
            VALUES (
                user_record.id,
                'workflow',
                'Workflow Optimization: Practice ' || i,
                workflow_contents[1 + floor(random() * array_length(workflow_contents, 1))::INTEGER]
            );
            rec_count := rec_count + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'recommendations populated!';
END $$;

-- =====================================================
-- CREATE ANALYTICS-FRIENDLY VIEWS
-- =====================================================

-- View: User skill proficiency summary
CREATE OR REPLACE VIEW user_skill_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    p.domain,
    p.experience_level,
    COUNT(us.id) as total_skills,
    COUNT(CASE WHEN us.proficiency_level = 'expert' THEN 1 END) as expert_skills,
    COUNT(CASE WHEN us.proficiency_level = 'advanced' THEN 1 END) as advanced_skills,
    COUNT(CASE WHEN us.proficiency_level = 'intermediate' THEN 1 END) as intermediate_skills,
    COUNT(CASE WHEN us.proficiency_level = 'beginner' THEN 1 END) as beginner_skills,
    ROUND(AVG(us.years_of_experience), 1) as avg_years_experience
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN user_skills us ON u.id = us.user_id
GROUP BY u.id, u.full_name, p.domain, p.experience_level;

-- View: Popular skills by category
CREATE OR REPLACE VIEW popular_skills AS
SELECT 
    s.category,
    s.name,
    COUNT(us.user_id) as user_count,
    ROUND(AVG(us.years_of_experience), 1) as avg_experience,
    COUNT(CASE WHEN us.proficiency_level = 'expert' THEN 1 END) as expert_count
FROM skills s
LEFT JOIN user_skills us ON s.id = us.skill_id
GROUP BY s.category, s.name
ORDER BY user_count DESC;

-- View: Skill gaps analysis
CREATE OR REPLACE VIEW skill_gap_analysis AS
SELECT 
    s.name as skill_name,
    s.category,
    COUNT(sg.user_id) as users_with_gap,
    ROUND(AVG(sg.gap_level), 1) as avg_gap_level,
    COUNT(CASE WHEN sg.gap_level >= 4 THEN 1 END) as critical_gaps
FROM skills s
LEFT JOIN skill_gaps sg ON s.id = sg.skill_id
GROUP BY s.name, s.category
ORDER BY users_with_gap DESC;

-- View: Trending technologies
CREATE OR REPLACE VIEW trending_technologies AS
SELECT 
    t.domain,
    t.title,
    COUNT(DISTINCT ts.skill_id) as related_skills,
    COUNT(DISTINCT r.user_id) as user_recommendations,
    ROUND(AVG(ts.relevance_score), 1) as avg_relevance
FROM trends t
LEFT JOIN trend_skills ts ON t.id = ts.trend_id
LEFT JOIN recommendations r ON t.id = r.trend_id
GROUP BY t.domain, t.title
ORDER BY user_recommendations DESC;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    skill_count INTEGER;
    trend_count INTEGER;
    user_skill_count INTEGER;
    trend_skill_count INTEGER;
    skill_gap_count INTEGER;
    rec_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO skill_count FROM skills;
    SELECT COUNT(*) INTO trend_count FROM trends;
    SELECT COUNT(*) INTO user_skill_count FROM user_skills;
    SELECT COUNT(*) INTO trend_skill_count FROM trend_skills;
    SELECT COUNT(*) INTO skill_gap_count FROM skill_gaps;
    SELECT COUNT(*) INTO rec_count FROM recommendations;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 MASSIVE SEED DATA LOADED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Profiles: %', profile_count;
    RAISE NOTICE 'Skills: %', skill_count;
    RAISE NOTICE 'Trends: %', trend_count;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'User-Skills Relationships: %', user_skill_count;
    RAISE NOTICE 'Trend-Skills Relationships: %', trend_skill_count;
    RAISE NOTICE 'Skill Gaps: %', skill_gap_count;
    RAISE NOTICE 'Recommendations: %', rec_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Database is now EXTREMELY RICH!';
    RAISE NOTICE '========================================';
END $$;
