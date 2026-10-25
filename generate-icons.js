// Run once: node generate-icons.js
// Requires: npm install sharp --save-dev
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "public", "icons");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

// Inline SVG icon — purple rounded square with a pencil
const svg = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#6c5ce7"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" font-family="serif">🎨</text>
</svg>`);

(async () => {
  for (const s of SIZES) {
    await sharp(svg(s)).resize(s, s).png().toFile(path.join(OUT, `icon-${s}.png`));
    console.log(`✓ icon-${s}.png`);
  }
  console.log("All icons generated in public/icons/");
})();
