const fs = require('fs');
const path = require('path');
const https = require('https');

const fontUrls = {
  'DancingScript.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dancingscript/static/DancingScript-Regular.ttf',
  'Caveat.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/static/Caveat-Regular.ttf',
  'Pacifico.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/pacifico/Pacifico-Regular.ttf',
  'GreatVibes.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/greatvibes/GreatVibes-Regular.ttf',
  'Sacramento.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/sacramento/Sacramento-Regular.ttf',
  'Satisfy.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/satisfy/Satisfy-Regular.ttf'
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Status ${response.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function downloadAll() {
  for (const [filename, url] of Object.entries(fontUrls)) {
    const dest1 = path.join(__dirname, 'src', 'fonts', filename);
    const dest2 = path.join(__dirname, '..', 'frontend', 'public', 'fonts', filename);
    
    console.log(`Downloading ${filename}...`);
    try {
      await downloadFile(url, dest1);
      fs.copyFileSync(dest1, dest2);
      console.log(`Successfully downloaded ${filename}`);
    } catch (e) {
      console.error(`Failed to download ${filename}:`, e.message);
    }
  }
}

downloadAll().then(() => console.log('Done'));
