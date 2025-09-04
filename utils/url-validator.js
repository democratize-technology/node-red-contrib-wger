/**
 * @fileoverview URL validation utility with SSRF protection
 * @module utils/url-validator
 * @version 1.0.0
 * @description Provides secure URL validation to prevent Server-Side Request Forgery (SSRF) attacks
 */

const net = require('net');
const dns = require('dns').promises;
const { URL } = require('url');

/**
 * Security configuration for URL validation
 */
const SECURITY_CONFIG = {
  // Allowed protocols
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  
  // Whitelisted domains for wger instances
  WHITELISTED_DOMAINS: [
    'wger.de',
    '*.wger.de',  // Subdomains like api.wger.de
  ],
  
  // Private IP ranges (RFC 1918)
  PRIVATE_IP_RANGES: [
    { start: '10.0.0.0', end: '10.255.255.255', cidr: 8 },
    { start: '172.16.0.0', end: '172.31.255.255', cidr: 12 },
    { start: '192.168.0.0', end: '192.168.255.255', cidr: 16 }
  ],
  
  // Special IP ranges to block
  BLOCKED_IP_RANGES: [
    { start: '0.0.0.0', end: '0.255.255.255', cidr: 8 },      // Current network
    { start: '100.64.0.0', end: '100.127.255.255', cidr: 10 }, // Shared address space
    { start: '169.254.0.0', end: '169.254.255.255', cidr: 16 }, // Link-local
    { start: '224.0.0.0', end: '239.255.255.255', cidr: 4 },   // Multicast
    { start: '240.0.0.0', end: '255.255.255.255', cidr: 4 }    // Reserved/Broadcast
  ],
  
  // Localhost patterns to block (except in development)
  LOCALHOST_PATTERNS: [
    'localhost',
    '127.0.0.1',
    '::1',
    '0:0:0:0:0:0:0:1',
    '::ffff:127.0.0.1'
  ],
  
  // Development mode patterns (allowed localhost)
  DEV_MODE_PATTERNS: ['localhost', 'test', '127.0.0.1', '::1'],
  
  // DNS timeout for resolution
  DNS_TIMEOUT: 3000,
  
  // Maximum redirects to follow during validation
  MAX_REDIRECTS: 5
};

/**
 * Checks if an IP address is within a specific range
 * @private
 * @param {string} ip - The IP address to check
 * @param {Object} range - The IP range object with start and end
 * @returns {boolean} True if IP is within the range
 */
function isIpInRange(ip, range) {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(range.start);
  const endNum = ipToNumber(range.end);
  return ipNum >= startNum && ipNum <= endNum;
}

/**
 * Converts an IPv4 address to a number for comparison
 * @private
 * @param {string} ip - The IP address string
 * @returns {number} The numeric representation of the IP
 */
function ipToNumber(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const num = parseInt(parts[i], 10);
    if (isNaN(num) || num < 0 || num > 255) return 0;
    result = (result * 256) + num;
  }
  return result >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Checks if a hostname matches a wildcard pattern
 * @private
 * @param {string} hostname - The hostname to check
 * @param {string} pattern - The pattern (can include * wildcard)
 * @returns {boolean} True if hostname matches the pattern
 */
function matchesWildcardDomain(hostname, pattern) {
  if (!pattern.includes('*')) {
    return hostname.toLowerCase() === pattern.toLowerCase();
  }
  
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  
  return regex.test(hostname);
}

/**
 * Checks if a URL is using localhost or loopback addresses
 * @private
 * @param {URL} urlObj - Parsed URL object
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Detection result with boolean and reason
 */
function isLocalhost(urlObj, isDevelopment) {
  const hostname = urlObj.hostname.toLowerCase();
  
  // In development mode, allow localhost
  if (isDevelopment) {
    return { isLocalhost: false };
  }
  
  // Check against localhost patterns
  const isLocal = SECURITY_CONFIG.LOCALHOST_PATTERNS.some(pattern => 
    hostname === pattern.toLowerCase()
  );
  
  if (isLocal) {
    // Determine specific type for better error messages
    if (hostname === 'localhost') {
      return { isLocalhost: true, reason: 'localhost hostname' };
    } else if (hostname === '127.0.0.1' || hostname.startsWith('127.')) {
      return { isLocalhost: true, reason: 'loopback address' };
    } else if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
      return { isLocalhost: true, reason: 'IPv6 localhost' };
    }
    return { isLocalhost: true, reason: 'localhost/loopback address' };
  }
  
  return { isLocalhost: false };
}

/**
 * Checks if an IP address is private or restricted
 * @private
 * @param {string} ip - The IP address to check
 * @returns {Object} Validation result with boolean and reason
 */
