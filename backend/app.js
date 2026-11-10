const { startupError, startupMessage } = require('./utils/startupErrors');
require("dotenv").config({ path: require("path").join(__dirname, ".env"), quiet: true });
const express = require("express");
const { validateEnv } = require("./config/env");
const connectDatabase = require("./conn/conn");
const cors = require("cors");
const passport = require("passport");
const mongoose = require("mongoose");
const { frontendOrigins, validateDeployment } = require("./config/deployment");
const { drainBackgroundTasks } = require("./utils/backgroundTasks");

const contactRoutes = require("./routes/contact");
const app = express();

// middlewares
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0) || false);
app.use(cors({ origin(origin, callback) {
  callback(null, !origin || frontendOrigins().includes(origin));
}, credentials: true }));
app.get('/healthz', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).set('Cache-Control', 'no-store').json({ status: ready ? 'ready' : 'unavailable' });
});
app.use(require('./middleware/apiMessages').apiMessages);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// routes
const bookRoutes = require("./routes/book");
const userRoutes = require("./routes/user");
const blogRoutes = require("./routes/blog");
const favouriteRoutes = require("./routes/favourite");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");

// passport
require("./config/passport");
app.use(passport.initialize());

// 🔥 two book routes
app.use("/api/v1", bookRoutes);        // ✅ old structure
app.use("/api/v1/books", bookRoutes);  // ✅ new structure

// rest
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/favourites", favouriteRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/blog", blogRoutes);

//contacct
app.use("/api/contact", contactRoutes);

// test
app.get("/api/v1/test", (req, res) => {
  res.send("API OK");
});

// Keep the existing flat URLs as aliases for older clients.
app.use("/api/v1", favouriteRoutes);
app.use("/api/v1", cartRoutes);
app.use("/api/v1", orderRoutes);

// Do not let Express log parser errors containing recovery request bodies.
app.use((error, req, res, next) => {
  if (!/^\/api\/v1\/user\/(?:forgot-password|reset-password)(?:\/|$)/.test(req.path)) return next(error);
  const status = [400, 413].includes(error.status) ? error.status : 503;
  return res.status(status).set('Cache-Control', 'no-store').json({
    message: status === 413 ? 'Request is too large.' : status === 400 ? 'Invalid request.' : 'Password recovery is unavailable. Please try again later.',
  });
});

async function start() {
  const { port } = validateEnv();
  app.set("trust proxy", validateDeployment().trustProxy);
  try {
    await connectDatabase();
  } catch {
    throw startupError("STARTUP_DATABASE", "MongoDB connection failed. Check URI, database credentials and network access.");
  }
  return app.listen(port, () => console.log(`Server running on port ${port}`));
}

if (require.main === module) {
  start().then((server) => {
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      // Best effort on deploy/restart; this is not a durable mail queue.
      const deadline = setTimeout(() => process.exit(1), 20000);
      server.close(async () => {
        try {
          await drainBackgroundTasks();
          await mongoose.disconnect();
        } catch {
          console.error('Backend shutdown could not complete cleanly.');
          process.exitCode = 1;
        } finally { clearTimeout(deadline); }
      });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }).catch((error) => {
    console.error(startupMessage(error));
    process.exitCode = 1;
  });
}

module.exports = { app, start };
