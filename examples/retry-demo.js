/**
 * Demonstration of retry mechanism in WgerApiClient
 * This script shows how the retry policy and circuit breaker work
 */

const WgerApiClient = require('../utils/api-client');

async function demonstrateRetryMechanism() {
  console.log('=== WgerApiClient Retry Mechanism Demo ===\n');

  // 1. Basic client without retry (original behavior)
  console.log('1. Basic client (no retry):');
  const basicClient = new WgerApiClient('https://httpstat.us', {});
  console.log('   - No retry policy or circuit breaker configured');
  console.log('   - Fails immediately on errors\n');

  // 2. Client with retry policy only
  console.log('2. Client with retry policy:');
  const retryClient = new WgerApiClient('https://httpstat.us', {}, {
    retry: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterRatio: 0.1
    }
  });
  console.log('   - Max 3 attempts with exponential backoff');
  console.log('   - Retries on 5xx errors, timeouts, and network failures');
  console.log('   - Does not retry on 4xx errors (except 429)\n');

  // 3. Client with circuit breaker only
  console.log('3. Client with circuit breaker:');
  const circuitClient = new WgerApiClient('https://httpstat.us', {}, {
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      halfOpenMaxCalls: 3
    }
  });
  console.log('   - Opens circuit after 5 consecutive failures');
  console.log('   - Fails fast when circuit is open');
  console.log('   - Automatically attempts reset after 60 seconds\n');

  // 4. Client with both retry and circuit breaker
  console.log('4. Client with full resilience (retry + circuit breaker):');
  const resilientClient = new WgerApiClient('https://httpstat.us', {}, {
    retry: {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 10000
    },
    circuitBreaker: {
      failureThreshold: 10,
      resetTimeoutMs: 30000
    }
  });
  console.log('   - Retries individual requests up to 3 times');
  console.log('   - Opens circuit after 10 total failures');
  console.log('   - Provides comprehensive error recovery\n');

  // 5. Demonstrate error classification
  console.log('5. Error classification for retries:');
  console.log('   Retryable errors:');
  console.log('   - 429 (Rate Limited)');
  console.log('   - 502 (Bad Gateway)');
  console.log('   - 503 (Service Unavailable)');
  console.log('   - 504 (Gateway Timeout)');
  console.log('   - Network errors (ECONNREFUSED, ETIMEDOUT, etc.)');
  console.log('   - Timeout errors');
  console.log('\n   Non-retryable errors:');
  console.log('   - 400 (Bad Request)');
  console.log('   - 401 (Unauthorized)');
  console.log('   - 403 (Forbidden)');
  console.log('   - 404 (Not Found)');
  console.log('   - 422 (Validation Error)');
  console.log('   - Any other 4xx errors\n');

  // 6. Configuration in Node-RED
  console.log('6. Node-RED Configuration:');
  console.log('   To enable retry mechanisms in your wger-config node:');
  console.log('   - Set "Enable Retry" to true');
  console.log('   - Configure max attempts (default: 3)');
  console.log('   - Set base delay and max delay');
  console.log('   - Optionally enable circuit breaker');
  console.log('   - Configure failure threshold and reset timeout\n');

  console.log('=== Demo Complete ===');
  console.log('The retry mechanism provides robust error handling without');
  console.log('breaking existing functionality. All existing nodes will');
  console.log('benefit from these improvements when retry is enabled.');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateRetryMechanism().catch(console.error);
}

module.exports = demonstrateRetryMechanism;