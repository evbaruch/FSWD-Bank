const jwt = require("jsonwebtoken");
const { getMySQLPool } = require("../config/mysql");
const { config: envConfig } = require("../config/environment");

const authenticateToken = async (req, res, next) => {
  try {
    // Try to get token from cookie first, then from Authorization header as fallback
    let token = req.cookies.accessToken;

    if (!token) {
      const authHeader = req.headers["authorization"];
      token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, envConfig.JWT_SECRET);

    // Get user from database
    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, email, role, status, last_login FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const user = users[0];

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    } else {
      console.error("Auth middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Authentication error",
      });
    }
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You don't have permission to perform this action",
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
};
