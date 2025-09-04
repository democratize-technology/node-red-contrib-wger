/**
 * @fileoverview Cache manager for weight statistics with TTL and smart invalidation
 * @module utils/weight-stats-cache
 * @version 1.0.0
 */

/**
 * Cache entry structure for weight statistics
 * @typedef {Object} CacheEntry
 * @property {Object} data - Cached statistics data
 * @property {number} timestamp - Cache creation timestamp
 * @property {string} cacheKey - Unique cache key
 * @property {number} entryCount - Number of entries used for calculation
 * @property {string} dateRange - Date range identifier
 */

/**
 * Weight statistics cache manager with TTL and smart invalidation.
 * Implements a multi-level caching strategy to minimize API calls and calculations.
 * 
 * @class WeightStatsCache
 */
class WeightStatsCache {
  /**
   * Creates a new WeightStatsCache instance
   * @constructor
   * @param {number} [ttlMinutes=15] - Cache time-to-live in minutes
   * @param {number} [maxCacheSize=100] - Maximum number of cache entries
   */
  constructor(ttlMinutes = 15, maxCacheSize = 100) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.maxCacheSize = maxCacheSize;
    this.hits = 0;
    this.misses = 0;
    
    // Performance metrics
    this.metrics = {
      totalApiCalls: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      averageCalculationTime: 0,
      dataSaved: 0 // KB of data saved from not fetching
    };
  }

  /**
   * Generates a cache key based on request parameters
   * @private
   * @param {string} userId - User identifier
   * @param {string} startDate - Start date for statistics
   * @param {string} endDate - End date for statistics
   * @param {Object} [options={}] - Additional options affecting the cache key
   * @returns {string} Unique cache key
   */
  generateCacheKey(userId, startDate, endDate, options = {}) {
    // Sanitize all inputs to prevent cache poisoning attacks
    const sanitizedUserId = this.sanitizeCacheKeyComponent(userId);
    const sanitizedStartDate = this.sanitizeCacheKeyComponent(startDate);
    const sanitizedEndDate = this.sanitizeCacheKeyComponent(endDate);
    const sanitizedGroupBy = options.groupBy ? this.sanitizeCacheKeyComponent(options.groupBy) : '';
    
    const baseKey = `${sanitizedUserId}_${sanitizedStartDate}_${sanitizedEndDate}`;
    const optionsKey = sanitizedGroupBy ? `_${sanitizedGroupBy}` : '';
    return `weight_stats_${baseKey}${optionsKey}`;
  }

  /**
   * Sanitizes a cache key component to prevent cache poisoning
   * @private
   * @param {string} value - Value to sanitize
   * @returns {string} Sanitized value safe for use in cache keys
   */
  sanitizeCacheKeyComponent(value) {
    // Check for empty/null/undefined before processing
    if (!value && value !== 0) {
      throw new Error('Invalid cache key component');
    }
    
    // Convert to string and remove any characters that could be used for cache poisoning
    const str = String(value)
      // Remove path traversal patterns
      .replace(/\.\./g, '')
      // Remove special characters that could be used for injection
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      // Limit length to prevent overflow attacks
      .substring(0, 100);
    
    // Additional validation: ensure the result is not empty after sanitization
    if (!str) {
      throw new Error('Invalid cache key component');
    }
    
    return str;
  }

  /**
   * Checks if a cache entry is still valid
   * @private
   * @param {CacheEntry} entry - Cache entry to validate
   * @returns {boolean} True if cache entry is valid
   */
  isValid(entry) {
    if (!entry) return false;
    const age = Date.now() - entry.timestamp;
    return age < this.ttl;
  }

  /**
   * Gets cached statistics if available and valid
   * @param {string} userId - User identifier
   * @param {string} startDate - Start date for statistics
   * @param {string} endDate - End date for statistics
   * @param {Object} [options={}] - Additional options
   * @returns {Object|null} Cached statistics or null if not found/invalid
   */
  get(userId, startDate, endDate, options = {}) {
    const key = this.generateCacheKey(userId, startDate, endDate, options);
    const entry = this.cache.get(key);
    
    if (this.isValid(entry)) {
      this.hits++;
      this.metrics.totalCacheHits++;
      return entry.data;
    }
    
    // Remove invalid entry
    if (entry) {
      this.cache.delete(key);
    }
    
    this.misses++;
    this.metrics.totalCacheMisses++;
    return null;
  }

  /**
   * Stores statistics in cache with automatic eviction
   * @param {string} userId - User identifier
   * @param {string} startDate - Start date for statistics
   * @param {string} endDate - End date for statistics
   * @param {Object} data - Statistics data to cache
   * @param {Object} [options={}] - Additional options
   * @param {number} [entryCount] - Number of entries used for calculation
   */
  set(userId, startDate, endDate, data, options = {}, entryCount = 0) {
    const key = this.generateCacheKey(userId, startDate, endDate, options);
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      cacheKey: key,
      entryCount,
      dateRange: `${startDate}_${endDate}`
    });
    
    // Update metrics
    if (entryCount > 0) {
      // Estimate data saved (assuming ~100 bytes per entry)
      this.metrics.dataSaved += (entryCount * 100) / 1024; // Convert to KB
    }
  }

  /**
   * Invalidates cache entries for a specific user or date range
   * @param {string} [userId] - User identifier to invalidate
   * @param {string} [dateRange] - Date range to invalidate
   */
  invalidate(userId = null, dateRange = null) {
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (userId && key.includes(userId)) {
        keysToDelete.push(key);
      } else if (dateRange && entry.dateRange === dateRange) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clears all cached entries
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets cache performance metrics
   * @returns {Object} Cache performance metrics
   */
  getMetrics() {
    const hitRate = this.hits + this.misses > 0 
      ? (this.hits / (this.hits + this.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      currentSize: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: `${hitRate}%`,
      currentHits: this.hits,
      currentMisses: this.misses
    };
  }

  /**
   * Performs smart calculation with caching for partial date ranges
   * @param {Function} fetchFunction - Function to fetch data from API
   * @param {Function} calculateFunction - Function to calculate statistics
   * @param {string} userId - User identifier
   * @param {string} startDate - Start date for statistics
   * @param {string} endDate - End date for statistics
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Calculated or cached statistics
   */
  async getOrCalculate(fetchFunction, calculateFunction, userId, startDate, endDate, options = {}) {
    const startTime = Date.now();
    
    // Check cache first
    const cached = this.get(userId, startDate, endDate, options);
    if (cached) {
      // Mark as from cache
      if (cached.performance) {
        cached.performance.fromCache = true;
      }
      return cached;
    }
    
    // Fetch and calculate
    this.metrics.totalApiCalls++;
    const data = await fetchFunction(startDate, endDate, options);
    const stats = calculateFunction(data);
    
    // Store in cache
    const entryCount = data.results ? data.results.length : 0;
    this.set(userId, startDate, endDate, stats, options, entryCount);
    
    // Update average calculation time
    const calcTime = Date.now() - startTime;
    this.metrics.averageCalculationTime = 
      (this.metrics.averageCalculationTime + calcTime) / 2;
    
    // Mark as not from cache
    if (stats.performance) {
      stats.performance.fromCache = false;
    }
    
    return stats;
  }
}

// Singleton instance for shared caching across all weight nodes
let sharedCache = null;

/**
 * Gets or creates the shared cache instance
 * @param {Object} [config={}] - Cache configuration
 * @returns {WeightStatsCache} Shared cache instance
 */
function getSharedCache(config = {}) {
  if (!sharedCache) {
    sharedCache = new WeightStatsCache(
      config.ttlMinutes || 15,
      config.maxCacheSize || 100
    );
  }
  return sharedCache;
}

/**
 * Resets the shared cache instance
 */
function resetSharedCache() {
  if (sharedCache) {
    sharedCache.clear();
  }
  sharedCache = null;
}

module.exports = {
  WeightStatsCache,
  getSharedCache,
  resetSharedCache
};