function validateEnv(env = process.env) {
  const missing = ["URI", "JWT_SECRET"].filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (!/^mongodb(?:\+srv)?:\/\//.test(env.URI)) throw new Error("URI must be a MongoDB connection string");
  const port = Number(env.PORT || 1001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535");
  return { port };
}

module.exports = { validateEnv };
