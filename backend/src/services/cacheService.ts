import redisService from './redisService';

// Cache TTL values (in seconds)
const CACHE_TTL = {
  CUSTOMER: 300, // 5 minutes
  STATS: 60, // 1 minute
  CONVERSATION: 1800, // 30 minutes
  KNOWLEDGE_FILES: 300, // 5 minutes
};

class CacheService {
  // Customer caching
  async getCachedCustomer(customerId: string): Promise<any | null> {
    return await redisService.getJSON(`customer:${customerId}`);
  }

  async setCachedCustomer(customerId: string, customer: any): Promise<void> {
    await redisService.setJSON(`customer:${customerId}`, customer, CACHE_TTL.CUSTOMER);
  }

  async invalidateCustomer(customerId: string): Promise<void> {
    await redisService.del(`customer:${customerId}`);
  }

  // Stats caching
  async getCachedStats(customerId: string): Promise<any | null> {
    return await redisService.getJSON(`stats:${customerId}`);
  }

  async setCachedStats(customerId: string, stats: any): Promise<void> {
    await redisService.setJSON(`stats:${customerId}`, stats, CACHE_TTL.STATS);
  }

  async invalidateStats(customerId: string): Promise<void> {
    await redisService.del(`stats:${customerId}`);
  }

  // Conversation caching (active sessions)
  async getCachedConversation(sessionId: string): Promise<any | null> {
    return await redisService.getJSON(`conversation:${sessionId}`);
  }

  async setCachedConversation(sessionId: string, conversation: any): Promise<void> {
    await redisService.setJSON(`conversation:${sessionId}`, conversation, CACHE_TTL.CONVERSATION);
  }

  async invalidateConversation(sessionId: string): Promise<void> {
    await redisService.del(`conversation:${sessionId}`);
  }

  // Knowledge files caching
  async getCachedKnowledgeFiles(customerId: string): Promise<any | null> {
    return await redisService.getJSON(`knowledge:${customerId}`);
  }

  async setCachedKnowledgeFiles(customerId: string, files: any): Promise<void> {
    await redisService.setJSON(`knowledge:${customerId}`, files, CACHE_TTL.KNOWLEDGE_FILES);
  }

  async invalidateKnowledgeFiles(customerId: string): Promise<void> {
    await redisService.del(`knowledge:${customerId}`);
  }

  // Bulk invalidation for a customer
  async invalidateAllCustomerCache(customerId: string): Promise<void> {
    await Promise.all([
      redisService.invalidatePattern(`customer:${customerId}*`),
      redisService.invalidatePattern(`stats:${customerId}*`),
      redisService.invalidatePattern(`knowledge:${customerId}*`),
    ]);
  }

  // Rate limiting helper
  async checkCustomerRateLimit(customerId: string, maxRequests: number = 60, windowSeconds: number = 60): Promise<boolean> {
    const key = `ratelimit:customer:${customerId}`;
    return await redisService.checkRateLimit(key, maxRequests, windowSeconds);
  }

  async checkGlobalRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    return await redisService.checkRateLimit(`ratelimit:global:${key}`, maxRequests, windowSeconds);
  }
}

const cacheService = new CacheService();

export default cacheService;
