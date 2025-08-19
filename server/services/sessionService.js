const Redis = require('ioredis');
const crypto = require('crypto');

class SessionService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true
    });

    this.sessionPrefix = 'session:';
    this.userSessionsPrefix = 'user_sessions:';
    this.sessionTimeout = 24 * 60 * 60; // 24 hours in seconds
    this.maxSessionsPerUser = 5; // Maximum concurrent sessions per user
  }

  // Create a new session
  async createSession(userId, userData, deviceInfo = {}) {
    try {
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        userId,
        userData,
        deviceInfo,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        ipAddress: deviceInfo.ipAddress || '',
        userAgent: deviceInfo.userAgent || '',
        isActive: true
      };

      // Store session in Redis
      await this.redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        this.sessionTimeout,
        JSON.stringify(sessionData)
      );

      // Add session to user's session list
      await this.redis.zadd(
        `${this.userSessionsPrefix}${userId}`,
        Date.now(),
        sessionId
      );

      // Limit concurrent sessions
      await this.limitUserSessions(userId);

      return sessionId;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  // Get session data
  async getSession(sessionId) {
    try {
      const sessionData = await this.redis.get(`${this.sessionPrefix}${sessionId}`);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      
      // Update last activity
      session.lastActivity = Date.now();
      await this.redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        this.sessionTimeout,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Update session data
  async updateSession(sessionId, updates) {
    try {
      const session = await this.getSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      const updatedSession = { ...session, ...updates, lastActivity: Date.now() };
      
      await this.redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        this.sessionTimeout,
        JSON.stringify(updatedSession)
      );

      return updatedSession;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error('Failed to update session');
    }
  }

  // Delete session
  async deleteSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      
      if (session) {
        // Remove from user's session list
        await this.redis.zrem(`${this.userSessionsPrefix}${session.userId}`, sessionId);
      }

      // Delete session
      await this.redis.del(`${this.sessionPrefix}${sessionId}`);
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // Get all sessions for a user
  async getUserSessions(userId) {
    try {
      const sessionIds = await this.redis.zrange(
        `${this.userSessionsPrefix}${userId}`,
        0,
        -1
      );

      const sessions = [];
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push({ sessionId, ...session });
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  // Revoke all sessions for a user
  async revokeAllUserSessions(userId) {
    try {
      const sessionIds = await this.redis.zrange(
        `${this.userSessionsPrefix}${userId}`,
        0,
        -1
      );

      for (const sessionId of sessionIds) {
        await this.redis.del(`${this.sessionPrefix}${sessionId}`);
      }

      await this.redis.del(`${this.userSessionsPrefix}${userId}`);
      
      return true;
    } catch (error) {
      console.error('Error revoking user sessions:', error);
      return false;
    }
  }

  // Revoke sessions by device
  async revokeSessionsByDevice(userId, deviceInfo) {
    try {
      const sessions = await this.getUserSessions(userId);
      const sessionsToRevoke = sessions.filter(session => 
        session.deviceInfo.userAgent === deviceInfo.userAgent ||
        session.deviceInfo.ipAddress === deviceInfo.ipAddress
      );

      for (const session of sessionsToRevoke) {
        await this.deleteSession(session.sessionId);
      }

      return sessionsToRevoke.length;
    } catch (error) {
      console.error('Error revoking sessions by device:', error);
      return 0;
    }
  }

  // Limit concurrent sessions per user
  async limitUserSessions(userId) {
    try {
      const sessionCount = await this.redis.zcard(`${this.userSessionsPrefix}${userId}`);
      
      if (sessionCount > this.maxSessionsPerUser) {
        // Remove oldest sessions
        const sessionsToRemove = sessionCount - this.maxSessionsPerUser;
        const oldestSessions = await this.redis.zrange(
          `${this.userSessionsPrefix}${userId}`,
          0,
          sessionsToRemove - 1
        );

        for (const sessionId of oldestSessions) {
          await this.deleteSession(sessionId);
        }
      }
    } catch (error) {
      console.error('Error limiting user sessions:', error);
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      const keys = await this.redis.keys(`${this.sessionPrefix}*`);
      let cleanedCount = 0;

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const sessionAge = Date.now() - session.lastActivity;
          
          if (sessionAge > this.sessionTimeout * 1000) {
            const sessionId = key.replace(this.sessionPrefix, '');
            await this.deleteSession(sessionId);
            cleanedCount++;
          }
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired sessions`);
      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      const sessionKeys = await this.redis.keys(`${this.sessionPrefix}*`);
      const totalSessions = sessionKeys.length;
      const userSessionKeys = await this.redis.keys(`${this.userSessionsPrefix}*`);
      const totalUsers = userSessionKeys.length;
      
      return {
        totalSessions,
        totalUsers,
        sessionTimeout: this.sessionTimeout,
        maxSessionsPerUser: this.maxSessionsPerUser
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return null;
    }
  }

  // Check if session is valid
  async isValidSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      return session !== null && session.isActive;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  // Close Redis connection
  async close() {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

// Create singleton instance
const sessionService = new SessionService();

// Cleanup expired sessions every hour
setInterval(() => {
  sessionService.cleanupExpiredSessions();
}, 60 * 60 * 1000);

module.exports = sessionService; 