/**
 * @fileoverview URL validation utility with SSRF protection using battle-tested security libraries
 * @module utils/url-validator
 * @version 2.0.0
 * @description Provides secure URL validation using ipaddr.js and enhanced SSRF protection
 */

const dns = require('dns').promises;
const { URL } = require('url');
const ipaddr = require('ipaddr.js');

/**
 * Creates a standardized validation result object
 * @private
 * @param {boolean} success - Whether validation passed
 * @param {string[]} errors - Array of error messages
 * @param {string[]} warnings - Array of warning messages
 * @param {Object} data - Optional data to include in result
 * @returns {Object} Validation result
 */
function createValidationResult(success, errors = [], warnings = [], data = null) {
  const result = { success, errors: [...errors], warnings: [...warnings] };
  if (data !== null) {
    result.data = data;
  }
  return result;
}

/**
 * Combines multiple validation results immutably
 * @private
 * @param {Object[]} results - Array of validation results
 * @returns {Object} Combined validation result
 */
function combineValidationResults(results) {
  const combined = {
    success: results.every(r => r.success),
    errors: results.flatMap(r => r.errors || []),
    warnings: results.flatMap(r => r.warnings || [])
  };
  
  // Merge data objects from all results
  const dataObjects = results.filter(r => r.data).map(r => r.data);
  if (dataObjects.length > 0) {
    combined.data = Object.assign({}, ...dataObjects);
  }
  
  return combined;
}

/**
 * Builds final URL validation result immutably
 * @private
 * @param {string} urlString - Original URL string
 * @param {string} normalizedUrl - Normalized URL
 * @param {Object} validationResults - Combined validation results
 * @returns {Object} Final result object
 */
function buildFinalResult(urlString, normalizedUrl, validationResults) {
  return {
    valid: validationResults.success,
    url: urlString,
    errors: [...validationResults.errors],
    warnings: [...validationResults.warnings],
    normalizedUrl
  };
}

/**
 * Security configuration for URL validation
 */
const SECURITY_CONFIG = {
  // Allowed protocols
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  
  // Domain whitelisting removed to support self-hosted wger instances
  // SSRF protection is maintained through IP range blocking
  WHITELISTED_DOMAINS: [],
  
  // Cloud metadata endpoints to block (AWS, GCP, Azure, Alibaba, DigitalOcean, Oracle)
  CLOUD_METADATA_ENDPOINTS: [
    '169.254.169.254',  // AWS, GCP, Azure
    'fd00:ec2::254',    // AWS IPv6
    '100.100.100.200',  // Alibaba Cloud
    '169.254.169.254',  // DigitalOcean
    '192.0.0.192',      // Oracle Cloud
    'metadata.google.internal',  // GCP DNS
    'metadata.azure.com',        // Azure DNS
    'metadata.cloud'             // Generic
  ],
  
  // Private IPv4 CIDR ranges using ipaddr.js format
  PRIVATE_IPV4_RANGES: [
    '10.0.0.0/8',        // RFC 1918
    '172.16.0.0/12',     // RFC 1918
    '192.168.0.0/16',    // RFC 1918
    '127.0.0.0/8',       // Loopback
    '169.254.0.0/16',    // Link-local
    '0.0.0.0/8',         // Current network
    '100.64.0.0/10',     // Shared address space
    '224.0.0.0/4',       // Multicast
    '240.0.0.0/4'        // Reserved/Future use
  ],
  
  // Private IPv6 ranges
  PRIVATE_IPV6_RANGES: [
    '::1/128',           // Loopback
    'fc00::/7',          // Unique local
    'fe80::/10',         // Link-local
    'ff00::/8',          // Multicast
    '::ffff:0:0/96',     // IPv4-mapped IPv6
    '::/128',            // Unspecified
    '::ffff:127.0.0.1/128', // IPv4 loopback in IPv6
    'fd00:ec2::254/128'  // AWS EC2 metadata IPv6
  ],
  
  // Development mode patterns (allowed localhost)
  DEV_MODE_PATTERNS: ['localhost', 'test', '127.0.0.1', '::1'],
  
  // DNS timeout for resolution
  DNS_TIMEOUT: 3000,
  
  // Maximum redirects to follow during validation
  MAX_REDIRECTS: 5
};

