const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { getMySQLPool } = require("../config/mysql");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

// Get all users (admin only)
router.get("/", authorizeRoles("admin"), async (req, res) => {
  try {
    console.log("[GET-USERS] Request received, headers:", req.headers);

    const pool = getMySQLPool();

    const [rows] = await pool.execute(`
      SELECT 
        id, 
        email, 
        first_name as firstName, 
        last_name as lastName, 
        role, 
        status, 
        created_at as createdAt, 
        updated_at as updatedAt,
        last_login as lastLoginAt
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log("[GET-USERS] Found users:", rows.length);
    console.log("[GET-USERS] First user sample:", rows[0]);

    // Create response data
    const responseData = {
      success: true,
      data: rows,
    };

    console.log("[GET-USERS] Response data structure:", {
      success: responseData.success,
      dataLength: responseData.data.length,
      dataKeys: responseData.data.length > 0 ? Object.keys(responseData.data[0]) : []
    });

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[GET-USERS] Encrypting response");
      const encryptedResponse = encryptionService.encrypt(responseData);
      console.log("[GET-USERS] Response encrypted, sending encrypted data");
      console.log("[GET-USERS] Encrypted response structure:", {
        encrypted: !!encryptedResponse.encrypted,
        iv: !!encryptedResponse.iv,
        timestamp: !!encryptedResponse.timestamp
      });
      res.json(encryptedResponse);
    } else {
      console.log(
        "[GET-USERS] No encryption requested, sending plain response"
      );
      res.json(responseData);
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
});

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      "SELECT id, email, first_name as firstName, last_name as lastName, role, status, created_at as createdAt, updated_at as updatedAt, last_login as lastLoginAt FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    // Handle encrypted request if present
    let profileData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[UPDATE-PROFILE] Decrypting encrypted request");
      profileData = encryptionService.decrypt(req.body);
      console.log("[UPDATE-PROFILE] Decrypted profile data:", profileData);
    }

    // Manually validate profile data
    const validationErrors = [];

    if (
      profileData.firstName &&
      (profileData.firstName.length < 2 || profileData.firstName.length > 50)
    ) {
      validationErrors.push({
        field: "firstName",
        message: "First name must be between 2 and 50 characters",
      });
    }

    if (
      profileData.lastName &&
      (profileData.lastName.length < 2 || profileData.lastName.length > 50)
    ) {
      validationErrors.push({
        field: "lastName",
        message: "Last name must be between 2 and 50 characters",
      });
    }

    if (profileData.email && !profileData.email.includes("@")) {
      validationErrors.push({
        field: "email",
        message: "Please provide a valid email",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    const pool = getMySQLPool();

    const updateFields = [];
    const updateValues = [];

    if (profileData.firstName) {
      updateFields.push("first_name = ?");
      updateValues.push(profileData.firstName);
    }

    if (profileData.lastName) {
      updateFields.push("last_name = ?");
      updateValues.push(profileData.lastName);
    }

    if (profileData.email) {
      // Check if email is already taken
      const [existingUser] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [profileData.email, req.user.id]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Email is already in use",
        });
      }

      updateFields.push("email = ?");
      updateValues.push(profileData.email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    updateValues.push(req.user.id);

    await pool.execute(
      `UPDATE users SET ${updateFields.join(
        ", "
      )}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    // Fetch updated user
    const [rows] = await pool.execute(
      "SELECT id, email, first_name as firstName, last_name as lastName, role, status, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?",
      [req.user.id]
    );

    // Create response data
    const responseData = {
      success: true,
      data: rows[0],
      message: "Profile updated successfully",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[UPDATE-PROFILE] Encrypting response");
      const encryptedData = encryptionService.encrypt(responseData.data);
      responseData.encrypted = true;
      responseData.data = encryptedData;
      console.log("[UPDATE-PROFILE] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
});

// Change password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    // Handle encrypted request if present
    let passwordData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[CHANGE-PASSWORD] Decrypting encrypted request");
      passwordData = encryptionService.decrypt(req.body);
      console.log("[CHANGE-PASSWORD] Decrypted password data:", passwordData);
    }

    // Manually validate password data
    const validationErrors = [];

    if (!passwordData.currentPassword || !passwordData.currentPassword.trim()) {
      validationErrors.push({
        field: "currentPassword",
        message: "Current password is required",
      });
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      validationErrors.push({
        field: "newPassword",
        message: "New password must be at least 6 characters",
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validationErrors,
      });
    }

    const pool = getMySQLPool();

    // Get current password hash
    const [rows] = await pool.execute(
      "SELECT password FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      passwordData.currentPassword,
      rows[0].password
    );
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(passwordData.newPassword, 12);

    // Update password
    await pool.execute(
      "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashedPassword, req.user.id]
    );

    // Create response data
    const responseData = {
      success: true,
      message: "Password changed successfully",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[CHANGE-PASSWORD] Encrypting response");
      responseData.encrypted = true;
      console.log("[CHANGE-PASSWORD] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change password",
    });
  }
});

