/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DATA_SOURCE: process.env.DATA_SOURCE,
    DATA_DIR: process.env.DATA_DIR,
  }
};
module.exports = nextConfig; 