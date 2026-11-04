import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
  const { migrate } = await import("../src/db");
  migrate();
  const command = process.argv[2];
  if (command === "seed") {
    const { seed } = await import("../src/server/seed");
    seed();
    console.log("Seed complete (existing content preserved).");
  } else if (command === "bootstrap") {
    const { bootstrap } = await import("../src/server/auth");
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!email || !password)
      throw new Error(
        "Set private ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD environment variables",
      );
    bootstrap(email, password);
    console.log(
      "Maintainer created. Remove bootstrap values from your environment.",
    );
  } else if (command === "migrate") console.log("Migrations complete.");
  else throw new Error("Expected migrate, seed, or bootstrap");
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Database command failed");
  process.exitCode = 1;
});
