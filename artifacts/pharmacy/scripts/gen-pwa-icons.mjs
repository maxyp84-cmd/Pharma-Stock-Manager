import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="96" fill="#1F7368"/>
    <g transform="translate(256 256)">
      <path d="M0 -110 L0 110 M-110 0 L110 0" stroke="#FFFFFF" stroke-width="64" stroke-linecap="round"/>
    </g>
  </svg>`,
);

const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#1F7368"/>
    <g transform="translate(256 256)">
      <path d="M0 -90 L0 90 M-90 0 L90 0" stroke="#FFFFFF" stroke-width="56" stroke-linecap="round"/>
    </g>
  </svg>`,
);

await sharp(svg).resize(192, 192).png().toFile(resolve(outDir, "pwa-192.png"));
await sharp(svg).resize(512, 512).png().toFile(resolve(outDir, "pwa-512.png"));
await sharp(maskableSvg).resize(512, 512).png().toFile(resolve(outDir, "pwa-maskable-512.png"));
await sharp(svg).resize(180, 180).png().toFile(resolve(outDir, "apple-touch-icon.png"));

console.log("PWA icons generated.");