/**
 * Checks if an IP address is private or restricted using ipaddr.js
 * @private
 * @param {string} ip - The IP address to check
 * @returns {Object} Result with blocked status and reason
 */
function checkIpRestrictions(ip) {
  try {
    // Parse the IP address first
    if (!ipaddr.isValid(ip)) {
      return { blocked: true, reason: 'Invalid IP address format' };
    }
    
    const addr = ipaddr.process(ip);
    
    if (addr.kind() === 'ipv4') {
      // Check IPv4 ranges
      const ipv4 = addr;
      
      // Loopback (127.0.0.0/8)
      if (ipv4.match(ipaddr.IPv4.parse('127.0.0.1'), 8)) {
        return { blocked: true, reason: 'Loopback address' };
      }
      // Private ranges (RFC 1918)
      if (ipv4.match(ipaddr.IPv4.parse('10.0.0.0'), 8)) {
        return { blocked: true, reason: 'Private IP range (RFC 1918): 10.0.0.0/8' };
      }
      if (ipv4.match(ipaddr.IPv4.parse('172.16.0.0'), 12)) {
        return { blocked: true, reason: 'Private IP range (RFC 1918): 172.16.0.0/12' };
      }
      if (ipv4.match(ipaddr.IPv4.parse('192.168.0.0'), 16)) {
        return { blocked: true, reason: 'Private IP range (RFC 1918): 192.168.0.0/16' };
      }
      // Link-local (169.254.0.0/16)
      if (ipv4.match(ipaddr.IPv4.parse('169.254.0.0'), 16)) {
        return { blocked: true, reason: 'Blocked IP range: 169.254.0.0/16' };
      }
      // Current network (0.0.0.0/8)
      if (ipv4.match(ipaddr.IPv4.parse('0.0.0.0'), 8)) {
        return { blocked: true, reason: 'Blocked IP range: 0.0.0.0/8' };
      }
      // Shared address space (100.64.0.0/10)
      if (ipv4.match(ipaddr.IPv4.parse('100.64.0.0'), 10)) {
        return { blocked: true, reason: 'Blocked IP range: 100.64.0.0/10' };
      }
      // Multicast (224.0.0.0/4)
      if (ipv4.match(ipaddr.IPv4.parse('224.0.0.0'), 4)) {
        return { blocked: true, reason: 'Blocked IP range: 224.0.0.0/4' };
      }
      // Reserved (240.0.0.0/4)
      if (ipv4.match(ipaddr.IPv4.parse('240.0.0.0'), 4)) {
        return { blocked: true, reason: 'Blocked IP range: 240.0.0.0/4' };
      }
    } else if (addr.kind() === 'ipv6') {
      // Check IPv6 ranges using ipaddr.js built-in range detection
      const range = addr.range();
      
      if (range === 'loopback') {
        return { blocked: true, reason: 'IPv6 localhost address' };
      }
      if (range === 'linkLocal') {
        return { blocked: true, reason: 'IPv6 link-local address' };
      }
      // Note: We intentionally allow uniqueLocal (fc00::/7) for backward compatibility
      // The original implementation didn't block these addresses
      // Consider adding: if (range === 'uniqueLocal') { return blocked... } for enhanced security
      
      if (range === 'multicast') {
        return { blocked: true, reason: 'IPv6 multicast address' };
      }
      if (range === 'unspecified') {
        return { blocked: true, reason: 'IPv6 unspecified address' };
      }
      
      // Check for IPv4-mapped addresses
      if (addr.isIPv4MappedAddress()) {
        const ipv4 = addr.toIPv4Address().toString();
        return checkIpRestrictions(ipv4);
      }
    }
    
    // Check for cloud metadata endpoints
    if (SECURITY_CONFIG.CLOUD_METADATA_ENDPOINTS.includes(ip)) {
      return { blocked: true, reason: 'Cloud metadata endpoint' };
    }
    
    // If we reach here, the IP is valid and not restricted
    return { blocked: false };
  } catch (error) {
    // If any unexpected error occurs, block for safety
    return { blocked: true, reason: 'IP validation error' };
  }
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
 * Checks if a hostname is a cloud metadata endpoint
 * @private
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if hostname is a metadata endpoint
 */
function isCloudMetadataEndpoint(hostname) {
  const lowerHost = hostname.toLowerCase();
  return SECURITY_CONFIG.CLOUD_METADATA_ENDPOINTS.some(endpoint => 
    lowerHost === endpoint || lowerHost === endpoint.toLowerCase()
  );
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
  
  // Check for localhost hostname
  if (hostname === 'localhost') {
    return { isLocalhost: true, reason: 'localhost hostname' };
  }
  
  // Handle IPv6 addresses in bracket notation
  const cleanHostname = hostname.startsWith('[') && hostname.endsWith(']') 
    ? hostname.slice(1, -1) 
    : hostname;
  
  // Use ipaddr.js to check if it's an IP and if it's localhost
  try {
    if (ipaddr.isValid(cleanHostname)) {
      const addr = ipaddr.process(cleanHostname);
      
      if (addr.kind() === 'ipv4') {
        // Check for IPv4 loopback (127.0.0.0/8)
        if (addr.match(ipaddr.IPv4.parse('127.0.0.1'), 8)) {
          return { isLocalhost: true, reason: 'loopback address' };
        }
      } else if (addr.kind() === 'ipv6') {
        // Check for IPv6 loopback
        const range = addr.range();
        if (range === 'loopback') {
          return { isLocalhost: true, reason: 'IPv6 localhost' };
        }
      }
    }
  } catch (error) {
    // Not a valid IP, continue with hostname check
  }
  
  return { isLocalhost: false };
}

/**
 * Validates an IP address string format
 * @private
 * @param {string} ip - The IP address to validate
 * @returns {boolean} True if valid IP address
 */
function isValidIpAddress(ip) {
  return ipaddr.isValid(ip);
}

/**
 * Resolves a hostname to its IP addresses (both IPv4 and IPv6)
 * @private
 * @param {string} hostname - The hostname to resolve
 * @returns {Promise<string[]>} Array of resolved IP addresses
 */
async function resolveHostname(hostname) {
  // Set a timeout for DNS resolution
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('DNS resolution timeout')), SECURITY_CONFIG.DNS_TIMEOUT)
  );
  
  // Try both IPv4 and IPv6 resolution
  const promises = [];
  
  // IPv4 resolution - catch errors but preserve them for reporting
  promises.push(dns.resolve4(hostname).catch(err => ({ error: err })));
  
  // IPv6 resolution - optional, many hosts don't have AAAA records
  promises.push(dns.resolve6(hostname).catch(() => []));
  
  const results = await Promise.race([
    Promise.all(promises),
    timeoutPromise
  ]);
  
  // Check if IPv4 resolution had an error (not just empty results)
  if (results[0] && results[0].error) {
    // Propagate the DNS error so it can be caught and reported as a warning
    throw results[0].error;
  }
  
  // Flatten and filter results
  const allIps = results.flat().filter(ip => typeof ip === 'string');
  return allIps;
}

