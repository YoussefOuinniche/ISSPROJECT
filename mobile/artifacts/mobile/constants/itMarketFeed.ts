export const IT_MARKET_COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "India",
  "Singapore",
  "Australia",
  "Brazil",
  "United Arab Emirates",
] as const;

export type ITMarketCountry = (typeof IT_MARKET_COUNTRIES)[number];

export type ITMarketRole = {
  id: string;
  role: string;
  definition: string;
  requiredSkills: string[];
  marketNote: string;
  baseSalaryUsd: {
    min: number;
    max: number;
  };
};

const COUNTRY_MULTIPLIERS: Record<ITMarketCountry, number> = {
  "United States": 1,
  Canada: 0.8,
  "United Kingdom": 0.76,
  Germany: 0.73,
  Netherlands: 0.75,
  India: 0.27,
  Singapore: 0.84,
  Australia: 0.86,
  Brazil: 0.35,
  "United Arab Emirates": 0.7,
};

const formatUsdRange = (min: number, max: number) => {
  const minRounded = Math.round(min / 1000);
  const maxRounded = Math.round(max / 1000);
  return `$${minRounded}k - $${maxRounded}k`;
};

export const IT_MARKET_ROLES: ITMarketRole[] = [
  {
    id: "frontend-engineer",
    role: "Frontend Engineer",
    definition: "Builds performant web interfaces and translates product requirements into reliable UI systems.",
    requiredSkills: ["React", "TypeScript", "HTML", "CSS", "State Management", "Testing", "Accessibility", "Performance"],
    marketNote: "Strong demand in SaaS, fintech, and e-commerce teams.",
    baseSalaryUsd: { min: 85000, max: 155000 },
  },
  {
    id: "backend-engineer",
    role: "Backend Engineer",
    definition: "Designs APIs, services, and data workflows that power client and platform applications.",
    requiredSkills: ["Node.js", "Python", "REST APIs", "SQL", "System Design", "Caching", "Queues", "Monitoring"],
    marketNote: "Hiring remains stable due to platform modernization projects.",
    baseSalaryUsd: { min: 95000, max: 170000 },
  },
  {
    id: "full-stack-engineer",
    role: "Full Stack Engineer",
    definition: "Owns feature development across frontend, backend, and integration layers.",
    requiredSkills: ["React", "Node.js", "TypeScript", "Databases", "API Design", "Cloud Basics", "CI/CD", "Testing"],
    marketNote: "Popular role for lean product teams and startups.",
    baseSalaryUsd: { min: 90000, max: 165000 },
  },
  {
    id: "mobile-engineer",
    role: "Mobile Engineer",
    definition: "Builds iOS and Android experiences with focus on performance, UX, and reliability.",
    requiredSkills: ["React Native", "Swift/Kotlin", "Mobile Architecture", "Offline Data", "API Integration", "Testing", "App Store Release", "Performance"],
    marketNote: "Demand rises with digital banking and delivery applications.",
    baseSalaryUsd: { min: 90000, max: 160000 },
  },
  {
    id: "devops-engineer",
    role: "DevOps Engineer",
    definition: "Automates delivery pipelines and ensures scalable, repeatable infrastructure operations.",
    requiredSkills: ["Linux", "CI/CD", "Docker", "Kubernetes", "Terraform", "Cloud Services", "Observability", "Scripting"],
    marketNote: "Critical hiring area due to cloud migration waves.",
    baseSalaryUsd: { min: 105000, max: 180000 },
  },
  {
    id: "cloud-engineer",
    role: "Cloud Engineer",
    definition: "Designs and operates cloud-native systems with reliability and cost control in mind.",
    requiredSkills: ["AWS/Azure/GCP", "Networking", "Infrastructure as Code", "Security", "Containers", "Cost Optimization", "Identity", "Monitoring"],
    marketNote: "Strong opportunities in enterprise transformation programs.",
    baseSalaryUsd: { min: 110000, max: 185000 },
  },
  {
    id: "platform-engineer",
    role: "Platform Engineer",
    definition: "Builds internal developer platforms that standardize deployment and operational workflows.",
    requiredSkills: ["Kubernetes", "Terraform", "Golden Paths", "Developer Experience", "Observability", "Security Guardrails", "Automation", "APIs"],
    marketNote: "Growing role in scale-ups with multi-team engineering orgs.",
    baseSalaryUsd: { min: 120000, max: 200000 },
  },
  {
    id: "site-reliability-engineer",
    role: "Site Reliability Engineer",
    definition: "Maintains service availability through error budgets, automation, and incident response.",
    requiredSkills: ["Distributed Systems", "SLO/SLI", "Incident Management", "Kubernetes", "Monitoring", "Capacity Planning", "Automation", "Linux"],
    marketNote: "High-priority hiring for business-critical digital services.",
    baseSalaryUsd: { min: 125000, max: 210000 },
  },
  {
    id: "data-analyst",
    role: "Data Analyst",
    definition: "Turns data into decisions through reporting, dashboarding, and trend analysis.",
    requiredSkills: ["SQL", "Excel", "BI Tools", "Statistics", "Data Visualization", "Data Cleaning", "Communication", "Storytelling"],
    marketNote: "Consistent demand across product, marketing, and operations.",
    baseSalaryUsd: { min: 70000, max: 125000 },
  },
  {
    id: "bi-analyst",
    role: "Business Intelligence Analyst",
    definition: "Builds semantic models and executive dashboards to monitor company performance.",
    requiredSkills: ["Power BI/Tableau", "SQL", "Data Modeling", "ETL Concepts", "KPIs", "Stakeholder Management", "DAX", "Reporting"],
    marketNote: "Frequently requested by growth-stage and enterprise firms.",
    baseSalaryUsd: { min: 78000, max: 130000 },
  },
  {
    id: "data-engineer",
    role: "Data Engineer",
    definition: "Creates robust pipelines and data platforms that deliver trusted datasets at scale.",
    requiredSkills: ["Python", "SQL", "ETL/ELT", "Data Warehousing", "Spark", "Airflow", "Cloud Data Services", "Data Quality"],
    marketNote: "One of the fastest-growing roles in AI-enabled companies.",
    baseSalaryUsd: { min: 105000, max: 185000 },
  },
  {
    id: "data-scientist",
    role: "Data Scientist",
    definition: "Uses statistical and ML methods to model outcomes and optimize business decisions.",
    requiredSkills: ["Python", "Statistics", "Machine Learning", "Experimentation", "Feature Engineering", "SQL", "Model Validation", "Communication"],
    marketNote: "Demand remains high where predictive products are core revenue drivers.",
    baseSalaryUsd: { min: 110000, max: 190000 },
  },
  {
    id: "machine-learning-engineer",
    role: "Machine Learning Engineer",
    definition: "Builds and deploys production ML systems with strong reliability and monitoring.",
    requiredSkills: ["Python", "PyTorch/TensorFlow", "Model Serving", "Feature Stores", "MLOps", "Distributed Training", "APIs", "Observability"],
    marketNote: "Role demand accelerated by generative AI product launches.",
    baseSalaryUsd: { min: 125000, max: 215000 },
  },
  {
    id: "mlops-engineer",
    role: "MLOps Engineer",
    definition: "Operationalizes ML pipelines, governance, and lifecycle management in production.",
    requiredSkills: ["CI/CD for ML", "Kubernetes", "Model Registry", "Data Versioning", "Monitoring", "Cloud", "Security", "Automation"],
    marketNote: "Adoption increasing in regulated industries and large enterprises.",
    baseSalaryUsd: { min: 125000, max: 205000 },
  },
  {
    id: "ai-engineer",
    role: "AI Engineer",
    definition: "Builds AI-powered features using LLMs, retrieval systems, and evaluation pipelines.",
    requiredSkills: ["LLM APIs", "Prompt Engineering", "RAG", "Vector Databases", "Python", "Backend APIs", "Evaluation", "Guardrails"],
    marketNote: "Top hiring focus for product teams adding AI copilots.",
    baseSalaryUsd: { min: 130000, max: 220000 },
  },
  {
    id: "cybersecurity-analyst",
    role: "Cybersecurity Analyst",
    definition: "Monitors threats, investigates incidents, and strengthens defensive posture.",
    requiredSkills: ["SIEM", "Threat Detection", "Incident Response", "Vulnerability Management", "Network Security", "Identity", "Scripting", "Reporting"],
    marketNote: "Security operations hiring is resilient across market cycles.",
    baseSalaryUsd: { min: 90000, max: 155000 },
  },
  {
    id: "security-engineer",
    role: "Security Engineer",
    definition: "Implements secure architecture, controls, and tooling across software and cloud systems.",
    requiredSkills: ["Application Security", "Cloud Security", "IAM", "Threat Modeling", "Security Testing", "Cryptography Basics", "Compliance", "Automation"],
    marketNote: "Demand elevated by cloud adoption and compliance mandates.",
    baseSalaryUsd: { min: 115000, max: 195000 },
  },
  {
    id: "qa-automation-engineer",
    role: "QA Automation Engineer",
    definition: "Designs automated test frameworks to improve release quality and speed.",
    requiredSkills: ["Test Automation", "Playwright/Cypress", "API Testing", "CI Pipelines", "Test Strategy", "Bug Triage", "Performance Testing", "Scripting"],
    marketNote: "High need in teams shipping frequent product updates.",
    baseSalaryUsd: { min: 85000, max: 145000 },
  },
  {
    id: "product-manager",
    role: "Product Manager",
    definition: "Owns product direction, roadmap prioritization, and cross-functional execution.",
    requiredSkills: ["Roadmapping", "User Research", "Data Analysis", "Prioritization", "Stakeholder Management", "Experimentation", "Requirements", "Communication"],
    marketNote: "Consistent openings where digital products drive growth.",
    baseSalaryUsd: { min: 110000, max: 190000 },
  },
  {
    id: "technical-project-manager",
    role: "Technical Project Manager",
    definition: "Drives technical delivery planning, risk management, and inter-team coordination.",
    requiredSkills: ["Project Planning", "Agile Delivery", "Risk Management", "Technical Communication", "Dependency Tracking", "Reporting", "Vendor Coordination", "Tooling"],
    marketNote: "In-demand for large migration and modernization programs.",
    baseSalaryUsd: { min: 98000, max: 165000 },
  },
  {
    id: "ux-engineer",
    role: "UX Engineer",
    definition: "Bridges design and engineering by implementing highly usable, accessible interfaces.",
    requiredSkills: ["Design Systems", "Accessibility", "Frontend Development", "Prototyping", "Interaction Design", "Usability Testing", "CSS", "Communication"],
    marketNote: "Growing role in product-led organizations focused on design quality.",
    baseSalaryUsd: { min: 90000, max: 155000 },
  },
  {
    id: "solutions-architect",
    role: "Solutions Architect",
    definition: "Designs enterprise-grade technical solutions and aligns them with business outcomes.",
    requiredSkills: ["System Architecture", "Cloud Platforms", "Integration Patterns", "Security", "Cost Modeling", "Stakeholder Communication", "Documentation", "Pre-sales"],
    marketNote: "Strong demand in consulting, cloud, and enterprise SaaS firms.",
    baseSalaryUsd: { min: 130000, max: 220000 },
  },
  {
    id: "database-administrator",
    role: "Database Administrator",
    definition: "Ensures database performance, availability, backup strategy, and governance.",
    requiredSkills: ["SQL", "Database Tuning", "Backup/Recovery", "Replication", "High Availability", "Security", "Monitoring", "Automation"],
    marketNote: "Still essential for regulated and data-heavy environments.",
    baseSalaryUsd: { min: 95000, max: 160000 },
  },
  {
    id: "network-engineer",
    role: "Network Engineer",
    definition: "Designs and maintains secure, high-availability network infrastructure.",
    requiredSkills: ["Routing/Switching", "Firewalls", "VPN", "Load Balancing", "Network Monitoring", "Troubleshooting", "Cloud Networking", "Security"],
    marketNote: "Demand remains strong in telecom, finance, and enterprise IT.",
    baseSalaryUsd: { min: 90000, max: 150000 },
  },
  {
    id: "embedded-systems-engineer",
    role: "Embedded Systems Engineer",
    definition: "Builds software for hardware devices in automotive, IoT, and industrial systems.",
    requiredSkills: ["C/C++", "RTOS", "Firmware Debugging", "Microcontrollers", "Hardware Interfaces", "Testing", "Performance Optimization", "Version Control"],
    marketNote: "Hiring boosted by IoT adoption and connected-device products.",
    baseSalaryUsd: { min: 95000, max: 165000 },
  },
];

export function getSalaryByCountry(role: ITMarketRole) {
  return IT_MARKET_COUNTRIES.map((country) => {
    const multiplier = COUNTRY_MULTIPLIERS[country];
    const min = role.baseSalaryUsd.min * multiplier;
    const max = role.baseSalaryUsd.max * multiplier;

    return {
      country,
      minAnnualUsd: min,
      maxAnnualUsd: max,
      salaryRange: formatUsdRange(min, max),
    };
  });
}
