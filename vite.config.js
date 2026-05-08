import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
  },
});
