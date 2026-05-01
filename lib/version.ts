/**
 * Application version information
 * Update this file in sync with package.json version
 */

export const APP_VERSION = "1.0.0-beta.1";
export const APP_NAME = "LocalPDF Engine";
export const RELEASE_DATE = new Date("2026-04-28");

export interface VersionInfo {
  version: string;
  name: string;
  releaseDate: Date;
  isBeta: boolean;
  status: "beta" | "release" | "rc";
}

export const versionInfo: VersionInfo = {
  version: APP_VERSION,
  name: APP_NAME,
  releaseDate: RELEASE_DATE,
  isBeta: true,
  status: "beta",
};

/**
 * Get formatted version string
 * @example "LocalPDF Engine v1.0.0-beta.1"
 */
export const getVersionString = (): string => {
  return `${APP_NAME} v${APP_VERSION}`;
};

/**
 * Check if current version is beta
 */
export const isBetaVersion = (): boolean => {
  return APP_VERSION.includes("beta");
};
