import CryptoJS from "crypto-js";

class FrontendEncryptionService {
  constructor() {
    // Use the same 32-byte key as the backend
    this.secretKey = "12345678901234567890123456789012";
    this.algorithm = "AES";

    console.log("[ENCRYPTION] Frontend service initialized");
  }

  // Check if response is encrypted
  isEncrypted(response) {
    return response && response.encrypted === true && response.data;
  }

  // Decrypt data received from backend
  decrypt(encryptedData) {
    try {
      // Handle direct encrypted object: {encrypted: '...', iv: '...', authTag: '...', timestamp: ...}
      if (encryptedData && encryptedData.encrypted && encryptedData.iv) {
        console.log("[ENCRYPT] Encrypted data structure:", encryptedData);
        const encryptedString = encryptedData.encrypted;
        const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
        const timestamp = encryptedData.timestamp;

        // Validate timestamp (prevent replay attacks)
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        if (timestamp && now - timestamp > maxAge) {
          throw new Error("Encrypted data expired");
        }

        if (!encryptedString) {
          throw new Error("No encrypted data found");
        }

        // Full AES-256-CBC decryption using CryptoJS
        const key = CryptoJS.enc.Utf8.parse(this.secretKey);
        const encrypted = CryptoJS.enc.Base64.parse(encryptedString);

        console.log("[ENCRYPT] Key length:", key.words.length * 4);
        console.log("[ENCRYPT] IV length:", iv.words.length * 4);
        console.log("[ENCRYPT] Encrypted length:", encrypted.words.length * 4);

        // For CryptoJS, we'll use AES encryption with the key
        const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });

        const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
        console.log("[ENCRYPT] Decrypted JSON string:", jsonString);
        console.log("[ENCRYPT] JSON string length:", jsonString.length);

        if (!jsonString) {
          throw new Error("Decryption failed - empty result");
        }

        const result = JSON.parse(jsonString);
        console.log("[ENCRYPT] Successfully decrypted response:", result);
        console.log("[ENCRYPT] Decrypted data type:", typeof result);
        console.log("[ENCRYPT] Decrypted data keys:", Object.keys(result));

        // The result should be the actual user data
        return result;
      }

      // If not encrypted, return as-is
      return encryptedData;
    } catch (error) {
      console.error("Frontend decryption error:", error);
      console.error("Encrypted data structure:", encryptedData);
      throw new Error("Failed to decrypt data");
    }
  }

  // Encrypt data to send to backend
  encrypt(data) {
    try {
      // Use real AES-256-CBC encryption
      const key = CryptoJS.enc.Utf8.parse(this.secretKey);
      const iv = CryptoJS.lib.WordArray.random(16); // 16 bytes = 128 bits

      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      return {
        encrypted: encrypted.toString(),
        iv: iv.toString(CryptoJS.enc.Base64),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Frontend encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  // Handle encrypted response by decrypting the data
  handleEncryptedResponse(response) {
    console.log(
      "[ENCRYPT] handleEncryptedResponse called with response:",
      response
    );
    console.log("[ENCRYPT] Response data type:", typeof response.data);
    console.log(
      "[ENCRYPT] Response data keys:",
      Object.keys(response.data || {})
    );

    // If response is already decrypted, return as-is
    if (!response.data) {
      console.log("[ENCRYPT] No response data, returning as-is");
      return response.data;
    }

    // Check if the entire response is encrypted
    if (response.data.iv && response.data.encrypted) {
      console.log("[ENCRYPT] Decrypting entire encrypted response");
      const decrypted = this.decrypt(response.data);
      console.log("[ENCRYPT] Decrypted entire response:", decrypted);
      console.log("[ENCRYPT] Decrypted response structure:", {
        success: decrypted.success,
        dataLength: decrypted.data?.length,
        dataKeys: decrypted.data?.length > 0 ? Object.keys(decrypted.data[0]) : []
      });
      return decrypted;
    }

    // Check if user data within response is encrypted
    if (response.data.data?.user?.encrypted && response.data.data?.user?.iv) {
      console.log("[ENCRYPT] Found encrypted user data, decrypting...");
      const decryptedUser = this.decrypt(response.data.data.user);
      console.log("[ENCRYPT] Decrypted user data:", decryptedUser);
      
      // Create a new response with decrypted user data
      const decryptedResponse = {
        ...response.data,
        data: {
          ...response.data.data,
          user: decryptedUser
        }
      };
      
      console.log("[ENCRYPT] Final decrypted response:", decryptedResponse);
      return decryptedResponse;
    }

    // Check if data object itself is encrypted
    if (response.data.data?.encrypted && response.data.data?.iv) {
      console.log("[ENCRYPT] Found encrypted data object, decrypting...");
      const decryptedData = this.decrypt(response.data.data);
      console.log("[ENCRYPT] Decrypted data object:", decryptedData);
      
      // Create a new response with decrypted data
      const decryptedResponse = {
        ...response.data,
        data: decryptedData
      };
      
      console.log("[ENCRYPT] Final decrypted response:", decryptedResponse);
      return decryptedResponse;
    }

    console.log("[ENCRYPT] No recognizable encryption format, returning as-is");
    console.log(
      "[ENCRYPT] Response structure:",
      JSON.stringify(response.data, null, 2)
    );
    return response.data;
  }

  // Mask sensitive data for display
  maskData(data, type = "default") {
    if (!data) return "";

    const masks = {
      ssn: (ssn) => `***-**-${ssn.slice(-4)}`,
      account: (account) => `****${account.slice(-4)}`,
      card: (card) => `****-****-****-${card.slice(-4)}`,
      phone: (phone) => `***-***-${phone.slice(-4)}`,
      email: (email) => {
        const [local, domain] = email.split("@");
        return `${local.slice(0, 2)}***@${domain}`;
      },
      default: (data) => `${data.slice(0, 2)}***${data.slice(-2)}`,
    };

    return masks[type] ? masks[type](data) : masks.default(data);
  }

  // Generate a secure random string
  generateSecureToken(length = 32) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Hash data (one-way encryption)
  hash(data) {
    return CryptoJS.SHA256(data).toString();
  }

  // Simple encryption for local storage (not for sensitive data)
  encryptForStorage(data) {
    try {
      return CryptoJS.AES.encrypt(
        JSON.stringify(data),
        this.secretKey
      ).toString();
    } catch (error) {
      console.error("Storage encryption error:", error);
      return null;
    }
  }

  // Simple decryption for local storage
  decryptFromStorage(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (error) {
      console.error("Storage decryption error:", error);
      return null;
    }
  }
}

// Create singleton instance
const frontendEncryptionService = new FrontendEncryptionService();

export default frontendEncryptionService;
