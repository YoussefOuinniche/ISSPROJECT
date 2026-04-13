const fs = require('fs');
const path = require('path');
const target = path.join(process.cwd(), 'app', '(tabs)');
const files = ['index.tsx', 'skills.tsx', 'learn.tsx', 'trends.tsx', 'profile.tsx', 'ai-chat.tsx'];

for (const f of files) {
  const p = path.join(target, f);
  if(!fs.existsSync(p)) {
      console.log('Missing:', p);
      continue;
  }
  let text = fs.readFileSync(p, 'utf8');

  // Strip imports
  text = text.replace(/import\s*\{\s*LinearGradient\s*\}\s*from\s*['"]expo-linear-gradient['"];?\r?\n?/g, '');
  text = text.replace(/import\s*\{\s*LottieAccent\s*\}\s*from\s*['"]@\/components\/LottieAccent['"];?\r?\n?/g, '');
  text = text.replace(/<LottieAccent.*?(\/>|<\/LottieAccent>)\s*/gs, '');
  
  // Convert LinearGradients to plain Views
  text = text.replace(/<\/LinearGradient>/g, '</View>');
  text = text.replace(/<LinearGradient([^>]*?)>/g, (m, attrs) => {
    let newAttrs = attrs
      .replace(/colors=\{[^}]+\}/g, '')
      .replace(/start=\{\{.*?\}\}/g, '')
      .replace(/end=\{\{.*?\}\}/g, '')
      .replace(/Colors\.gradientPrimary/g, 'undefined')
      .replace(/Colors\.gradientCard/g, 'undefined')
      .trim();
    if(newAttrs) return '<View ' + newAttrs + '>';
    return '<View>';
  });

  // Strip shadows & elevation fully
  text = text.replace(/shadowColor:\s*['"]?[A-Za-z0-9_#().,\s\-]+?['"]?,\r?\n?/g, '');
  text = text.replace(/shadowOffset:\s*\{[\s\S]*?\},\r?\n?/g, '');
  text = text.replace(/shadowOpacity:\s*[\d.]+,\r?\n?/g, '');
  text = text.replace(/shadowRadius:\s*[\d.]+,\r?\n?/g, '');
  text = text.replace(/elevation:\s*[\d.]+,\r?\n?/g, '');
  
  text = text.replace(/textInverse/g, 'textPrimary');
  text = text.replace(/rgba\(255,\s*255,\s*255,\s*0\.2\)/g, 'Colors.border');
  
  // Specific fallback backgrounds for cards:
  text = text.replace(/style=\{styles\.confidenceCard\}/g, 'style={[styles.confidenceCard, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]}');
  
  text = text.replace(/color="#fff"/g, 'color={Colors.textPrimary}');
  text = text.replace(/color='\#fff'/g, 'color={Colors.textPrimary}');
  
  // Custom headers with bad gradients in profile, skills, etc. Look for hardcoded style arrays that we can wipe out:
  text = text.replace(/style=\{\[/g, 'style={[');

  fs.writeFileSync(p, text, 'utf8');
}
console.log('Stripped everything properly from current directory');
