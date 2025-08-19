const crypto = require("crypto");

// Use environment variables or generate once and store
const secretKey = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex")
  : crypto.randomBytes(32);
const iv = process.env.ENCRYPTION_IV
  ? Buffer.from(process.env.ENCRYPTION_IV, "hex")
  : crypto.randomBytes(16);

const algorithm = "aes-256-cbc";

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

const decrypt = (encrypted) => {
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// Export the key and IV (for initial setup)
module.exports = {
  encrypt,
  decrypt,
  algorithm,
  keyLength: secretKey.length * 8,
  secretKey: secretKey.toString("hex"),
  iv: iv.toString("hex"),
};
