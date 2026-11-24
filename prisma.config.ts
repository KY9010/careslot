import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations need a direct (unpooled) connection. In production (Neon on Vercel)
// that is DATABASE_URL_UNPOOLED; locally DATABASE_URL is already direct.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
});
