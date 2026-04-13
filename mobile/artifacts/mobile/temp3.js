const fs = require('fs');
const path = require('path');
const target = path.join(process.cwd(), 'mobile', 'artifacts', 'mobile', 'app', '(tabs)');
const files = ['index.tsx', 'skills.tsx', 'learn.tsx', 'trends.tsx', 'profile.tsx', 'ai-chat.tsx'];

for (const f of files) {
  const p = path.join(target, f);
  if(!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');

  // Strip Lottie import and usage entirely
  text = text.replace(/import\s*\{\s*LottieAccent\s*\}\s*from\s*['"]@\/components\/LottieAccent['"];?\n?/g, '');
  text = text.replace(/<LottieAccent.*?(\/>|<\/LottieAccent>)\s*/gs, '');
  
  // Make cards truly flat with thin borders if they don't have them
  text = text.replace(/shadowColor: [^,]+,\s*shadowOffset: [^,]+,\s*shadowOpacity: [^,]+,\s*shadowRadius: [^,]+,\s*elevation: [^,]+,/gs, '');

  fs.writeFileSync(p, text, 'utf8');
}
console.log('Cleaned Lottie tags successfully');
