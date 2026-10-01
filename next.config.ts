import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma ships native engines; keep it external so the server build does not
  // try to bundle the query engine into the route chunks.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
