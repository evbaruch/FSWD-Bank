const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");
const { getMySQLPool } = require("../config/mysql");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const encryptionService = require("../services/encryptionService");

// Configure multer with better error handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads");
    console.log("[MULTER] Upload path:", uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname);
    console.log("[MULTER] Generated filename:", filename);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: (req, file, cb) => {
    console.log("[MULTER] File filter - field:", file.fieldname, "type:", file.mimetype);
    const allowedTypes = (
      process.env.ALLOWED_FILE_TYPES ||
      "image/jpeg,image/png,image/gif,application/pdf"
    ).split(",");
    if (allowedTypes.includes(file.mimetype)) {
      console.log("[MULTER] File type allowed");
      cb(null, true);
    } else {
      console.log("[MULTER] File type rejected");
      cb(new Error("Invalid file type"), false);
    }
  },
});

// Add error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  console.log("[MULTER ERROR]", err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: "File too large" });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: "Unexpected file field" });
    }
  }
  if (err.message === "Invalid file type") {
    return res.status(400).json({ success: false, error: "Invalid file type" });
  }
  next(err);
};

// === Upload document ===
router.post(
  "/document",
  authenticateToken,
  (req, res, next) => {
    console.log("[DEBUG] Request received:");
    console.log("Headers:", req.headers);
    console.log("Body keys:", Object.keys(req.body));
    console.log("Body:", req.body);
    console.log("Files:", req.files);
    console.log("File:", req.file);
    next();
  },
  upload.single("document"),
  (req, res, next) => {
    console.log("[DEBUG] After multer:");
    console.log("Body keys:", Object.keys(req.body));
    console.log("Body:", req.body);
    console.log("File:", req.file);
    next();
  },
  async (req, res) => {
    try {
      console.log("[DEBUG] In main handler:");
      console.log("req.file exists:", !!req.file);
      console.log("req.body:", req.body);

      if (!req.file) {
        console.log("[ERROR] No file uploaded - req.file is null/undefined");
        return res
          .status(400)
          .json(
            encryptionService.encrypt({
              success: false,
              error: "No file uploaded",
            })
          );
      }

      // SHA-256 hash
      const fileBuffer = await fs.readFile(req.file.path);
      const fileHash = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      const pool = getMySQLPool();

      const [result] = await pool.execute(
        `
        INSERT INTO documents 
          (user_id, document_type, file_name, file_path, file_size, mime_type, file_hash, encrypted, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
        [
          req.user.id,
          req.body.documentType || "other", // ENUM default
          req.file.originalname, // store original name
          req.file.path,
          req.file.size,
          req.file.mimetype,
          fileHash,
          false,
        ]
      );

      const response = {
        success: true,
        data: {
          id: result.insertId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          hash: fileHash,
        },
        message: "Document uploaded successfully",
      };

      res.status(201).json(encryptionService.encrypt(response));
    } catch (error) {
      console.error("Error uploading document:", error);
      res
        .status(500)
        .json(
          encryptionService.encrypt({
            success: false,
            error: "Failed to upload document",
          })
        );
    }
  }
);

// === Get user's documents ===
router.get("/documents", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      `
      SELECT 
        id,
        file_name AS fileName,
        file_size AS fileSize,
        mime_type AS mimeType,
        document_type AS documentType,
        status,
        uploaded_at AS uploadedAt,
        reviewed_at AS reviewedAt
      FROM documents
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
      `,
      [req.user.id]
    );

    res.json(encryptionService.encrypt({ success: true, data: rows }));
  } catch (error) {
    console.error("Error fetching documents:", error);
    res
      .status(500)
      .json(
        encryptionService.encrypt({
          success: false,
          error: "Failed to fetch documents",
        })
      );
  }
});

// === Download document ===
router.get(
  "/documents/:documentId/download",
  authenticateToken,
  async (req, res) => {
    try {
      const pool = getMySQLPool();

      const [rows] = await pool.execute(
        `
      SELECT id, file_name, file_path, mime_type
      FROM documents
      WHERE id = ? AND user_id = ?
      `,
        [req.params.documentId, req.user.id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, error: "Document not found" });
      }

      const document = rows[0];

      try {
        await fs.access(document.file_path);
      } catch {
        return res
          .status(404)
          .json({ success: false, error: "File not found on server" });
      }

      res.download(document.file_path, document.file_name);
    } catch (error) {
      console.error("Error downloading document:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to download document" });
    }
  }
);

// === Delete document (hard delete) ===
router.delete("/documents/:documentId", authenticateToken, async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      `
      SELECT id, file_path, status
      FROM documents
      WHERE id = ? AND user_id = ?
      `,
      [req.params.documentId, req.user.id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Document not found" });
    }

    const document = rows[0];

    if (document.status !== "pending") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Only pending documents can be deleted",
        });
    }

    try {
      await fs.unlink(document.file_path); // remove file physically
    } catch (error) {
      console.error("Error deleting file from filesystem:", error);
    }

    await pool.execute("DELETE FROM documents WHERE id = ?", [
      req.params.documentId,
    ]);

    res.json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Error deleting document:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to delete document" });
  }
});

// === Admin: get all documents ===
router.get("/admin/documents", authorizeRoles("admin"), async (req, res) => {
  try {
    const pool = getMySQLPool();

    const [rows] = await pool.execute(
      `
      SELECT 
        d.id,
        d.file_name AS fileName,
        d.file_size AS fileSize,
        d.mime_type AS mimeType,
        d.document_type AS documentType,
        d.status,
        d.uploaded_at AS uploadedAt,
        d.reviewed_at AS reviewedAt,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.email
      FROM documents d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.uploaded_at DESC
      `
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching all documents:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch documents" });
  }
});

// === Admin: update document status ===
router.put(
  "/admin/documents/:documentId/status",
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const pool = getMySQLPool();

      await pool.execute(
        `
        UPDATE documents 
        SET status = ?, reviewed_at = NOW(), reviewed_by = ?
        WHERE id = ?
        `,
        [req.body.status, req.user.id, req.params.documentId]
      );

      res.json({
        success: true,
        message: "Document status updated successfully",
      });
    } catch (error) {
      console.error("Error updating document status:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update document status" });
    }
  }
);

module.exports = router;
