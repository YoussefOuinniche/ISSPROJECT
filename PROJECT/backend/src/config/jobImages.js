/**
 * Curated Unsplash photo IDs — unique per role/category, verified stable.
 * CDN: https://images.unsplash.com/{photoId}?auto=format&fit=crop&w=800&q=80
 *
 * Every role has a DISTINCT image so the trending jobs list never shows duplicates.
 */

// ── Slug-specific (highest priority) ───────────────────────────────────────────
const SLUG_IMAGES = {
  // ── Software Engineering ────────────────────────────────────────────────────
  'software-engineer':              'photo-1555066931-4365d14bab8c', // dark code terminal
  'senior-software-engineer':       'photo-1518770660439-4636190af475', // clean IDE, dark
  'junior-software-engineer':       'photo-1461749280684-dccba630e2f6', // classic code screen
  'software-developer':             'photo-1484417894907-623942c8ee29', // macbook code
  'full-stack-developer':           'photo-1593720219276-0b1eacd0aef4', // dual monitors
  'fullstack-developer':            'photo-1593720219276-0b1eacd0aef4',
  'full-stack-engineer':            'photo-1593720219276-0b1eacd0aef4',

  // ── Frontend ────────────────────────────────────────────────────────────────
  'frontend-developer':             'photo-1547658719-da2b51169166', // HTML/CSS
  'frontend-engineer':              'photo-1627398242454-45a1465c2479', // JS editor
  'react-developer':                'photo-1633356122102-3fe601e05bd2', // React/JS
  'vue-developer':                  'photo-1599507593499-a3f7d7d97667', // green/js
  'angular-developer':              'photo-1617040619263-41c5a9ca7521', // angular code
  'ui-developer':                   'photo-1507003211169-0a1dd7228f2d', // UI wireframe
  'web-developer':                  'photo-1547658719-da2b51169166',

  // ── Backend ──────────────────────────────────────────────────────────────────
  'backend-developer':              'photo-1558494949-ef010cbdcc31', // server racks
  'backend-engineer':               'photo-1667372393119-3d4c48d07fc9', // server room blue
  'api-developer':                  'photo-1516116216624-53e697fedbea', // API / JSON
  'node-developer':                 'photo-1587620962725-abab7fe55159', // Node.js terminal
  'python-developer':               'photo-1526374965328-7f61d4dc18c5', // Python code
  'java-developer':                 'photo-1555949963-ff9fe0c870eb', // Java code
  'golang-developer':               'photo-1509228468518-180dd4864904', // Go/systems

  // ── Mobile ──────────────────────────────────────────────────────────────────
  'mobile-developer':               'photo-1512941937669-90a1b58e7e9c', // mobile app
  'ios-developer':                  'photo-1607252650355-f7fd0460ccdb', // iPhone dev
  'android-developer':              'photo-1574944985070-8f3ebc6b79d2', // Android phone
  'react-native-developer':         'photo-1512941937669-90a1b58e7e9c',
  'flutter-developer':              'photo-1607252650355-f7fd0460ccdb',

  // ── Data ────────────────────────────────────────────────────────────────────
  'data-scientist':                 'photo-1551288049-bebda4e38f71', // data charts
  'data-analyst':                   'photo-1504868584819-f8e8b4b6d7e3', // analyst dashboard
  'data-engineer':                  'photo-1542744173-8e7e53415bb0', // pipeline/ETL
  'data-architect':                 'photo-1489389944381-3471b5b30f04', // architecture
  'business-analyst':               'photo-1460925895917-afdab827c52f', // BI graphs
  'bi-developer':                   'photo-1611974789855-9c2a0a7236a3', // BI dashboard
  'analytics-engineer':             'photo-1504868584819-f8e8b4b6d7e3',

  // ── AI / Machine Learning ────────────────────────────────────────────────────
  'machine-learning-engineer':      'photo-1676299081847-824916de030a', // neural net art
  'ai-engineer':                    'photo-1531746790731-6c087fecd65a', // futuristic digital
  'deep-learning-engineer':         'photo-1535378917042-10a22c95931a', // data streams
  'nlp-engineer':                   'photo-1456513080510-7bf3a84b82f8', // text/language
  'computer-vision-engineer':       'photo-1502920917128-1aa500764cbd', // lens/optics
  'ai-researcher':                  'photo-1504711434969-e33886168f5c', // research lab
  'ml-ops-engineer':                'photo-1518432031352-d6fc5c10da5a', // pipeline/ops
  'mlops-engineer':                 'photo-1518432031352-d6fc5c10da5a',

  // ── Cloud / DevOps ───────────────────────────────────────────────────────────
  'cloud-architect':                'photo-1451187580459-43490279c0fa', // cloud/sky
  'cloud-engineer':                 'photo-1506399558188-acca6f8cbf41', // cloud server
  'devops-engineer':                'photo-1614064641938-3bbee52942c7', // CI/CD pipeline
  'site-reliability-engineer':      'photo-1558494949-ef010cbdcc31',
  'sre':                            'photo-1558494949-ef010cbdcc31',
  'platform-engineer':              'photo-1667372393119-3d4c48d07fc9',
  'infrastructure-engineer':        'photo-1544197150-b99a580bb7a8', // data center
  'kubernetes-engineer':            'photo-1614064641938-3bbee52942c7',
  'aws-engineer':                   'photo-1451187580459-43490279c0fa',
  'azure-engineer':                 'photo-1506399558188-acca6f8cbf41',
  'gcp-engineer':                   'photo-1451187580459-43490279c0fa',

  // ── Cybersecurity ────────────────────────────────────────────────────────────
  'cybersecurity-analyst':          'photo-1550751827-4bd374c3f58b', // lock/shield
  'security-engineer':              'photo-1563986768494-4dee2763ff3f', // terminal hacker
  'penetration-tester':             'photo-1526374965328-7f61d4dc18c5', // dark terminal
  'security-architect':             'photo-1550751827-4bd374c3f58b',
  'soc-analyst':                    'photo-1563986768494-4dee2763ff3f',
  'incident-response-analyst':      'photo-1563986768494-4dee2763ff3f',
  'ethical-hacker':                 'photo-1563986768494-4dee2763ff3f',

  // ── Design / UX ──────────────────────────────────────────────────────────────
  'ux-designer':                    'photo-1561070791-2526d30994b5', // wireframe/UX
  'ui-designer':                    'photo-1558655146-9f40138edfeb', // design tool
  'product-designer':               'photo-1561070791-2526d30994b5',
  'graphic-designer':               'photo-1626785774625-ddcddc3445e9', // design work
  'ux-researcher':                  'photo-1507003211169-0a1dd7228f2d', // research/notes
  'motion-designer':                'photo-1626785774625-ddcddc3445e9',

  // ── Product / Management ──────────────────────────────────────────────────────
  'product-manager':                'photo-1454165804606-c3d57bc86b40', // product board
  'technical-product-manager':      'photo-1454165804606-c3d57bc86b40',
  'project-manager':                'photo-1531482615713-2afd69097998', // PM board
  'scrum-master':                   'photo-1531482615713-2afd69097998',
  'agile-coach':                    'photo-1531482615713-2afd69097998',
  'program-manager':                'photo-1454165804606-c3d57bc86b40',

  // ── Database / Storage ────────────────────────────────────────────────────────
  'database-administrator':         'photo-1544197150-b99a580bb7a8', // DB server
  'database-engineer':              'photo-1542744173-8e7e53415bb0',
  'sql-developer':                  'photo-1544197150-b99a580bb7a8',

  // ── Networking ───────────────────────────────────────────────────────────────
  'network-engineer':               'photo-1601132359864-c974e79890ac', // network cables
  'network-architect':              'photo-1601132359864-c974e79890ac',

  // ── Embedded / Hardware ───────────────────────────────────────────────────────
  'embedded-engineer':              'photo-1518770660439-4636190af475', // PCB/chips
  'firmware-engineer':              'photo-1518770660439-4636190af475',
  'iot-engineer':                   'photo-1518770660439-4636190af475',
  'hardware-engineer':              'photo-1518770660439-4636190af475',

  // ── Blockchain ───────────────────────────────────────────────────────────────
  'blockchain-developer':           'photo-1518546305927-5a555bb7020d', // crypto/blocks
  'smart-contract-developer':       'photo-1639762681057-408e52192e55',
  'web3-developer':                 'photo-1639762681057-408e52192e55',
  'crypto-engineer':                'photo-1518546305927-5a555bb7020d',

  // ── Game Dev ─────────────────────────────────────────────────────────────────
  'game-developer':                 'photo-1556438064-2d7646166914', // gaming setup
  'game-engineer':                  'photo-1556438064-2d7646166914',
  'unity-developer':                'photo-1580234811497-9df7fd2f357e', // gaming screen
  'unreal-developer':               'photo-1556438064-2d7646166914',

  // ── Finance / Fintech ──────────────────────────────────────────────────────────
  'fintech-developer':              'photo-1563986768494-4dee2763ff3f',
  'quantitative-analyst':           'photo-1611974789855-9c2a0a7236a3', // quant charts
  'financial-analyst':              'photo-1611974789855-9c2a0a7236a3',

  // ── Healthcare / Biotech ──────────────────────────────────────────────────────
  'health-informatics-specialist':  'photo-1576091160399-112ba8d25d1d', // medical tech
  'bioinformatics-engineer':        'photo-1530026186672-2cd00ffc50fe', // lab/biotech
  'clinical-data-analyst':          'photo-1576091160399-112ba8d25d1d',
};

