/**
 * @fileoverview Sanitization provider interface for dependency injection to make sanitization pure
 * @module utils/sanitization-provider
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const validator = require('validator');

/**
 * Default sanitization provider that uses DOMPurify and validator.
 * This is used when no custom sanitization provider is injected.
 * 
 * @class SystemSanitizationProvider
 */
class SystemSanitizationProvider {
  constructor() {
    // Lazy initialization of DOMPurify to avoid global state
    this._domPurify = null;
    this._window = null;
  }

  /**
   * Gets or creates the DOMPurify instance.
   * 
   * @private
   * @returns {Object} DOMPurify instance
   */
  _getDOMPurify() {
    if (!this._domPurify) {
      this._window = new JSDOM('').window;
      this._domPurify = createDOMPurify(this._window);
    }
    return this._domPurify;
  }

  /**
   * Sanitizes HTML content using DOMPurify.
   * 
   * @param {string} value - Value to sanitize
   * @param {Object} [options={}] - Sanitization options
   * @returns {string} Sanitized value
   */
  sanitizeHtml(value, options = {}) {
    const domPurify = this._getDOMPurify();
    return domPurify.sanitize(value, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span'],
      ALLOWED_ATTR: ['class', 'id'],
      KEEP_CONTENT: true,
      ...options
    });
  }

  /**
   * Normalizes email addresses using validator.
   * 
   * @param {string} email - Email address to normalize
   * @param {Object} [options={}] - Normalization options
   * @returns {string} Normalized email address
   */
  normalizeEmail(email, options = {}) {
    const defaultOptions = {
      all_lowercase: true,
      gmail_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      gmail_convert_googlemaildotcom: false,
      outlookdotcom_lowercase: true,
      outlookdotcom_remove_subaddress: false,
      yahoo_lowercase: true,
      yahoo_remove_subaddress: false,
      icloud_lowercase: true,
      icloud_remove_subaddress: false,
      ...options
    };

    return validator.normalizeEmail(email, defaultOptions);
  }

  /**
   * Cleans up resources (for testing purposes).
   */
  cleanup() {
    if (this._window) {
      this._window.close();
      this._window = null;
      this._domPurify = null;
    }
  }
}

/**
 * Mock sanitization provider for testing.
 * Returns controlled/predictable sanitization results.
 * 
 * @class MockSanitizationProvider
 */
class MockSanitizationProvider {
  constructor() {
    this._htmlResults = new Map();
    this._emailResults = new Map();
  }

  /**
   * Sets expected HTML sanitization results.
   * 
   * @param {string} input - Input HTML
   * @param {string} output - Expected sanitized output
   */
  setHtmlResult(input, output) {
    this._htmlResults.set(input, output);
  }

  /**
   * Sets expected email normalization results.
   * 
   * @param {string} input - Input email
   * @param {string} output - Expected normalized output
   */
  setEmailResult(input, output) {
    this._emailResults.set(input, output);
  }

  /**
   * Mocks HTML sanitization.
   * 
   * @param {string} value - Value to sanitize
   * @param {Object} [options={}] - Sanitization options
   * @returns {string} Mocked sanitized value
   */
  sanitizeHtml(value, options = {}) {
    if (this._htmlResults.has(value)) {
      return this._htmlResults.get(value);
    }
    // Default mock behavior - just remove script tags
    return value.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  /**
   * Mocks email normalization.
   * 
   * @param {string} email - Email address to normalize
   * @param {Object} [options={}] - Normalization options
   * @returns {string} Mocked normalized email
   */
  normalizeEmail(email, options = {}) {
    if (this._emailResults.has(email)) {
      return this._emailResults.get(email);
    }
    // Default mock behavior - just lowercase
    return email.toLowerCase();
  }

  /**
   * Clears all mock results.
   */
  clearResults() {
    this._htmlResults.clear();
    this._emailResults.clear();
  }

  /**
   * Gets mock result counts (for testing).
   * 
   * @returns {Object} Mock result counts
   */
  getResultCounts() {
    return {
      html: this._htmlResults.size,
      email: this._emailResults.size
    };
  }

  /**
   * No-op cleanup for interface compatibility.
   */
  cleanup() {
    // No resources to clean up in mock
  }
}

/**
 * Pass-through sanitization provider that performs minimal sanitization.
 * Useful for performance testing or when external sanitization is handled.
 * 
 * @class PassThroughSanitizationProvider
 */
class PassThroughSanitizationProvider {
  /**
   * Returns input without HTML sanitization (just removes script tags).
   * 
   * @param {string} value - Value to sanitize
   * @param {Object} [options={}] - Sanitization options (ignored)
   * @returns {string} Minimally sanitized value
   */
  sanitizeHtml(value, options = {}) {
    // Remove script tags only for basic safety
    return value.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  /**
   * Returns email in lowercase without full normalization.
   * 
   * @param {string} email - Email address to normalize
   * @param {Object} [options={}] - Normalization options (ignored)
   * @returns {string} Lowercased email
   */
  normalizeEmail(email, options = {}) {
    return email.toLowerCase();
  }

  /**
   * No-op cleanup for interface compatibility.
   */
  cleanup() {
    // No resources to clean up
  }
}

module.exports = {
  SystemSanitizationProvider,
  MockSanitizationProvider,
  PassThroughSanitizationProvider,
  // Default export for convenience
  default: new SystemSanitizationProvider()
};