const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'src', 'fonts');
const fontFiles = [
  { file: 'DancingScript.ttf', family: 'Local Dancing Script' },
  { file: 'Caveat.ttf', family: 'Local Caveat' },
  { file: 'Pacifico.ttf', family: 'Local Pacifico' },
  { file: 'GreatVibes.ttf', family: 'Local Great Vibes' },
  { file: 'Sacramento.ttf', family: 'Local Sacramento' },
  { file: 'Satisfy.ttf', family: 'Local Satisfy' }
];

let css = '';

for (const { file, family } of fontFiles) {
  const filePath = path.join(fontsDir, file);
  if (fs.existsSync(filePath)) {
    const base64 = fs.readFileSync(filePath).toString('base64');
    css += `@font-face {
  font-family: '${family}';
  src: url(data:font/truetype;charset=utf-8;base64,${base64}) format('truetype');
  font-weight: normal;
  font-style: normal;
}\n`;
  }
}

const frontendCssPath = path.join(__dirname, '..', 'frontend', 'src', 'fonts.css');
fs.writeFileSync(frontendCssPath, css);
console.log('Successfully generated base64 fonts.css');
