export const BUILD_VERSION = __APP_VERSION__;
export const BUILD_COMMIT = __GIT_COMMIT__;

export function getBuildMarkerText() {
  const shortCommit = BUILD_COMMIT.length > 7 ? BUILD_COMMIT.slice(0, 7) : BUILD_COMMIT;
  return `build ${shortCommit} v${BUILD_VERSION}`;
}