function isPrivateOrRestrictedIp(ip) {
  // Check if it's a valid IPv4 address
  if (!net.isIPv4(ip)) {
    // Check for IPv6 localhost
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1' || ip === '::ffff:127.0.0.1') {
      return { blocked: true, reason: 'IPv6 localhost address' };
    }
    // For now, we'll allow other IPv6 addresses but this could be restricted further
    return { blocked: false };
  }
  
  // Check private IP ranges
  for (const range of SECURITY_CONFIG.PRIVATE_IP_RANGES) {
    if (isIpInRange(ip, range)) {
      return { blocked: true, reason: `Private IP range (RFC 1918): ${range.start}/${range.cidr}` };
    }
  }
  
  // Check other blocked IP ranges
  for (const range of SECURITY_CONFIG.BLOCKED_IP_RANGES) {
    if (isIpInRange(ip, range)) {
      return { blocked: true, reason: `Blocked IP range: ${range.start}/${range.cidr}` };
    }
  }
  
  // Check for loopback
  if (ip.startsWith('127.')) {
    return { blocked: true, reason: 'Loopback address' };
  }
  
  return { blocked: false };
}

/**
 * Resolves a hostname to its IP addresses
 * @private
 * @param {string} hostname - The hostname to resolve
 * @returns {Promise<string[]>} Array of resolved IP addresses
 */
async function resolveHostname(hostname) {
  try {
    // Set a timeout for DNS resolution
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DNS resolution timeout')), SECURITY_CONFIG.DNS_TIMEOUT)
    );
    
    const resolutionPromise = dns.resolve4(hostname);
    
    const ips = await Promise.race([resolutionPromise, timeoutPromise]);
    return ips || [];
  } catch (error) {
    // If DNS resolution fails, return empty array
    // We'll handle this in the validation logic
    return [];
  }
}

/**
 * Main URL validation function with SSRF protection
 * @param {string} urlString - The URL to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.isDevelopment - Whether in development mode (allows localhost)
 * @param {boolean} options.skipDnsResolution - Skip DNS resolution (for testing)
 * @param {string[]} options.additionalWhitelist - Additional domains to whitelist
 * @returns {Promise<Object>} Validation result object
 */
async function validateUrl(urlString, options = {}) {
  const {
    isDevelopment = false,
    skipDnsResolution = false,
    additionalWhitelist = []
  } = options;
  
  const result = {
    valid: false,
    url: urlString,
    errors: [],
    warnings: [],
    normalizedUrl: null
  };
  
  // Basic validation - check if URL is provided
  if (!urlString || typeof urlString !== 'string') {
    result.errors.push('URL is required and must be a string');
    return result;
  }
  
  // Trim whitespace
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    result.errors.push('URL cannot be empty');
    return result;
  }
  
  // Parse the URL
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
    result.normalizedUrl = urlObj.href;
  } catch (error) {
    result.errors.push(`Invalid URL format: ${error.message}`);
    return result;
  }
  
  // Check protocol
  if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
    result.errors.push(`Protocol not allowed: ${urlObj.protocol}. Only ${SECURITY_CONFIG.ALLOWED_PROTOCOLS.join(', ')} are permitted`);
    return result;
  }
  
  // Check for localhost/loopback
  const localhostCheck = isLocalhost(urlObj, isDevelopment);
  if (localhostCheck.isLocalhost) {
    if (localhostCheck.reason === 'loopback address') {
      result.errors.push('Loopback address not allowed in production mode');
    } else {
      result.errors.push('Localhost/loopback addresses are not allowed in production mode');
    }
    return result;
  }
  
  // Check if hostname is an IP address
  const hostname = urlObj.hostname;
  
  // Handle IPv6 addresses in bracket notation
  const cleanHostname = hostname.startsWith('[') && hostname.endsWith(']') 
    ? hostname.slice(1, -1) 
    : hostname;
  
  if (net.isIP(cleanHostname)) {
    // It's an IP address
    const ipCheck = isPrivateOrRestrictedIp(cleanHostname);
    if (ipCheck.blocked && !isDevelopment) {
      // Special handling for IPv6 localhost
      if (cleanHostname === '::1' || cleanHostname === '0:0:0:0:0:0:0:1') {
        result.errors.push('IPv6 localhost address not allowed in production mode');
      } else {
        result.errors.push(`Blocked IP address: ${ipCheck.reason}`);
      }
      return result;
    }
    if (ipCheck.blocked && isDevelopment) {
      result.warnings.push(`Warning: Using restricted IP in development mode: ${ipCheck.reason}`);
    }
  } else {
    // It's a hostname - check against whitelist
    const allWhitelist = [...SECURITY_CONFIG.WHITELISTED_DOMAINS, ...additionalWhitelist];
    const isWhitelisted = allWhitelist.some(pattern => 
      matchesWildcardDomain(hostname, pattern)
    );
    
    // In development mode, allow any domain but warn
    if (!isWhitelisted && !isDevelopment) {
      result.errors.push(`Domain not whitelisted: ${hostname}. Allowed domains: ${allWhitelist.join(', ')}`);
      return result;
    }
    
    if (!isWhitelisted && isDevelopment) {
      result.warnings.push(`Warning: Using non-whitelisted domain in development mode: ${hostname}`);
    }
    
    // Resolve hostname to IP and check if it points to private/restricted IPs
    if (!skipDnsResolution && !isDevelopment) {
      try {
        const ips = await resolveHostname(hostname);
        
        if (ips.length === 0) {
          result.warnings.push(`DNS resolution warning: Could not resolve hostname: ${hostname}`);
        } else {
          for (const ip of ips) {
            const ipCheck = isPrivateOrRestrictedIp(ip);
            if (ipCheck.blocked) {
              result.errors.push(`Domain ${hostname} resolves to blocked IP ${ip}: ${ipCheck.reason}`);
              return result;
            }
          }
        }
      } catch (error) {
        result.warnings.push(`DNS resolution warning: ${error.message}`);
      }
    }
  }
  
  // Check for suspicious patterns
  if (urlObj.username || urlObj.password) {
    result.errors.push('URLs with embedded credentials are not allowed');
    return result;
  }
  
  // Check for unusual ports
  const port = urlObj.port;
  if (port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      result.errors.push(`Invalid port number: ${port}`);
      return result;
    }
    
    // Warn about non-standard ports (but not in DNS resolution issues)
    const standardPorts = {
      'http:': [80, 8080, 8000, 3000],
      'https:': [443, 8443]
    };
    
    if (!standardPorts[urlObj.protocol].includes(portNum)) {
      result.warnings.push(`Non-standard port for ${urlObj.protocol.slice(0, -1)}: ${port}`);
    }
  }
  
  // If we've made it here, the URL is valid
  result.valid = true;
  return result;
}

