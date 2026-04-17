const ROLE_PRIMARY_QUERY_MAP = Object.freeze({
  'ai-engineer': 'AI Engineer',
  'analytics-engineer': 'Analytics Engineer',
  'android-developer': 'Android Developer',
  'application-security-engineer': 'Application Security Engineer',
  'ar-vr-developer': 'AR VR Developer',
  'backend-developer': 'Backend Developer',
  'blockchain-developer': 'Blockchain Developer',
  'business-intelligence-developer': 'Business Intelligence Developer',
  'cloud-architect': 'Cloud Architect',
  'cloud-engineer': 'Cloud Engineer',
  'computer-vision-engineer': 'Computer Vision Engineer',
  'crm-developer': 'CRM Developer',
  'cybersecurity-analyst': 'Cybersecurity Analyst',
  'data-analyst': 'Data Analyst',
  'data-engineer': 'Data Engineer',
  'data-scientist': 'Data Scientist',
  'database-administrator': 'Database Administrator',
  'database-engineer': 'Database Engineer',
  'devops-engineer': 'DevOps Engineer',
  'embedded-systems-engineer': 'Embedded Systems Engineer',
  'erp-consultant': 'ERP Consultant',
  'firmware-engineer': 'Firmware Engineer',
  'flutter-developer': 'Flutter Developer',
  'frontend-developer': 'Frontend Developer',
  'full-stack-developer': 'Full Stack Developer',
  'game-developer': 'Game Developer',
  'ios-developer': 'iOS Developer',
  'iot-engineer': 'IoT Engineer',
  'it-support-specialist': 'IT Support Specialist',
  'machine-learning-engineer': 'Machine Learning Engineer',
  'mleops-engineer': 'MLOps Engineer',
  'mobile-developer': 'Mobile Developer',
  'network-engineer': 'Network Engineer',
  'nlp-engineer': 'NLP Engineer',
  'penetration-tester': 'Penetration Tester',
  'platform-engineer': 'Platform Engineer',
  'product-manager-tech': 'Technical Product Manager',
  'prompt-engineer': 'Prompt Engineer',
  'qa-engineer': 'QA Engineer',
  'react-native-developer': 'React Native Developer',
  'robotics-engineer': 'Robotics Engineer',
  'scrum-master': 'Scrum Master',
  'security-engineer': 'Security Engineer',
  'security-operations-analyst': 'Security Operations Analyst',
  'site-reliability-engineer': 'Site Reliability Engineer',
  'software-architect': 'Software Architect',
  'software-engineer': 'Software Engineer',
  'solutions-architect': 'Solutions Architect',
  'systems-administrator': 'Systems Administrator',
  'systems-engineer': 'Systems Engineer',
  'test-automation-engineer': 'Test Automation Engineer',
  'web-developer': 'Web Developer',
});

const ROLE_QUERY_FALLBACK_ALIASES = Object.freeze({
  'ai-engineer': ['Artificial Intelligence Engineer', 'Machine Learning Engineer', 'LLM Engineer'],
  'analytics-engineer': ['Data Analytics Engineer', 'BI Engineer'],
  'backend-developer': ['Back End Developer', 'Software Backend Engineer'],
  'cloud-architect': ['Cloud Solutions Architect', 'Solutions Architect Cloud'],
  'cloud-engineer': ['Cloud Developer', 'Cloud Infrastructure Engineer'],
  'cybersecurity-analyst': ['Cyber Security Analyst', 'Information Security Analyst'],
  'data-analyst': ['Business Data Analyst', 'BI Analyst'],
  'data-engineer': ['Big Data Engineer', 'ETL Engineer'],
  'data-scientist': ['Machine Learning Scientist', 'Applied Data Scientist'],
  'database-administrator': ['DBA', 'Database Admin'],
  'devops-engineer': ['Dev Ops Engineer', 'Site Reliability Engineer'],
  'frontend-developer': ['Front End Developer', 'UI Developer'],
  'full-stack-developer': ['Full Stack Engineer', 'Fullstack Developer'],
  'ios-developer': ['iOS Engineer', 'Mobile iOS Developer'],
  'machine-learning-engineer': ['ML Engineer', 'AI ML Engineer'],
  'mobile-developer': ['Mobile App Developer', 'Mobile Software Engineer'],
  'network-engineer': ['Network Specialist', 'Infrastructure Network Engineer'],
  'nlp-engineer': ['Natural Language Processing Engineer', 'NLP Specialist'],
  'platform-engineer': ['Platform Developer', 'Internal Platform Engineer'],
  'prompt-engineer': ['AI Prompt Engineer', 'Generative AI Prompt Engineer'],
  'qa-engineer': ['Quality Assurance Engineer', 'Test Engineer'],
  'react-native-developer': ['React Native Engineer', 'Mobile React Native Developer'],
  'security-engineer': ['Information Security Engineer', 'Cyber Security Engineer'],
  'site-reliability-engineer': ['SRE', 'Reliability Engineer'],
  'software-architect': ['Solution Architect', 'Enterprise Architect'],
  'software-engineer': ['Software Developer', 'Application Developer'],
  'solutions-architect': ['Solutions Engineer', 'Cloud Solutions Architect'],
  'systems-administrator': ['System Administrator', 'IT Systems Administrator'],
  'systems-engineer': ['Systems Analyst', 'Infrastructure Engineer'],
  'web-developer': ['Web Engineer', 'Full Stack Web Developer'],
});

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeSlug(value) {
  return normalizeText(value).toLowerCase();
}

function uniqueQueryList(values) {
  const seen = new Set();
  const output = [];

  for (const value of Array.isArray(values) ? values : []) {
    const query = normalizeText(value);
    if (!query) {
      continue;
    }

    const dedupeKey = query.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    output.push(query);
  }

  return output;
}

function getRoleQueryConfig(roleSlug, roleName) {
  const slug = normalizeSlug(roleSlug);
  const explicitPrimary = normalizeText(ROLE_PRIMARY_QUERY_MAP[slug]);
  const fallbackAliases = ROLE_QUERY_FALLBACK_ALIASES[slug] || [];
  const fallbackPrimary = normalizeText(roleName);
  const primary = explicitPrimary || fallbackPrimary;

  return {
    primary,
    aliases: uniqueQueryList(fallbackAliases),
  };
}

module.exports = {
  ROLE_PRIMARY_QUERY_MAP,
  ROLE_QUERY_FALLBACK_ALIASES,
  getRoleQueryConfig,
};
