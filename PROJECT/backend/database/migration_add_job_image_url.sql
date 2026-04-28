-- Add image_url column to job_roles for custom/curated images
ALTER TABLE public.job_roles ADD COLUMN IF NOT EXISTS image_url text;

-- ── Software Engineering ──────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80' WHERE slug = 'software-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' WHERE slug = 'senior-software-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80' WHERE slug = 'junior-software-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=800&q=80' WHERE slug = 'software-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1593720219276-0b1eacd0aef4?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('full-stack-developer', 'fullstack-developer', 'full-stack-engineer');

-- ── Frontend ──────────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('frontend-developer', 'web-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?auto=format&fit=crop&w=800&q=80' WHERE slug = 'frontend-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?auto=format&fit=crop&w=800&q=80' WHERE slug = 'react-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?auto=format&fit=crop&w=800&q=80' WHERE slug = 'vue-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1617040619263-41c5a9ca7521?auto=format&fit=crop&w=800&q=80' WHERE slug = 'angular-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80' WHERE slug = 'ui-developer';

-- ── Backend ───────────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80' WHERE slug = 'backend-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80' WHERE slug = 'backend-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=800&q=80' WHERE slug = 'api-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=800&q=80' WHERE slug = 'node-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' WHERE slug = 'python-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=800&q=80' WHERE slug = 'java-developer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80' WHERE slug = 'golang-developer';

-- ── Mobile ────────────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('mobile-developer', 'react-native-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('ios-developer', 'flutter-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&w=800&q=80' WHERE slug = 'android-developer';

-- ── Data ──────────────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' WHERE slug = 'data-scientist';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('data-analyst', 'analytics-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80' WHERE slug = 'data-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1489389944381-3471b5b30f04?auto=format&fit=crop&w=800&q=80' WHERE slug = 'data-architect';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80' WHERE slug = 'business-analyst';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('bi-developer', 'quantitative-analyst', 'financial-analyst');

-- ── AI / Machine Learning ─────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('machine-learning-engineer', 'deep-learning-engineer', 'ai-researcher');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('ai-engineer', 'nlp-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80' WHERE slug = 'computer-vision-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('ml-ops-engineer', 'mlops-engineer');

-- ── Cloud / DevOps ────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('cloud-architect', 'aws-engineer', 'gcp-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1506399558188-acca6f8cbf41?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('cloud-engineer', 'azure-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('devops-engineer', 'kubernetes-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('site-reliability-engineer', 'sre');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80' WHERE slug = 'platform-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80' WHERE slug = 'infrastructure-engineer';

-- ── Cybersecurity ─────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('cybersecurity-analyst', 'security-architect');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('security-engineer', 'soc-analyst', 'incident-response-analyst', 'ethical-hacker', 'fintech-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80' WHERE slug = 'penetration-tester';

-- ── Design / UX ───────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('ux-designer', 'product-designer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=800&q=80' WHERE slug = 'ui-designer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('graphic-designer', 'motion-designer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80' WHERE slug = 'ux-researcher';

-- ── Product / Management ──────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('product-manager', 'technical-product-manager', 'program-manager');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('project-manager', 'scrum-master', 'agile-coach');

-- ── Database / Networking ─────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('database-administrator', 'sql-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80' WHERE slug = 'database-engineer';
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1601132359864-c974e79890ac?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('network-engineer', 'network-architect');

-- ── Embedded / Hardware ───────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('embedded-engineer', 'firmware-engineer', 'iot-engineer', 'hardware-engineer');

-- ── Blockchain ────────────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('blockchain-developer', 'crypto-engineer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('smart-contract-developer', 'web3-developer');

-- ── Game Development ──────────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1556438064-2d7646166914?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('game-developer', 'game-engineer', 'unreal-developer');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?auto=format&fit=crop&w=800&q=80' WHERE slug = 'unity-developer';

-- ── Healthcare / Biotech ──────────────────────────────────────────────────────
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80' WHERE slug IN ('health-informatics-specialist', 'clinical-data-analyst');
UPDATE public.job_roles SET image_url = 'https://images.unsplash.com/photo-1530026186672-2cd00ffc50fe?auto=format&fit=crop&w=800&q=80' WHERE slug = 'bioinformatics-engineer';
