import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const buildTimestamp = process.env.BUILD_TIMESTAMP ?? new Date().toISOString();
const buildId = process.env.VITE_BUILD_ID ?? process.env.BUILD_ID ?? gitCommit;

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __BUILD_ID__: JSON.stringify(buildId),
  },
});