/**
 * Core validation pipeline for async URL validation
 * @private
 * @param {string} urlString - The URL string to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Combined validation result with normalizedUrl
 */
async function _performCoreValidation(urlString, options = {}) {
  const {
    isDevelopment = false,
    skipDnsResolution = false,
    additionalWhitelist = []
  } = options;

  // Step 1: Basic validation
  const basicValidation = _performBasicUrlValidation(urlString);
  if (!basicValidation.success) {
    return { ...basicValidation, normalizedUrl: null };
  }
  
  const { urlObj } = basicValidation.data;
  const normalizedUrl = urlObj.href;

  // Step 2: Cloud metadata check
  const metadataCheck = _checkCloudMetadataEndpoints(urlObj.hostname, isDevelopment);
  
  // Step 3: Localhost checks
  const localhostCheck = _performLocalhostChecks(urlObj, isDevelopment);
  
  // Step 4: IP/Hostname validation
  const cleanHostname = urlObj.hostname.startsWith('[') && urlObj.hostname.endsWith(']') 
    ? urlObj.hostname.slice(1, -1) 
    : urlObj.hostname;
    
  let addressValidation;
  if (isValidIpAddress(cleanHostname)) {
    addressValidation = _validateIpAddress(cleanHostname, isDevelopment);
  } else {
    addressValidation = await _validateHostname(
      urlObj.hostname, 
      additionalWhitelist, 
      isDevelopment, 
      skipDnsResolution
    );
  }
  
  // Step 5: Security checks
  const securityCheck = _performSecurityChecks(urlObj);
  
  // Combine all results
  const allResults = [basicValidation, metadataCheck, localhostCheck, addressValidation, securityCheck];
  const combinedResult = combineValidationResults(allResults);
  
  return { ...combinedResult, normalizedUrl };
}

