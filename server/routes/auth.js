const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { getMySQLPool } = require("../config/mysql");
const {
  sendWelcomeEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");
const { createNotification } = require("../services/notificationService");
const { config: envConfig } = require("../config/environment");
const { authenticateToken } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
  body("phone")
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage("Please provide a valid phone number"),
  body("dateOfBirth")
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),
  body("ssn")
    .isLength({ min: 9, max: 11 })
    .withMessage("SSN must be 9-11 characters"),
  body("address")
    .isLength({ min: 10 })
    .withMessage("Address must be at least 10 characters"),
  body("city")
    .trim()
    .isLength({ min: 2 })
    .withMessage("City must be at least 2 characters"),
  body("state")
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage("State must be 2 characters"),
  body("zipCode")
    .matches(/^\d{5}(-\d{4})?$/)
    .withMessage("Please provide a valid ZIP code"),
];

const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Register new user
router.post("/register", async (req, res) => {
  try {
    // Handle encrypted request if present
    let userData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[REGISTER] Decrypting encrypted request");
      userData = encryptionService.decrypt(req.body);
      console.log("[REGISTER] Decrypted user data:", userData);
    }

    // Validate only the minimal required fields for initial registration
    const validationErrors = [];
    if (
      !userData.firstName ||
      userData.firstName.trim().length < 2 ||
      userData.firstName.trim().length > 50
    ) {
      validationErrors.push({
        field: "firstName",
        message: "First name must be between 2 and 50 characters",
      });
    }
    if (
      !userData.lastName ||
      userData.lastName.trim().length < 2 ||
      userData.lastName.trim().length > 50
    ) {
      validationErrors.push({
        field: "lastName",
        message: "Last name must be between 2 and 50 characters",
      });
    }
    if (!userData.email || !userData.email.includes("@")) {
      validationErrors.push({
        field: "email",
        message: "Please provide a valid email",
      });
    }
    if (!userData.password || userData.password.length < 8) {
      validationErrors.push({
        field: "password",
        message: "Password must be at least 8 characters long",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      phone = null,
      dateOfBirth = null,
      ssn = null,
      address = null,
      city = null,
      state = null,
      zipCode = null,
    } = userData;

    const pool = getMySQLPool();

    // Check if user already exists
    console.log("[REGISTER] Checking if user exists:", { email, ssn });
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? OR ssn = ?",
      [email, ssn]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email or SSN already exists",
      });
    }

    // Hash password
    console.log("[REGISTER] Hashing password");
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    console.log("[REGISTER] Inserting user into DB");
    let result;
    try {
      [result] = await pool.execute(
        `INSERT INTO users (
          first_name, last_name, email, password, phone, date_of_birth, 
          ssn, address, city, state, zip_code, role, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'customer', 'pending', NOW())`,
        [
          firstName,
          lastName,
          email,
          hashedPassword,
          phone,
          dateOfBirth,
          ssn,
          address,
          city,
          state,
          zipCode,
        ]
      );
    } catch (dbError) {
      console.error("[REGISTER] DB insert error:", dbError);
      if (dbError && dbError.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Registration failed. Please try again.",
      });
    }

    const userId = result.insertId;
    console.log("[REGISTER] User created with id:", userId);

    // Create notification for admin approval
    await createNotification({
      userId: null, // For admin notification
      type: "new_user_registration",
      title: "New User Registration",
      message: `New user ${firstName} ${lastName} (${email}) has registered and requires approval.`,
      data: { userId, email, firstName, lastName },
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, firstName).catch((error) => {
      console.warn("Failed to send welcome email:", error);
    });

    // Create response data
    const responseData = {
      success: true,
      message: "Registration successful! Please wait for admin approval.",
      data: {
        userId,
        email,
        firstName,
        lastName,
      },
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[REGISTER] Encrypting response");
      const encryptedData = encryptionService.encrypt(responseData.data);
      responseData.encrypted = true;
      responseData.data = encryptedData;
      console.log("[REGISTER] Response encrypted");
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    // Handle encrypted request if present
    let credentials = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[LOGIN] Decrypting encrypted request");
      credentials = encryptionService.decrypt(req.body);
      console.log("[LOGIN] Decrypted credentials:", credentials);
    }

    // Manually validate credentials after decryption
    const validationErrors = [];

    if (!credentials.email || !credentials.email.trim()) {
      validationErrors.push({
        field: "email",
        message: "Please provide a valid email",
      });
    } else if (!credentials.email.includes("@")) {
      validationErrors.push({
        field: "email",
        message: "Please provide a valid email",
      });
    }

    if (!credentials.password || !credentials.password.trim()) {
      validationErrors.push({
        field: "password",
        message: "Password is required",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    const { email, password } = credentials;

    const pool = getMySQLPool();

    // Find user
    const [users] = await pool.execute(
      "SELECT id, email, password, first_name, last_name, role, status FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const user = users[0];

    // Check if account is active
    if (user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    await pool.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    // Generate JWT token with appropriate expiration
    const tokenExpiration = envConfig.JWT_REFRESH_ENABLED
      ? envConfig.JWT_EXPIRES_IN
      : envConfig.JWT_LONG_EXPIRES_IN;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      envConfig.JWT_SECRET,
      { expiresIn: tokenExpiration }
    );

    let refreshToken = null;

    // Only generate refresh token if refresh is enabled
    if (envConfig.JWT_REFRESH_ENABLED) {
      refreshToken = jwt.sign(
        { userId: user.id },
        envConfig.JWT_REFRESH_SECRET,
        { expiresIn: envConfig.JWT_REFRESH_EXPIRES_IN }
      );

      // Store refresh token
      await pool.execute("UPDATE users SET refresh_token = ? WHERE id = ?", [
        refreshToken,
        user.id,
      ]);
    }

    // Set httpOnly cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };

    // Set access token cookie
    res.cookie("accessToken", token, {
      ...cookieOptions,
      maxAge: envConfig.JWT_REFRESH_ENABLED
        ? 15 * 60 * 1000 // 15 minutes for short-lived tokens
        : 24 * 60 * 60 * 1000, // 24 hours for long-lived tokens
    });

    // Set refresh token cookie if enabled
    if (envConfig.JWT_REFRESH_ENABLED && refreshToken) {
      res.cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    // Create response data
    const responseData = {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
        },
      },
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[LOGIN] Encrypting response");
      const encryptedUser = encryptionService.encrypt(responseData.data.user);
      responseData.encrypted = true;
      responseData.data.user = encryptedUser;
      console.log("[LOGIN] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    // Check if refresh tokens are enabled
    if (!envConfig.JWT_REFRESH_ENABLED) {
      return res.status(400).json({
        success: false,
        message: "Refresh tokens are disabled. Please log in again.",
      });
    }

    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    const oldAccessToken = req.cookies.accessToken;
    console.log("Refresh endpoint: received refreshToken:", refreshToken);
    console.log("Refresh endpoint: received old accessToken:", oldAccessToken);

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, envConfig.JWT_REFRESH_SECRET);

    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, email, role, refresh_token FROM users WHERE id = ? AND status = "active"',
      [decoded.userId]
    );

    if (users.length === 0 || users[0].refresh_token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = users[0];

    // Generate new access token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      envConfig.JWT_SECRET,
      { expiresIn: envConfig.JWT_EXPIRES_IN }
    );

    // Set new access token as httpOnly cookie
    res.cookie("accessToken", newToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
    console.log("Refresh endpoint: set new accessToken:", newToken);

    // Create response data
    const responseData = {
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[REFRESH] Encrypting response");
      const encryptedUser = encryptionService.encrypt(responseData.data.user);
      responseData.encrypted = true;
      responseData.data.user = encryptedUser;
      console.log("[REFRESH] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

// Verify token (get current user)
router.get("/verify", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, email, first_name as firstName, last_name as lastName, role, status FROM users WHERE id = ? AND status = "active"',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const user = users[0];

    // Create response data
    const responseData = {
      success: true,
      data: {
        user,
      },
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[VERIFY] Encrypting response");
      const encryptedUser = encryptionService.encrypt(responseData.data.user);
      responseData.encrypted = true;
      responseData.data.user = encryptedUser;
      console.log("[VERIFY] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Token verification failed",
    });
  }
});

// Logout
router.post("/logout", async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    // Only invalidate refresh token if refresh is enabled and token provided
    if (envConfig.JWT_REFRESH_ENABLED && refreshToken) {
      const pool = getMySQLPool();
      await pool.execute(
        "UPDATE users SET refresh_token = NULL WHERE refresh_token = ?",
        [refreshToken]
      );
    }

    // Clear cookies with same options used when setting them
    const cookieOptions = {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    };
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    // Handle encrypted request if present
    let requestData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[FORGOT-PASSWORD] Decrypting encrypted request");
      requestData = encryptionService.decrypt(req.body);
      console.log("[FORGOT-PASSWORD] Decrypted request data:", requestData);
    }

    // Manually validate email
    if (!requestData.email || !requestData.email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    const { email } = requestData;

    const pool = getMySQLPool();
    const [users] = await pool.execute(
      'SELECT id, email, first_name FROM users WHERE email = ? AND status = "active"',
      [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message:
          "If an account with this email exists, a password reset link has been sent.",
      });
    }

    const user = users[0];

    // Generate reset token
    const resetToken = jwt.sign({ userId: user.id }, envConfig.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Store reset token in database
    await pool.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?",
      [resetToken, user.id]
    );

    // Send password reset email
    await sendPasswordResetEmail(email, user.first_name, resetToken);

    // Create response data
    const responseData = {
      success: true,
      message:
        "If an account with this email exists, a password reset link has been sent.",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[FORGOT-PASSWORD] Encrypting response");
      responseData.encrypted = true;
      console.log("[FORGOT-PASSWORD] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  try {
    // Handle encrypted request if present
    let requestData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[RESET-PASSWORD] Decrypting encrypted request");
      requestData = encryptionService.decrypt(req.body);
      console.log("[RESET-PASSWORD] Decrypted request data:", requestData);
    }

    // Manually validate request data
    const validationErrors = [];

    if (!requestData.token || !requestData.token.trim()) {
      validationErrors.push({
        field: "token",
        message: "Reset token is required",
      });
    }

    if (!requestData.password || requestData.password.length < 8) {
      validationErrors.push({
        field: "password",
        message: "Password must be at least 8 characters long",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    const { token, password } = requestData;

    // Verify token
    const decoded = jwt.verify(token, envConfig.JWT_SECRET);

    const pool = getMySQLPool();
    const [users] = await pool.execute(
      "SELECT id FROM users WHERE id = ? AND reset_token = ? AND reset_token_expires > NOW()",
      [decoded.userId, token]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await pool.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, decoded.userId]
    );

    // Create response data
    const responseData = {
      success: true,
      message: "Password reset successful",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[RESET-PASSWORD] Encrypting response");
      responseData.encrypted = true;
      console.log("[RESET-PASSWORD] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
});

// Google OAuth Routes

// Initiate Google OAuth login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Check if account is active
      if (user.status !== "active") {
        return res.redirect(
          `${process.env.CLIENT_URL}/login?error=account_inactive`
        );
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
      );

      // Store refresh token
      const pool = getMySQLPool();
      await pool.execute(
        "UPDATE users SET refresh_token = ?, last_login = NOW() WHERE id = ?",
        [refreshToken, user.id]
      );

      // Redirect to frontend with tokens
      const redirectUrl = `${
        process.env.CLIENT_URL
      }/auth/callback?token=${token}&refreshToken=${refreshToken}&user=${encodeURIComponent(
        JSON.stringify({
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          status: user.status,
        })
      )}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }
);

// Get Google OAuth URL for frontend
router.get("/google/url", (req, res) => {
  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent("profile email")}&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.json({
    success: true,
    data: {
      url: googleAuthUrl,
    },
  });
});

module.exports = router;
