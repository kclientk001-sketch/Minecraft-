import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generateArt } from './generate-art.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = path.join(root, '.dist-build');
const output = path.join(root, 'dist');
try {
  const publicConfig = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
  const allowedKeys = ['name', 'serverAddress', 'edition', 'gameVersion', 'discordUrl'];
  for (const [key, value] of Object.entries(publicConfig)) {
    if (!allowedKeys.includes(key) || typeof value !== 'string') throw new Error('site.config.json chỉ cho phép các trường công khai được định nghĩa.');
  }
  if (publicConfig.discordUrl) {
    const url = new URL(publicConfig.discordUrl);
    if (url.protocol !== 'https:' || url.username || url.password || !['discord.gg', 'discord.com', 'www.discord.com'].includes(url.hostname)) throw new Error('discordUrl phải là liên kết HTTPS chính thức của Discord.');
  }
  await rm(temporary, { recursive: true, force: true });
  await mkdir(path.join(temporary, 'assets'), { recursive: true });
  // Explicit public-file allowlist. Never copy the workspace, .env, or skills.
  for (const name of ['index.html', 'styles.css', 'app.js']) await copyFile(path.join(root, 'src', name), path.join(temporary, name));
  let html = await readFile(path.join(temporary, 'index.html'), 'utf8');
  for (const name of ['app.js', 'styles.css']) {
    const content = await readFile(path.join(temporary, name));
    const version = createHash('sha256').update(content).digest('hex').slice(0, 12);
    html = html.replaceAll(`./${name}"`, `./${name}?v=${version}"`);
  }
  await writeFile(path.join(temporary, 'index.html'), html);
  await copyFile(path.join(root, 'src/assets/favicon.svg'), path.join(temporary, 'assets/favicon.svg'));
  await writeFile(path.join(temporary, 'site.config.json'), JSON.stringify(publicConfig, null, 2) + '\n');
  await writeFile(path.join(temporary, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  await generateArt(path.join(temporary, 'assets'));
  await rm(output, { recursive: true, force: true });
  await rename(temporary, output);
  let count = 0, bytes = 0;
  async function countFiles(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) await countFiles(file);
      else { count++; bytes += (await stat(file)).size; }
    }
  }
  await countFiles(output);
  console.log(`Build thành công: dist/index.html | ${count} tệp | ${(bytes / 1024).toFixed(1)} KiB | không có dependency ngoài.`);
} catch (error) {
  await rm(temporary, { recursive: true, force: true });
  console.error(error instanceof Error ? error.message : 'Build failed.');
  process.exitCode = 1;
}
