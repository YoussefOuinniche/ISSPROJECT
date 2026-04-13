const fs = require('fs');
const path = require('path');
const f = path.join(process.cwd(), 'app', 'AIChatScreen.tsx');
if(fs.existsSync(f)) {
  let text = fs.readFileSync(f, 'utf8');

  text = text.replace(/import\s*\{\s*LinearGradient\s*\}\s*from\s*['"]expo-linear-gradient['"];?\r?\n?/g, '');
  text = text.replace(/import\s*\{\s*LottieAccent\s*\}\s*from\s*['"]@\/components\/LottieAccent['"];?\r?\n?/g, '');
  text = text.replace(/<LottieAccent.*?(\/>|<\/LottieAccent>)\s*/gs, '');
  
  text = text.replace(/<\/LinearGradient>/g, '</View>');
  text = text.replace(/<LinearGradient([^>]*?)>/g, (m, attrs) => {
    let newAttrs = attrs.replace(/colors=\{[^}]+\}/g, '').replace(/start=\{\{.*?\}\}/g, '').replace(/end=\{\{.*?\}\}/g, '').trim();
    return newAttrs ? '<View ' + newAttrs + '>' : '<View>';
  });

  // Strip shadows & elevation
  text = text.replace(/shadowColor:[^,]+,/g, '');
  text = text.replace(/shadowOffset:\s*\{[^}]+\},/g, '');
  text = text.replace(/shadowOpacity:[^,]+,/g, '');
  text = text.replace(/shadowRadius:[^,]+,/g, '');
  text = text.replace(/elevation:[^,]+,/g, '');
  
  // Clean message bubbles
  text = text.replace(/gradientPrimary/g, 'undefined'); // Drop gradients 

  fs.writeFileSync(f, text, 'utf8');
}
console.log('Cleaned AIChatScreen');
