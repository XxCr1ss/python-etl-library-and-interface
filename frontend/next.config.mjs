/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only the audit build enables React's production timing fields.
  reactProductionProfiling: process.env.ETL_E2E_PROFILE === "1",
};

export default nextConfig;
