// Stages the compiled CLI binary into the desktop Tauri bundle directory
const fs = require('fs');
const path = require('path');

const bin = process.platform === 'win32' ? 'proxync.exe' : 'proxync';
const src = path.join(__dirname, '..', 'packages', 'cli', 'target', 'release', bin);
const dstDir = path.join(__dirname, '..', 'packages', 'desktop', 'src-tauri', 'bin');

fs.mkdirSync(dstDir, { recursive: true });
if (fs.existsSync(src)) {
  fs.copyFileSync(src, path.join(dstDir, bin));
  console.log(`[stage-cli] Copied CLI binary to ${path.join(dstDir, bin)}`);
}