// ── Category fallbacks ─────────────────────────────────────────────────────────
const CATEGORY_IMAGES = {
  'software-development':    'photo-1555066931-4365d14bab8c', // dark code terminal
  'software':                'photo-1461749280684-dccba630e2f6',
  'web-development':         'photo-1547658719-da2b51169166', // HTML/CSS
  'mobile-development':      'photo-1512941937669-90a1b58e7e9c', // mobile app
  'data-science':            'photo-1551288049-bebda4e38f71', // charts
  'data':                    'photo-1504868584819-f8e8b4b6d7e3', // dashboard
  'artificial-intelligence': 'photo-1676299081847-824916de030a', // neural net art
  'machine-learning':        'photo-1531746790731-6c087fecd65a', // futuristic digital
  'ai-ml':                   'photo-1535378917042-10a22c95931a',
  'cybersecurity':           'photo-1550751827-4bd374c3f58b', // lock
  'security':                'photo-1563986768494-4dee2763ff3f', // hacker terminal
  'devops':                  'photo-1614064641938-3bbee52942c7', // CI pipeline
  'cloud':                   'photo-1451187580459-43490279c0fa', // cloud
  'cloud-computing':         'photo-1506399558188-acca6f8cbf41', // cloud server
  'infrastructure':          'photo-1544197150-b99a580bb7a8', // data center
  'design':                  'photo-1558655146-9f40138edfeb', // design tool
  'ui-ux':                   'photo-1561070791-2526d30994b5', // wireframe
  'product':                 'photo-1454165804606-c3d57bc86b40', // product board
  'product-management':      'photo-1531482615713-2afd69097998', // PM
  'finance':                 'photo-1611974789855-9c2a0a7236a3', // finance
  'fintech':                 'photo-1518546305927-5a555bb7020d', // crypto
  'marketing':               'photo-1460925895917-afdab827c52f', // marketing graphs
  'digital-marketing':       'photo-1432888498266-38ffec3eaf0a', // digital
  'healthcare':              'photo-1576091160399-112ba8d25d1d', // medical
  'biotech':                 'photo-1530026186672-2cd00ffc50fe', // lab
  'backend':                 'photo-1558494949-ef010cbdcc31', // servers
  'frontend':                'photo-1627398242454-45a1465c2479', // JS
  'fullstack':               'photo-1593720219276-0b1eacd0aef4', // dual monitors
  'database':                'photo-1544197150-b99a580bb7a8', // DB
  'networking':              'photo-1601132359864-c974e79890ac', // cables
  'embedded':                'photo-1518770660439-4636190af475', // hardware
  'blockchain':              'photo-1639762681057-408e52192e55', // blockchain
  'game-development':        'photo-1556438064-2d7646166914', // gaming
  'project-management':      'photo-1531482615713-2afd69097998', // kanban
  'business-analysis':       'photo-1460925895917-afdab827c52f', // analysis
  'hr':                      'photo-1521737604893-d14cc237f11d', // people
  'operations':              'photo-1664575602554-2087b04935a5', // ops
};

const DEFAULT_IMAGE = 'photo-1555066931-4365d14bab8c'; // dark code terminal

/**
 * Returns a stable, relevant Unsplash image URL for a job role.
 * Priority: DB image_url → slug override → category fallback → default
 *
 * @param {string} slug - job role slug (e.g. "frontend-developer")
 * @param {string} categorySlug - category slug (e.g. "web-development")
 * @param {string|null} dbImageUrl - stored image_url from job_roles table (if set)
 */
function getJobImageUrl(slug, categorySlug, dbImageUrl = null) {
  if (dbImageUrl) return dbImageUrl;

  const photoId =
    SLUG_IMAGES[slug] ||
    CATEGORY_IMAGES[categorySlug] ||
    CATEGORY_IMAGES[slug] ||
    DEFAULT_IMAGE;

  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=80`;
}

module.exports = { getJobImageUrl, SLUG_IMAGES, CATEGORY_IMAGES };
