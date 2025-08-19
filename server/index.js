const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Import and initialize secure environment configuration
const { initializeConfig } = require("./config/environment");
const envConfig = initializeConfig();

// Import database connections
const { connectMySQL } = require("./config/mysql");
const { connectMongoDB } = require("./config/mongodb");

// Import security services
const sessionService = require("./services/sessionService");

// Import Passport configuration
const passport = require("./config/passport");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const accountRoutes = require("./routes/accounts");
const transactionRoutes = require("./routes/transactions");
const transferRoutes = require("./routes/transfers");
const loanRoutes = require("./routes/loans");
const uploadRoutes = require("./routes/uploads");
const notificationRoutes = require("./routes/notifications");
const reportRoutes = require("./routes/reports");
const securityRoutes = require("./routes/security");
const chatRoutes = require("./routes/chat");

// Import middleware
const { authenticateToken } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");

const app = express();
const PORT = process.env.PORT || 5001;

// Environment-based security configuration
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests:
        process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Enhanced headers for development
  crossOriginEmbedderPolicy: false, // Allow localhost development
  crossOriginOpenerPolicy: false, // Allow localhost development
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow localhost development
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
};

// Only enable HSTS in production with HTTPS enabled
if (
  process.env.NODE_ENV === "production" &&
  process.env.ENABLE_HTTPS === "true"
) {
  helmetConfig.hsts = {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  };
  console.log("[SECURITY] HSTS enabled for production with HTTPS");
} else {
  // Explicitly disable HSTS for development or when HTTPS is not enabled
  helmetConfig.hsts = false;
  console.log(
    "[SECURITY] HSTS disabled - not in production or HTTPS not enabled"
  );
}

// Enhanced security middleware
app.use(helmet(helmetConfig));

// Session security for development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    // Add security headers for development
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    // Add request tracking
    console.log(
      `[REQUEST] ${req.method} ${req.path} from ${req.ip} (ID: ${
        req.requestId || "N/A"
      })`
    );

    next();
  });
}

// CORS configuration with enhanced security
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL || "http://localhost:3000"
        : ["http://localhost:3000", "http://127.0.0.1:3000"], // Restrict to localhost only in dev
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Encrypted",
      "x-encrypted",
      "X-XSRF-TOKEN",
      "x-xsrf-token",
    ],
    exposedHeaders: ["X-Total-Count"],
    maxAge: 86400, // 24 hours
  })
);

// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000),
    });
  },
});

// Request signature validation for development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    // Add request timestamp validation
    const requestTime = Date.now();
    const maxRequestAge = 5 * 60 * 1000; // 5 minutes

    // Validate request timestamp if provided
    const requestTimestamp = req.headers["x-request-timestamp"];
    if (requestTimestamp) {
      const age = requestTime - parseInt(requestTimestamp);
      if (age > maxRequestAge) {
        console.log(`[SECURITY] Blocked stale request: ${age}ms old`);
        return res.status(400).json({
          error: "Request too old",
          message: "Request timestamp validation failed",
        });
      }
    }

    // Add request ID for tracking
    req.requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    next();
  });
}

// Development security middleware - block non-localhost requests
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const localhostPatterns = ["127.0.0.1", "::1", "localhost"];

    // Enhanced origin validation
    const origin = req.get("Origin");
    const referer = req.get("Referer");
    const host = req.get("Host");

    // Block non-localhost IPs
    if (!localhostPatterns.some((pattern) => clientIP.includes(pattern))) {
      console.log(`[SECURITY] Blocked non-localhost request from: ${clientIP}`);
      return res.status(403).json({
        error: "Development server only accepts localhost connections",
        message: "Access denied for security reasons",
      });
    }

    // Validate Origin header
    if (
      origin &&
      !origin.includes("localhost") &&
      !origin.includes("127.0.0.1")
    ) {
      console.log(`[SECURITY] Blocked request with invalid origin: ${origin}`);
      return res.status(403).json({
        error: "Invalid origin header",
        message: "Requests must come from localhost",
      });
    }

    // Validate Referer header
    if (
      referer &&
      !referer.includes("localhost") &&
      !referer.includes("127.0.0.1")
    ) {
      console.log(
        `[SECURITY] Blocked request with invalid referer: ${referer}`
      );
      return res.status(403).json({
        error: "Invalid referer header",
        message: "Requests must come from localhost",
      });
    }

    // Validate Host header
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      console.log(`[SECURITY] Blocked request with invalid host: ${host}`);
      return res.status(403).json({
        error: "Invalid host header",
        message: "Requests must come from localhost",
      });
    }

    next();
  });
}

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "development" ? 100 : 1, // More lenient in development
  message: {
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

app.use("/api/", limiter);
app.use("/api/auth", authLimiter);

// Body parsing middleware with size limits
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
    parameterLimit: 1000,
  })
);

