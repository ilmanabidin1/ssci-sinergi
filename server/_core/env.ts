export const ENV = {
  appId: process.env.VITE_APP_ID ?? "ssci-pilot",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterBaseUrl:
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  pilotAdminEmail: process.env.PILOT_ADMIN_EMAIL ?? "",
  pilotAdminPassword: process.env.PILOT_ADMIN_PASSWORD ?? "",
};

export function validateRuntimeEnvironment() {
  if (!ENV.isProduction) return;

  const missing = [
    ["DATABASE_URL", ENV.databaseUrl],
    ["JWT_SECRET", ENV.cookieSecret],
    ["PILOT_ADMIN_EMAIL", ENV.pilotAdminEmail],
    ["PILOT_ADMIN_PASSWORD", ENV.pilotAdminPassword],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  new URL(ENV.databaseUrl);
  if (ENV.oAuthServerUrl) new URL(ENV.oAuthServerUrl);
  new URL(ENV.openRouterBaseUrl);
}
