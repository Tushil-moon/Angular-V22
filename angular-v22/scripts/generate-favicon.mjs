/**
 * Generates PNG + ICO favicon assets from public/favicon.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = readFileSync(join(publicDir, 'favicon.svg'));

const sharp = (await import('sharp')).default;
const pngToIco = (await import('png-to-ico')).default;

const png16 = await sharp(svg).resize(16, 16).png().toBuffer();
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();

writeFileSync(join(publicDir, 'favicon.ico'), await pngToIco([png16, png32]));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), await sharp(svg).resize(180, 180).png().toBuffer());
writeFileSync(join(publicDir, 'icon-192.png'), await sharp(svg).resize(192, 192).png().toBuffer());
writeFileSync(join(publicDir, 'icon-512.png'), await sharp(svg).resize(512, 512).png().toBuffer());

console.log('Favicon assets generated in public/');
