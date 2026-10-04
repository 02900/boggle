import type { NextConfig } from "next";

// Runtime data written by the game server (sessions, scoreboard, streaks). If the
// dev watcher sees these change it recompiles and full-reloads every browser tab,
// which breaks live games and makes e2e tests flaky.
const RUNTIME_DATA_GLOBS = ["**/data/**", "**/scoreboard*.json"];
const RUNTIME_DATA_REGEX = /[\\/]data[\\/]|[\\/]scoreboard[^\\/]*\.json$/;

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.ngrok-free.app'],
  // Lets the e2e dev server use its own build dir so it doesn't fight over
  // .next/ (webpack cache) with a dev server the developer already has running.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  webpack: (config) => {
    // webpack accepts either a single RegExp or an array of globs, not a mix.
    const current = config.watchOptions?.ignored;
    const ignored =
      current instanceof RegExp
        ? new RegExp(`${current.source}|${RUNTIME_DATA_REGEX.source}`, current.flags)
        : [...(Array.isArray(current) ? current : current ? [current] : []), ...RUNTIME_DATA_GLOBS];
    config.watchOptions = { ...config.watchOptions, ignored };
    return config;
  },
};

export default nextConfig;