/**
 * Core validation pipeline for synchronous URL validation
 * @private
 * @param {string} urlString - The URL string to validate
 * @param {Object} options - Validation options
 * @returns {Object} Combined validation result with normalizedUrl
 */
function _performCoreValidationSync(urlString, options = {}) {
  const {
    isDevelopment = false,
    additionalWhitelist = []
  } = options;

  // Step 1: Basic validation
  const basicValidation = _performBasicUrlValidation(urlString);
  if (!basicValidation.success) {
    return { ...basicValidation, normalizedUrl: null };
  }
  
  const { urlObj } = basicValidation.data;
  const normalizedUrl = urlObj.href;

  // Step 2: Cloud metadata check
  const metadataCheck = _checkCloudMetadataEndpoints(urlObj.hostname, isDevelopment);
  
  // Step 3: Localhost checks
  const localhostCheck = _performLocalhostChecks(urlObj, isDevelopment);
  
  // Step 4: IP/Hostname validation (sync version - no DNS resolution)
  const cleanHostname = urlObj.hostname.startsWith('[') && urlObj.hostname.endsWith(']') 
    ? urlObj.hostname.slice(1, -1) 
    : urlObj.hostname;
    
  let addressValidation;
  if (isValidIpAddress(cleanHostname)) {
    addressValidation = _validateIpAddress(cleanHostname, isDevelopment);
  } else {
    // Sync hostname validation (simplified version without DNS)
    addressValidation = _validateHostnameSync(urlObj.hostname, additionalWhitelist, isDevelopment);
  }
  
  // Step 5: Security checks
  const securityCheck = _performSecurityChecks(urlObj);
  
  // Combine all results
  const allResults = [basicValidation, metadataCheck, localhostCheck, addressValidation, securityCheck];
  const combinedResult = combineValidationResults(allResults);
  
  return { ...combinedResult, normalizedUrl };
}

/**
 * Synchronous hostname validation without DNS resolution
 * @private
 * @param {string} hostname - The hostname to validate
 * @param {string[]} additionalWhitelist - Additional domains to whitelist
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Validation result with success flag, errors, and warnings
 */
function _validateHostnameSync(hostname, additionalWhitelist, isDevelopment) {
  const warnings = [];
  
  // Check against whitelist if any patterns are configured
  const allWhitelist = [...SECURITY_CONFIG.WHITELISTED_DOMAINS, ...additionalWhitelist];
  const hasWhitelist = allWhitelist.length > 0;
  const isWhitelisted = !hasWhitelist || allWhitelist.some(pattern => 
    matchesWildcardDomain(hostname, pattern)
  );
  
  // Only enforce whitelist if patterns are configured and not in development
  if (!isWhitelisted && !isDevelopment && hasWhitelist) {
    return createValidationResult(false, [`Domain not whitelisted: ${hostname}. Allowed domains: ${allWhitelist.join(', ')}`]);
  }
  
  if (!isWhitelisted && isDevelopment && hasWhitelist) {
    warnings.push(`Warning: Using non-whitelisted domain in development mode: ${hostname}`);
  }
  
  return createValidationResult(true, [], warnings);
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
  const validationResult = await _performCoreValidation(urlString, options);
  return buildFinalResult(urlString, validationResult.normalizedUrl, validationResult);
}

/**
 * Performs basic URL validation including string checks, parsing, and protocol validation.
 * 
 * @private
 * @param {string} urlString - The URL string to validate
 * @returns {Object} Validation result with success flag, errors, warnings, and parsed URL data
 */
function _performBasicUrlValidation(urlString) {
  // Basic validation - check if URL is provided
  if (!urlString || typeof urlString !== 'string') {
    return createValidationResult(false, ['URL is required and must be a string']);
  }
  
  // Trim whitespace
  const trimmedUrl = urlString.trim();
  if (!trimmedUrl) {
    return createValidationResult(false, ['URL cannot be empty']);
  }
  
  // Parse the URL
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
  } catch (error) {
    return createValidationResult(false, [`Invalid URL format: ${error.message}`]);
  }
  
  // Check protocol
  if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
    return createValidationResult(false, [`Protocol not allowed: ${urlObj.protocol}. Only ${SECURITY_CONFIG.ALLOWED_PROTOCOLS.join(', ')} are permitted`]);
  }
  
  return createValidationResult(true, [], [], { urlObj, trimmedUrl });
}

