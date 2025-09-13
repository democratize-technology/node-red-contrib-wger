/**
 * @fileoverview URL validation utility with SSRF protection using ssrf-req-filter and ipaddr.js
 * @module utils/safe-url-validator
 */

const Ssrfilter = require('ssrf-req-filter');
const ipaddr = require('ipaddr.js');
const { URL } = require('url');

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

function validate(urlString, options = {}) {
  const { isDevelopment = false } = options;

  if (!urlString || typeof urlString !== 'string' || urlString.trim() === '') {
    return { valid: false, errors: ['URL is required and must be a non-empty string'], warnings: [], normalizedUrl: null };
  }

  const trimmedUrl = urlString.trim();
  let urlObj;
  try {
    urlObj = new URL(trimmedUrl);
  } catch (error) {
    return { valid: false, errors: [`Invalid URL format: ${error.message}`], warnings: [], normalizedUrl: null };
  }

  if (!ALLOWED_PROTOCOLS.includes(urlObj.protocol)) {
    return { valid: false, errors: [`Protocol not allowed: ${urlObj.protocol}`], warnings: [], normalizedUrl: null };
  }
  
  if (urlObj.username || urlObj.password) {
    return { valid: false, errors: ['URLs with embedded credentials are not allowed'], warnings: [], normalizedUrl: null };
  }

  if (!isDevelopment) {
    if (ipaddr.isValid(urlObj.hostname)) {
      const addr = ipaddr.parse(urlObj.hostname);
      const range = addr.range();
      if (range !== 'unicast') {
        return { valid: false, errors: [`IP address range ${range} is not allowed`], warnings: [], normalizedUrl: urlObj.href };
      }
    }
  }

  const filterOptions = {
    protocols: ALLOWED_PROTOCOLS,
    allowPrivateIPs: isDevelopment,
    allowlocalhost: isDevelopment
  };

  try {
    Ssrfilter(trimmedUrl, filterOptions);
    return { valid: true, errors: [], warnings: [], normalizedUrl: urlObj.href };
  } catch (error) {
    return { valid: false, errors: [error.message], warnings: [], normalizedUrl: urlObj.href };
  }
}

function validateUrlSync(urlString, options = {}) {
  return validate(urlString, options);
}

async function validateUrl(urlString, options = {}) {
  return Promise.resolve(validate(urlString, options));
}

function isDevEnvironment(urlString) {
  if (!urlString) return false;
  try {
    const urlObj = new URL(urlString);
    const hostname = urlObj.hostname.toLowerCase();
    const devPatterns = ['localhost', 'test'];
    return devPatterns.some(pattern => hostname.includes(pattern));
  } catch {
    return false;
  }
}

module.exports = {
  validateUrl,
  validateUrlSync,
  isDevEnvironment
};