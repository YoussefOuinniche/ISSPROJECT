const fs = require('fs');

function cleanFile(f) {
  if(!fs.existsSync(f)) return;
  let t = fs.readFileSync(f, 'utf8');

  // Strip AI Chat Screen Glow Orbs
  t = t.replace(/<View style=\{\[styles\.glowOrb, styles\.glowOrbTop\]\}\s*\/>/gs, '');
  t = t.replace(/<View style=\{\[styles\.glowOrb, styles\.glowOrbBottom\]\}\s*\/>/gs, '');

  t = t.replace(/glowOrb: \{[\s\S]*?\},/g, '');
  t = t.replace(/glowOrbTop: \{[\s\S]*?\},/g, '');
  t = t.replace(/glowOrbBottom: \{[\s\S]*?\},/g, '');

  // Strip shadows & elevation anywhere
  t = t.replace(/shadowColor:[^,]+,\s*/g, '');
  t = t.replace(/shadowOffset:\s*\{[^}]+\},\s*/g, '');
  t = t.replace(/shadowOpacity:[^,]+,\s*/g, '');
  t = t.replace(/shadowRadius:[^,]+,\s*/g, '');
  t = t.replace(/elevation:[^,]+,\s*/g, '');

  fs.writeFileSync(f, t, 'utf8');
}

cleanFile('C:\\\\Users\\\\user\\\\Downloads\\\\ISSPROJECT-master (3)\\\\ISSPROJECT-master\\\\mobile\\\\artifacts\\\\mobile\\\\app\\\\AIChatScreen.tsx');
cleanFile('C:\\\\Users\\\\user\\\\Downloads\\\\ISSPROJECT-master (3)\\\\ISSPROJECT-master\\\\mobile\\\\artifacts\\\\mobile\\\\components\\\\chat\\\\ChatInput.tsx');
cleanFile('C:\\\\Users\\\\user\\\\Downloads\\\\ISSPROJECT-master (3)\\\\ISSPROJECT-master\\\\mobile\\\\artifacts\\\\mobile\\\\components\\\\chat\\\\ChatBubble.tsx');

console.log('Cleaned AI Assistant sub-components');
