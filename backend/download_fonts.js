const fs = require('fs');
const path = require('path');
const https = require('https');

const fonts = {
  'Dancing Script': 'DancingScript',
  'Caveat': 'Caveat',
  'Pacifico': 'Pacifico',
  'Great Vibes': 'GreatVibes',
  'Sacramento': 'Sacramento',
  'Satisfy': 'Satisfy'
};

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function downloadFonts() {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400&family=Caveat:wght@400&family=Pacifico&family=Great+Vibes&family=Sacramento&family=Satisfy`;
  const options = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; rv:12.0) Gecko/20100101 Firefox/12.0' }
  };

  return new Promise((resolve) => {
    https.get(cssUrl, options, async (res) => {
      let css = '';
      res.on('data', d => css += d);
      res.on('end', async () => {
        const regex = /font-family: '([^']+)'.*?src: url\('([^']+)'\)/gs;
        let match;
        const downloads = [];
        while ((match = regex.exec(css)) !== null) {
          const family = match[1];
          const url = match[2];
          if (fonts[family]) {
            const filename = fonts[family] + '.ttf';
            const dest = path.join(process.cwd(), 'src/fonts', filename);
            console.log(`Downloading ${filename}`);
            downloads.push(downloadFile(url, dest));
          }
        }
        await Promise.all(downloads);
        resolve();
      });
    });
  });
}

downloadFonts().then(() => console.log('Done')).catch(console.error);
