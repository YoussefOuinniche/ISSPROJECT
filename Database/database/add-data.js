require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const BATCH_SIZE = 100;
const TOTAL_USERS = 10000;

const domains = ['Software Development', 'Data Science', 'Cloud Computing', 'DevOps', 'Web Development', 'Mobile Development', 'AI/ML', 'Cybersecurity', 'Database', 'UI/UX Design'];
const titles = ['Software Engineer', 'Senior Developer', 'Full Stack Developer', 'Backend Developer', 'Frontend Developer', 'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Cloud Architect', 'Security Analyst', 'Database Administrator', 'UI/UX Designer', 'Product Manager', 'Tech Lead', 'System Administrator'];
const experienceLevels = ['student', 'junior', 'mid', 'senior'];
const skillNames = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask', 'Spring', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Microservices', 'CI/CD', 'Git', 'Linux', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'SQL', 'NoSQL', 'Elasticsearch', 'Kafka', 'RabbitMQ', 'Jenkins', 'Terraform', 'Ansible', 'Nginx', 'Apache', 'TypeScript', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Flutter'];
const categories = ['Programming Language', 'Frontend Framework', 'Backend Framework', 'Database', 'DevOps', 'Cloud Platform', 'AI/ML', 'Tool', 'Architecture'];
const trendTitles = ['AI-Powered Development', 'Serverless Computing', 'Edge Computing', 'Web3 Technologies', 'Low-Code Platforms', 'Quantum Computing', 'Green Computing', 'API-First Development', 'Platform Engineering', 'FinOps'];
const sources = ['GitHub', 'Stack Overflow', 'Gartner', 'Forrester', 'IEEE', 'ACM', 'TechCrunch', 'Ars Technica', 'The Verge', 'Hacker News'];
const recommendationTypes = ['skill', 'trend', 'career', 'workflow'];

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateEmail = (index) => {
  const providers = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me'];
  const timestamp = Date.now();
  return `user${timestamp}${index}@${randomItem(providers)}`;
};

const generateFullName = () => {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Emma', 'Alex', 'Olivia', 'Daniel', 'Sophia', 'Matthew', 'Isabella', 'James', 'Mia', 'Robert', 'Charlotte', 'William', 'Amelia', 'Richard', 'Harper', 'Joseph', 'Evelyn', 'Thomas', 'Abigail', 'Charles', 'Ella', 'Christopher', 'Scarlett'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker'];
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
};

const generateBio = () => {
  const bios = [
    'Passionate developer with expertise in building scalable applications',
    'Experienced professional focused on delivering high-quality solutions',
    'Tech enthusiast with a strong background in software development',
    'Creative problem solver with years of industry experience',
    'Dedicated engineer committed to continuous learning and growth',
    'Results-driven developer with a passion for innovation',
    'Full-stack specialist with experience across multiple technologies',
    'Cloud-native developer building modern applications',
    'Detail-oriented professional with strong analytical skills',
    'Collaborative team player with excellent communication skills'
  ];
  return randomItem(bios);
};

async function insertBatch(table, data) {
  const { error } = await supabase.from(table).insert(data);
  if (error) throw error;
}

async function generateData() {
  console.log('🚀 Starting data generation...\n');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  let totalInserted = 0;
  const startTime = Date.now();

  for (let batch = 0; batch < Math.ceil(TOTAL_USERS / BATCH_SIZE); batch++) {
    const batchSize = Math.min(BATCH_SIZE, TOTAL_USERS - totalInserted);
    
    const users = [];
    for (let i = 0; i < batchSize; i++) {
      users.push({
        email: generateEmail(totalInserted + i),
        password_hash: passwordHash,
        full_name: generateFullName()
      });
    }

    try {
      const { data: insertedUsers, error } = await supabase
        .from('users')
        .insert(users)
        .select('id');
      
      if (error) throw error;

      const profiles = insertedUsers.map(user => ({
        user_id: user.id,
        domain: randomItem(domains),
        title: randomItem(titles),
        experience_level: randomItem(experienceLevels),
        bio: generateBio(),
        last_analysis_at: new Date(Date.now() - randomInt(0, 90) * 24 * 60 * 60 * 1000).toISOString()
      }));
      await insertBatch('profiles', profiles);

      const skillGaps = [];
      const recommendations = [];
      
      insertedUsers.forEach(user => {
        const numGaps = randomInt(1, 5);
        for (let i = 0; i < numGaps; i++) {
          skillGaps.push({
            user_id: user.id,
            domain: randomItem(domains),
            skill_name: randomItem(skillNames),
            gap_level: randomInt(1, 5),
            reason: `Needs improvement in ${randomItem(skillNames)}`
          });
        }

        const numRecs = randomInt(2, 6);
        for (let i = 0; i < numRecs; i++) {
          const type = randomItem(recommendationTypes);
          recommendations.push({
            user_id: user.id,
            type: type,
            title: `${type === 'skill' ? 'Learn' : 'Explore'} ${randomItem(skillNames)}`,
            content: `Focus on improving your skills in ${randomItem(domains)} by learning ${randomItem(skillNames)}`,
            skill_name: type === 'skill' ? randomItem(skillNames) : null,
            trend_title: type === 'trend' ? randomItem(trendTitles) : null
          });
        }
      });

      await insertBatch('skill_gaps', skillGaps);
      await insertBatch('recommendations', recommendations);

      totalInserted += batchSize;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const progress = ((totalInserted / TOTAL_USERS) * 100).toFixed(1);
      const rate = (totalInserted / (Date.now() - startTime) * 1000).toFixed(0);
      
      console.log(`✅ Batch ${batch + 1}: Inserted ${batchSize} users | Total: ${totalInserted}/${TOTAL_USERS} (${progress}%) | Rate: ${rate}/s | Time: ${elapsed}s`);

    } catch (error) {
      console.error(`❌ Error in batch ${batch + 1}:`, error.message);
      continue;
    }
  }

  const skills = [];
  for (let i = 0; i < 200; i++) {
    skills.push({
      name: `${randomItem(skillNames)}-${Date.now()}-${i}`,
      category: randomItem(categories)
    });
  }
  
  try {
    await insertBatch('skills', skills);
    console.log(`✅ Inserted ${skills.length} additional skills`);
  } catch (error) {
    console.log(`⚠️  Skills insert: ${error.message}`);
  }

  const trends = [];
  for (let i = 0; i < 500; i++) {
    trends.push({
      domain: randomItem(domains),
      title: `${randomItem(trendTitles)} ${Date.now()}-${i}`,
      description: `Emerging trend in ${randomItem(domains)} focusing on ${randomItem(skillNames)}`,
      source: randomItem(sources)
    });
  }
  
  try {
    await insertBatch('trends', trends);
    console.log(`✅ Inserted ${trends.length} additional trends`);
  } catch (error) {
    console.log(`⚠️  Trends insert: ${error.message}`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Completed! Inserted ${totalInserted} users with profiles, skill gaps, and recommendations in ${totalTime}s`);
}

generateData().catch(console.error);