// Cookie parser middleware
app.use(cookieParser());

// Passport middleware
app.use(passport.initialize());

// Compression middleware
app.use(
  compression({
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  })
);

// Enhanced logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      skip: (req, res) => res.statusCode < 400,
      stream: {
        write: (message) => {
          console.log(message.trim());
        },
      },
    })
  );
}

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  next();
});

// Static files with security headers
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, path) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
    security: {
      encryption: "enabled",
      twoFactor: "available",
      sessionManagement: "enabled",
      rateLimiting: "active",
    },
  });
});

// Security status endpoint (admin only)
app.get("/security/status", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }

  res.json({
    success: true,
    data: {
      session: {
        timeout: sessionService.sessionTimeout,
        maxSessionsPerUser: sessionService.maxSessionsPerUser,
      },
      rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      },
      hsts: {
        enabled: process.env.NODE_ENV === "production",
        maxAge: process.env.NODE_ENV === "production" ? 31536000 : 0,
      },
    },
  });
});

// Root endpoint - redirect to frontend or show API info
app.get("/", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    // In production, serve the React app
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  } else {
    // In development, redirect to the React dev server
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
  }
});

// Handle favicon requests
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content
});

app.get("/favicon-16x16.png", (req, res) => {
  res.status(204).end(); // No content
});

app.get("/favicon-32x32.png", (req, res) => {
  res.status(204).end(); // No content
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "FSWD Bank API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      accounts: "/api/accounts",
      transactions: "/api/transactions",
      transfers: "/api/transfers",
      loans: "/api/loans",
      uploads: "/api/uploads",
      notifications: "/api/notifications",
      reports: "/api/reports",
      security: "/api/security",
    },
    documentation: "Available endpoints for the banking application",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/accounts", authenticateToken, accountRoutes);
app.use("/api/transactions", authenticateToken, transactionRoutes);
app.use("/api/transfers", authenticateToken, transferRoutes);
app.use("/api/loans", authenticateToken, loanRoutes);
app.use("/api/uploads", authenticateToken, uploadRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/reports", authenticateToken, reportRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/chat", chatRoutes);

// Serve React app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build/index.html"));
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize Socket.IO for real-time features
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Socket.IO connection handling
require("./services/socketService")(io);

// Database connections and server startup
async function startServer() {
  try {
    // Connect to databases
    await connectMySQL();
    await connectMongoDB();

    console.log("[DATABASE] Connections established");

    // Bind to localhost only in development to prevent MITM
    const host =
      process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

    // Start HTTP server with custom encryption
    server.listen(PORT, host, () => {
      console.log(`[SERVER] Running on ${host}:${PORT}`);
      console.log(`[ENCRYPTION] Custom encryption enabled`);
      console.log(`[API] URL: http://localhost:${PORT}/api`);
      console.log(`[HEALTH] Check: http://localhost:${PORT}/health`);
      console.log(`[ENV] Environment: ${process.env.NODE_ENV}`);

      // Security warning for development
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[SECURITY] Development mode - Server bound to localhost only"
        );
        console.log("[SECURITY] Access only via: http://localhost:" + PORT);
      }
    });
  } catch (error) {
    console.error("[ERROR] Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully`);

  try {
    // Close session service
    await sessionService.close();

    // Close server
    server.close(() => {
      console.log("HTTP server closed");
    });

    console.log("Process terminated");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", err);
  gracefulShutdown("unhandledRejection");
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown("uncaughtException");
});

startServer();
