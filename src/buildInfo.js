const FALLBACK_BUILD_VALUE = 'unknown';

export const BUILD_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : FALLBACK_BUILD_VALUE;
export const BUILD_COMMIT = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : FALLBACK_BUILD_VALUE;

export function exposeBuildInfoGlobal(target = globalThis) {
  if (!target) return;
  const buildInfo = {
    commit: BUILD_COMMIT,
    version: BUILD_VERSION,
  };
  target.__GRIDFALL_BUILD_COMMIT__ = BUILD_COMMIT;
  target.__GRIDFALL_BUILD_INFO__ = buildInfo;
}

export function logBuildInfo() {
  console.info(`[GRIDFALL_BUILD] commit=${BUILD_COMMIT}`);
}

export function getBuildMarkerText() {
  const shortCommit = BUILD_COMMIT.length > 7 ? BUILD_COMMIT.slice(0, 7) : BUILD_COMMIT;
  return `build ${shortCommit} v${BUILD_VERSION}`;
}