/**
 * Synchronous URL validation (without DNS resolution)
 * @param {string} urlString - The URL to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result object
 */
function validateUrlSync(urlString, options = {}) {
  // Force skip DNS resolution for sync version
  const syncOptions = { ...options, skipDnsResolution: true };
  
  // Create a fake async wrapper that returns immediately
  const result = {
    valid: false,
    url: urlString,
    errors: [],
    warnings: [],
    normalizedUrl: null
  };
  
  // Run the async validation synchronously (without DNS parts)
  const validationPromise = validateUrl(urlString, syncOptions);
  
  // Since we're skipping DNS, this should resolve immediately
  // In practice, we'll need to extract the synchronous parts
  
  // For now, perform basic synchronous checks
  if (!urlString || typeof urlString !== 'string') {
    result.errors.push('URL is required and must be a string');
    return result;
  }
  
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    result.errors.push('URL cannot be empty');
    return result;
  }
  
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
    result.normalizedUrl = urlObj.href;
  } catch (error) {
    result.errors.push(`Invalid URL format: ${error.message}`);
    return result;
  }
  
  if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
    result.errors.push(`Protocol not allowed: ${urlObj.protocol}. Only ${SECURITY_CONFIG.ALLOWED_PROTOCOLS.join(', ')} are permitted`);
    return result;
  }
  
  const hostname = urlObj.hostname;
  const { isDevelopment = false, additionalWhitelist = [] } = options;
  
  const localhostCheck = isLocalhost(urlObj, isDevelopment);
  if (localhostCheck.isLocalhost) {
    if (localhostCheck.reason === 'loopback address') {
      result.errors.push('Loopback address not allowed in production mode');
    } else {
      result.errors.push('Localhost/loopback addresses are not allowed in production mode');
    }
    return result;
  }
  
  // Handle IPv6 addresses in bracket notation
  const cleanHostname = hostname.startsWith('[') && hostname.endsWith(']') 
    ? hostname.slice(1, -1) 
    : hostname;
  
  if (net.isIP(cleanHostname)) {
    const ipCheck = isPrivateOrRestrictedIp(cleanHostname);
    if (ipCheck.blocked && !isDevelopment) {
      result.errors.push(`Blocked IP address: ${ipCheck.reason}`);
      return result;
    }
  } else {
    const allWhitelist = [...SECURITY_CONFIG.WHITELISTED_DOMAINS, ...additionalWhitelist];
    const isWhitelisted = allWhitelist.some(pattern => 
      matchesWildcardDomain(hostname, pattern)
    );
    
    if (!isWhitelisted && !isDevelopment) {
      result.errors.push(`Domain not whitelisted: ${hostname}. Allowed domains: ${allWhitelist.join(', ')}`);
      return result;
    }
  }
  
  if (urlObj.username || urlObj.password) {
    result.errors.push('URLs with embedded credentials are not allowed');
    return result;
  }
  
  result.valid = true;
  return result;
}

/**
 * Determines if the current environment is development based on URL patterns
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if URL indicates development environment
 */
function isDevEnvironment(urlString) {
  if (!urlString) return false;
  
  try {
    const urlObj = new URL(urlString);
    const hostname = urlObj.hostname.toLowerCase();
    
    return SECURITY_CONFIG.DEV_MODE_PATTERNS.some(pattern => 
      hostname.includes(pattern.toLowerCase())
    );
  } catch {
    return false;
  }
}

module.exports = {
  validateUrl,
  validateUrlSync,
  isDevEnvironment,
  SECURITY_CONFIG,
  // Export for testing
  _internal: {
    isIpInRange,
    ipToNumber,
    matchesWildcardDomain,
    isLocalhost,
    isPrivateOrRestrictedIp,
    resolveHostname
  }
};