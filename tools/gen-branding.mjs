// Generates the icon set surfer expects in configs/branding/<brand>/
// from the transparent source logo.
// Usage: node tools/gen-branding.mjs [brand]   (default brand: release)
//
// sharp and png-to-ico come with @zen-browser/surfer.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const brand = process.argv[2] || "release";
const source = "branding/source/sunfinch-logo.webp";
const outDir = join("configs", "branding", brand);
const SIZES = [16, 22, 24, 32, 48, 64, 128, 256, 512];
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

// Square canvas with the bird centered; padding is a share of the side.
async function square(side, padding) {
  const inner = Math.round(side * (1 - 2 * padding));
  const bird = await sharp(source)
    .trim()
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  return sharp({
    create: {
      width: side,
      height: side,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: bird, gravity: "center" }])
    .png()
    .toBuffer();
}

await mkdir(join(outDir, "content"), { recursive: true });

await writeFile(join(outDir, "logo.png"), await square(1024, 0.02));
// macOS icons are drawn smaller inside their tile.
await writeFile(join(outDir, "logo-mac.png"), await square(1024, 0.1));

const pngs = {};
for (const size of SIZES) {
  // Small icons get almost no padding so the bird stays readable.
  pngs[size] = await square(size, size <= 32 ? 0 : 0.02);
  await writeFile(join(outDir, `logo${size}.png`), pngs[size]);
}

const icoPngs = await Promise.all(
  ICO_SIZES.map(size => pngs[size] ?? square(size, size <= 32 ? 0 : 0.02))
);
const ico = await pngToIco(icoPngs);
await writeFile(join(outDir, "firefox.ico"), ico);
await writeFile(join(outDir, "firefox64.ico"), ico);

console.log(`Branding "${brand}" written to ${outDir}`);
