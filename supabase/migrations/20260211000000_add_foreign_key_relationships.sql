-- Migration to add foreign key relationships between all tables
-- This creates proper referential integrity across the database

-- =====================================================
-- 1. ADD FOREIGN KEY TO SKILL_GAPS TABLE
-- =====================================================
-- Add skill_id column to reference skills table
ALTER TABLE skill_gaps
ADD COLUMN skill_id UUID REFERENCES skills(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX idx_skill_gaps_skill_id ON skill_gaps(skill_id);

-- =====================================================
-- 2. ADD FOREIGN KEYS TO RECOMMENDATIONS TABLE
-- =====================================================
-- Add skill_id and trend_id columns to reference skills and trends tables
ALTER TABLE recommendations
ADD COLUMN skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
ADD COLUMN trend_id UUID REFERENCES trends(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX idx_recommendations_skill_id ON recommendations(skill_id);
CREATE INDEX idx_recommendations_trend_id ON recommendations(trend_id);

-- =====================================================
-- 3. CREATE USER_SKILLS JUNCTION TABLE
-- =====================================================
-- Many-to-many relationship between users/profiles and skills
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')) DEFAULT 'beginner',
    years_of_experience DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. CREATE TREND_SKILLS JUNCTION TABLE
-- =====================================================
-- Many-to-many relationship between trends and skills
CREATE TABLE trend_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 10) DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(trend_id, skill_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_trend_skills_trend_id ON trend_skills(trend_id);
CREATE INDEX idx_trend_skills_skill_id ON trend_skills(skill_id);

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE user_skills IS 'Junction table: Links users to their acquired skills';
COMMENT ON TABLE trend_skills IS 'Junction table: Links industry trends to relevant skills';
COMMENT ON COLUMN skill_gaps.skill_id IS 'Foreign key reference to skills table';
COMMENT ON COLUMN recommendations.skill_id IS 'Foreign key reference to skills table for skill-based recommendations';
COMMENT ON COLUMN recommendations.trend_id IS 'Foreign key reference to trends table for trend-based recommendations';
