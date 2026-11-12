/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Headless Chromium for server-side PDF export ships its own binary; keep it out of the bundle.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The Chromium binary is read from disk at runtime, so file tracing must be told to ship it.
  outputFileTracingIncludes: { "/api/report-pdf": ["./node_modules/@sparticuz/chromium/bin/**"] },
};

export default nextConfig;