/**
 * Checks if hostname is a cloud metadata endpoint and blocks it if not in development.
 * 
 * @private
 * @param {string} hostname - The hostname to check
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Validation result with success flag, errors, and warnings
 */
function _checkCloudMetadataEndpoints(hostname, isDevelopment) {
  if (isCloudMetadataEndpoint(hostname) && !isDevelopment) {
    return createValidationResult(false, [`Blocked cloud metadata endpoint: ${hostname}`]);
  }
  return createValidationResult(true);
}

/**
 * Performs localhost and loopback address detection and blocking.
 * 
 * @private
 * @param {URL} urlObj - Parsed URL object
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Validation result with success flag, errors, and warnings
 */
function _performLocalhostChecks(urlObj, isDevelopment) {
  const localhostCheck = isLocalhost(urlObj, isDevelopment);
  if (localhostCheck.isLocalhost) {
    let errorMessage;
    if (localhostCheck.reason === 'loopback address') {
      errorMessage = 'Loopback address not allowed in production mode';
    } else if (localhostCheck.reason === 'IPv6 localhost') {
      errorMessage = 'IPv6 localhost address not allowed in production mode';
    } else {
      errorMessage = 'Localhost/loopback addresses are not allowed in production mode';
    }
    return createValidationResult(false, [errorMessage]);
  }
  return createValidationResult(true);
}

/**
 * Validates direct IP addresses for security restrictions.
 * 
 * @private
 * @param {string} ipAddress - The IP address to validate
 * @param {boolean} isDevelopment - Whether in development mode
 * @returns {Object} Validation result with success flag, errors, and warnings
 */
function _validateIpAddress(ipAddress, isDevelopment) {
  const ipCheck = checkIpRestrictions(ipAddress);
  if (ipCheck.blocked && !isDevelopment) {
    return createValidationResult(false, [`Blocked IP address: ${ipCheck.reason}`]);
  }
  if (ipCheck.blocked && isDevelopment) {
    return createValidationResult(true, [], [`Warning: Using restricted IP in development mode: ${ipCheck.reason}`]);
  }
  return createValidationResult(true);
}

/**
 * Validates hostname against whitelist and performs DNS resolution security checks.
 * 
 * @private
 * @param {string} hostname - The hostname to validate
 * @param {string[]} additionalWhitelist - Additional domains to whitelist
 * @param {boolean} isDevelopment - Whether in development mode
 * @param {boolean} skipDnsResolution - Whether to skip DNS resolution
 * @returns {Promise<Object>} Validation result with success flag, errors, and warnings
 */
async function _validateHostname(hostname, additionalWhitelist, isDevelopment, skipDnsResolution) {
  const errors = [];
  const warnings = [];
  
  // Check against whitelist if any patterns are configured
  const allWhitelist = [...SECURITY_CONFIG.WHITELISTED_DOMAINS, ...additionalWhitelist];
  const hasWhitelist = allWhitelist.length > 0;
  const isWhitelisted = !hasWhitelist || allWhitelist.some(pattern => 
    matchesWildcardDomain(hostname, pattern)
  );
  
  // Only enforce whitelist if patterns are configured and not in development
  if (!isWhitelisted && !isDevelopment && hasWhitelist) {
    errors.push(`Domain not whitelisted: ${hostname}. Allowed domains: ${allWhitelist.join(', ')}`);
    return createValidationResult(false, errors, warnings);
  }
  
  if (!isWhitelisted && isDevelopment && hasWhitelist) {
    warnings.push(`Warning: Using non-whitelisted domain in development mode: ${hostname}`);
  }
  
  // Resolve hostname to IP and check if it points to private/restricted IPs
  if (!skipDnsResolution && !isDevelopment) {
    try {
      const ips = await resolveHostname(hostname);
      
      if (ips.length === 0) {
        warnings.push(`DNS resolution warning: Could not resolve hostname: ${hostname}`);
      } else {
        for (const ip of ips) {
          // Check both cloud metadata and general restrictions
          if (SECURITY_CONFIG.CLOUD_METADATA_ENDPOINTS.includes(ip)) {
            errors.push(`Domain ${hostname} resolves to cloud metadata endpoint ${ip}`);
            return createValidationResult(false, errors, warnings);
          }
          
          const ipCheck = checkIpRestrictions(ip);
          if (ipCheck.blocked) {
            errors.push(`Domain ${hostname} resolves to blocked IP ${ip}: ${ipCheck.reason}`);
            return createValidationResult(false, errors, warnings);
          }
        }
      }
    } catch (error) {
      warnings.push(`DNS resolution warning: ${error.message}`);
    }
  }
  
  return createValidationResult(true, errors, warnings);
}

