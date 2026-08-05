import { execFileSync } from "node:child_process";

export default function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  const password = process.env.E2E_PASSWORD;

  if (!databaseUrl || !password) {
    throw new Error("E2E_DATABASE_URL and E2E_PASSWORD are required for the E2E suite");
  }

  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    SEED_PASSWORD: password,
  };

  execFileSync("npx", ["prisma", "migrate", "deploy"], { env, stdio: "inherit" });
  execFileSync("npm", ["run", "db:seed"], { env, stdio: "inherit" });
}