// Update user status (admin only)
router.put("/:user_id/status", authorizeRoles("admin"), async (req, res) => {
  try {
    // Handle encrypted request if present
    let statusData = req.body;
    if (
      req.headers["x-encrypted"] === "true" &&
      req.body &&
      req.body.encrypted
    ) {
      console.log("[UPDATE-USER-STATUS] Decrypting encrypted request");
      statusData = encryptionService.decrypt(req.body);
      console.log("[UPDATE-USER-STATUS] Decrypted status data:", statusData);
    }

    // Manual validation
    const validStatuses = ["active", "pending", "suspended", "closed"];
    if (!statusData.status || !validStatuses.includes(statusData.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const pool = getMySQLPool();

    // Check if user exists
    const [existingUser] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ?",
      [req.params.user_id]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Prevent admin from changing other admin statuses
    if (
      existingUser[0].role === "admin" &&
      req.user.id !== parseInt(req.params.user_id)
    ) {
      return res.status(403).json({
        success: false,
        error: "Cannot change status of other admin users",
      });
    }

    await pool.execute(
      "UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?",
      [statusData.status, req.params.user_id]
    );

    // Create notification for user
    const statusMessages = {
      active:
        "Your account has been activated. You can now access all features.",
      pending:
        "Your account is pending approval. Please wait for admin review.",
      suspended: "Your account has been suspended. Please contact support.",
      inactive: "Your account has been deactivated. Please contact support.",
    };

    // Create notification for the user whose status was changed
    await pool.execute(
      `
      INSERT INTO notifications (user_id, type, title, message, created_at)
      VALUES (?, 'status_change', 'Account Status Updated', ?, NOW())
    `,
      [req.params.user_id, statusMessages[statusData.status]]
    );

    // Create response data
    const responseData = {
      success: true,
      message: "User status updated successfully",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[UPDATE-USER-STATUS] Encrypting response");
      responseData.encrypted = true;
      console.log("[UPDATE-USER-STATUS] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update user status",
    });
  }
});

// Delete user (admin only)
router.delete("/:user_id", authorizeRoles("admin"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    // Check if user exists
    const [rows] = await pool.execute(
      "SELECT id, role FROM users WHERE id = ?",
      [req.params.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Prevent admin from deleting other admin accounts
    if (
      rows[0].role === "admin" &&
      req.user.id !== parseInt(req.params.user_id)
    ) {
      return res.status(403).json({
        success: false,
        error: "Cannot delete other admin accounts",
      });
    }

    // Soft delete - update status to closed
    await pool.execute(
      'UPDATE users SET status = "closed", updated_at = NOW() WHERE id = ?',
      [req.params.user_id]
    );

    // walk through the entire db and sign

    // Create response data
    const responseData = {
      success: true,
      message: "User deleted successfully",
    };

    // Encrypt response if requested
    if (req.headers["x-encrypted"] === "true") {
      console.log("[DELETE-USER] Encrypting response");
      responseData.encrypted = true;
      console.log("[DELETE-USER] Response encrypted");
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete user",
    });
  }
});

module.exports = router;