/**
 * Performs final security checks including credential detection and port validation.
 * 
 * @private
 * @param {URL} urlObj - Parsed URL object
 * @returns {Object} Validation result with success flag, errors, and warnings
 */
function _performSecurityChecks(urlObj) {
  const errors = [];
  const warnings = [];
  
  // Check for suspicious patterns
  if (urlObj.username || urlObj.password) {
    errors.push('URLs with embedded credentials are not allowed');
    return createValidationResult(false, errors, warnings);
  }
  
  // Check for unusual ports
  const port = urlObj.port;
  if (port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push(`Invalid port number: ${port}`);
      return createValidationResult(false, errors, warnings);
    }
    
    // Warn about non-standard ports
    const standardPorts = {
      'http:': [80, 8080, 8000, 3000],
      'https:': [443, 8443]
    };
    
    if (!standardPorts[urlObj.protocol].includes(portNum)) {
      warnings.push(`Non-standard port for ${urlObj.protocol.slice(0, -1)}: ${port}`);
    }
  }
  
  return createValidationResult(true, errors, warnings);
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
  const validationResult = _performCoreValidationSync(urlString, syncOptions);
  return buildFinalResult(urlString, validationResult.normalizedUrl, validationResult);
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
  // Export for testing - maintain backward compatibility
  _internal: {
    // Legacy functions maintained for test compatibility
    isIpInRange: (ip, range) => {
      // Convert to ipaddr.js format and check
      try {
        if (!ipaddr.isValid(ip)) {
          return false;
        }
        
        const addr = ipaddr.process(ip);
        
        // Handle old format with start/end properties
        if (range.end && ipaddr.isValid(range.start) && ipaddr.isValid(range.end)) {
          const startAddr = ipaddr.process(range.start);
          const endAddr = ipaddr.process(range.end);
          
          if (addr.kind() === 'ipv4' && startAddr.kind() === 'ipv4' && endAddr.kind() === 'ipv4') {
            // Convert to numbers for comparison
            const ipNum = (addr.octets[0] << 24) + (addr.octets[1] << 16) + (addr.octets[2] << 8) + addr.octets[3];
            const startNum = (startAddr.octets[0] << 24) + (startAddr.octets[1] << 16) + (startAddr.octets[2] << 8) + startAddr.octets[3];
            const endNum = (endAddr.octets[0] << 24) + (endAddr.octets[1] << 16) + (endAddr.octets[2] << 8) + endAddr.octets[3];
            return ipNum >= startNum && ipNum <= endNum;
          }
        }
        
        // Handle new format with start/cidr
        if (range.cidr && ipaddr.isValid(range.start)) {
          const rangeStart = ipaddr.process(range.start);
          
          if (addr.kind() !== rangeStart.kind()) {
            return false;
          }
          
          if (addr.kind() === 'ipv4') {
            return addr.match(rangeStart, range.cidr);
          }
        }
        
        return false;
      } catch {
        return false;
      }
    },
    ipToNumber: (ip) => {
      // Convert IPv4 to number for backward compatibility
      try {
        if (!ipaddr.IPv4.isValid(ip)) {
          return 0;
        }
        const addr = ipaddr.IPv4.parse(ip);
        // Calculate 32-bit number from octets
        return (addr.octets[0] << 24) + (addr.octets[1] << 16) + (addr.octets[2] << 8) + addr.octets[3] >>> 0;
      } catch {
        return 0;
      }
    },
    matchesWildcardDomain,
    isLocalhost,
    isPrivateOrRestrictedIp: checkIpRestrictions,  // Map to new function
    resolveHostname
  }
};