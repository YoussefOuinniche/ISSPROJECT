const fs = require('fs');
const path = require('path');

const file = 'C:\\Users\\user\\Downloads\\ISSPROJECT-master (3)\\ISSPROJECT-master\\mobile\\artifacts\\mobile\\app\\(tabs)\\index.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/<LinearGradient colors={Colors.gradientPrimary} style={styles.confidenceCard}(.+?)<\/LinearGradient>/s, 
  (match, p1) => {
    let r = '<View style={[styles.confidenceCard, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]}' + p1 + '</View>';
    r = r.replace(/Colors\.textInverse/g, 'Colors.textPrimary');
    r = r.replace(/style=\{styles\.confTitle\}/g, 'style={[styles.confTitle, { color: Colors.textPrimary }]}');
    r = r.replace(/style=\{styles\.confScore\}/g, 'style={[styles.confScore, { color: Colors.textPrimary }]}');
    r = r.replace(/style=\{styles\.confPct\}/g, 'style={[styles.confPct, { color: Colors.textPrimary }]}');
    r = r.replace(/trackColor="[^"]+"/g, 'trackColor={Colors.border}');
    r = r.replace(/fillColor=\{Colors\.surface\}/g, 'fillColor={Colors.accent}');
    // remove start/end
    r = r.replace(/start=\{\{ x: 0, y: 0 \}\} end=\{\{ x: 1, y: 1 \}\}/g, '');
    return r;
  }
);
fs.writeFileSync(file, txt);
