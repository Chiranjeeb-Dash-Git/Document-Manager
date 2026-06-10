import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontFileMap: Record<string, string> = {
    'Dancing Script': 'DancingScript.ttf',
    'Caveat': 'Caveat.ttf',
    'Pacifico': 'Pacifico.ttf',
    'Great Vibes': 'GreatVibes.ttf',
    'Sacramento': 'Sacramento.ttf',
    'Satisfy': 'Satisfy.ttf',
  };

  for (const [name, filename] of Object.entries(fontFileMap)) {
    const fontBytes = fs.readFileSync(path.join(process.cwd(), 'src/fonts', filename));
    const customFont = await pdfDoc.embedFont(fontBytes);
    
    console.log(`${name}:`);
    console.log(`  height at 32: ${customFont.heightAtSize(32)}`);
    console.log(`  sizeAtHeight(32): ${customFont.sizeAtHeight(32)}`);
    // @ts-ignore
    const font = customFont.font;
    console.log(`  ascender: ${font.ascent}, descender: ${font.descent}, unitsPerEm: ${font.unitsPerEm}`);
  }
}

test().catch(console.error);
