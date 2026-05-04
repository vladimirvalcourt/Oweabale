const fs = require('fs');
const path = require('path');

const replacements = {
  '\\[#0A0A0A\\]': 'surface-base',
  '\\[#141414\\]': 'surface-raised',
  '\\[#1C1C1C\\]': 'surface-elevated',
  '\\[#1F1F1F\\]': 'surface-highlight',
  '\\[#262626\\]': 'surface-border',
  '\\[#FAFAFA\\]': 'content-primary',
  '\\[#0F0F0F\\]': 'surface-base',
  '\\[#0D0D0D\\]': 'surface-base',
  '\\[#111111\\]': 'surface-base',
  '\\[#1A1A1A\\]': 'surface-elevated',
  '\\[#222\\]': 'surface-highlight',
  '\\[#333\\]': 'surface-border',
};

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
      results.push(filePath);
    }
  });
  return results;
}

const files = walkDir('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [pattern, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      changed = true;
    }
  }

  if (changed) {
    // A quick hack for text-[-content-primary] mistakes:
    // replacing bg-[#0A0A0A] directly via regex means `bg-\[#0A0A0A\]` -> `bg-surface-base`
    // but the regex pattern is '\\[#0A0A0A\\]'. The source has `bg-[#0A0A0A]`.
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
