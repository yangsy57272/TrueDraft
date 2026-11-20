import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640"><rect width="1280" height="640" fill="#f6f5ee"/><path d="M0 0H1280V12H0Z" fill="#176d60"/><rect x="72" y="65" width="62" height="62" rx="15" fill="#182c2b"/><text x="87" y="112" fill="#fffef9" font-size="48" font-family="Georgia">T</text><circle cx="120" cy="112" r="4" fill="#acd9b8"/><text x="152" y="108" fill="#182c2b" font-size="32" font-weight="bold" font-family="Arial">TrueDraft</text><text x="72" y="225" fill="#176d60" font-size="17" letter-spacing="3" font-family="Arial">YOUR NEXT CLEAR STEP</text><text x="72" y="310" fill="#182c2b" font-size="62" font-family="Georgia">College applications,</text><text x="72" y="387" fill="#176d60" font-size="62" font-style="italic" font-family="Georgia">with a little more direction.</text><text x="76" y="465" fill="#536965" font-size="24" font-family="Arial">Explore colleges. Plan your day. Keep your voice.</text><rect x="72" y="527" width="260" height="48" rx="8" fill="#182c2b"/><text x="97" y="558" fill="#fffef9" font-size="19" font-family="Arial">Try the interactive demo</text><text x="365" y="558" fill="#536965" font-size="18" font-family="Arial">Open source · English + Chinese · MIT</text><path d="M1060 92h112v112M1088 176l80-80" fill="none" stroke="#b4c7ad" stroke-width="16"/></svg>`;
await mkdir("public/showcase", { recursive: true });
await writeFile("public/showcase/social-preview.svg", svg);
await sharp(Buffer.from(svg))
  .png()
  .toFile("public/showcase/social-preview.png");
console.log("Social preview generated from repository-owned SVG.");
