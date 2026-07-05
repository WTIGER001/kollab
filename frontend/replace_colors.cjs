const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
};

const regex = /(color|bgcolor|backgroundColor|borderColor|border|borderBottom|borderTop|borderLeft|borderRight|boxShadow):\s*["']?(?:1px solid\s*)?rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*[0-9.]+\s*\)(?:!important)?["']?/gi;

let totalReplacements = 0;

walk('./src/components', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(regex, (match, prop) => {
    totalReplacements++;
    const p = prop.toLowerCase();
    
    if (p.includes('border') && p !== 'border') {
      return `${prop}: "var(--border-color)"`;
    } else if (p === 'border') {
      return `${prop}: "1px solid var(--border-color)"`;
    } else if (p === 'bgcolor' || p === 'backgroundcolor') {
      return `${prop}: "action.hover"`;
    } else if (p === 'color') {
      return `${prop}: "text.secondary"`; 
    } else {
      return match;
    }
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});

console.log(`Total replacements: ${totalReplacements}`);
