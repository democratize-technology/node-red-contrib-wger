/**
 * @fileoverview Comprehensive input validation and sanitization utility
 * @module utils/input-validator
 * @requires validator
 * @requires xss
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const validator = require('validator');
const xss = require('xss');

/**
 * Comprehensive input validation utility with security-first design.
 * Provides type checking, format validation, sanitization, and protection against
 * common web vulnerabilities including XSS, SQL injection, and prototype pollution.
 * 
 * @class InputValidator
 * @example
 * // Validate a single value
 * const validatedId = InputValidator.validateValue(
 *   '123',
 *   { type: InputValidator.TYPES.INTEGER, required: true },
 *   'workoutId'
 * );
 * 
 * @example
 * // Validate entire payload
 * const schema = {
 *   name: { type: InputValidator.TYPES.STRING, required: true, maxLength: 100 },
 *   weight: { type: InputValidator.TYPES.NUMBER, min: 0, max: 500 },
 *   date: { type: InputValidator.TYPES.DATE, required: true }
 * };
 * const validated = InputValidator.validatePayload(payload, schema);
 */
class InputValidator {
  /**
   * Enumeration of supported validation types.
   * Each type corresponds to specific validation and coercion logic.
   * 
   * @static
   * @readonly
   * @enum {string}
   */
  static TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    INTEGER: 'integer',
    BOOLEAN: 'boolean',
    DATE: 'date',
    EMAIL: 'email',
    URL: 'url',
    ARRAY: 'array',
    OBJECT: 'object',
    ID: 'id',
    ENUM: 'enum'
  };

  /**
   * Pre-defined regex patterns for common validation scenarios.
   * These patterns enforce format requirements for various data types.
   * 
   * @static
   * @readonly
   * @enum {RegExp}
   * @property {RegExp} ID - Alphanumeric with underscores and hyphens (1-100 chars)
   * @property {RegExp} ALPHANUMERIC - Letters and numbers only
   * @property {RegExp} USERNAME - Valid username format (3-30 chars)
   * @property {RegExp} SAFE_STRING - String safe for display (no script injection)
   * @property {RegExp} BARCODE - Standard barcode format (8-14 digits)
   * @property {RegExp} LANGUAGE_CODE - ISO language code (e.g., 'en' or 'en-US')
   */
  static PATTERNS = {
    ID: /^[a-zA-Z0-9_-]{1,100}$/,
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
    SAFE_STRING: /^[a-zA-Z0-9\s\-_.,:;!?'"()[\]{}@#$%&*+=/<>|\\]+$/,
    BARCODE: /^[0-9]{8,14}$/,
    LANGUAGE_CODE: /^[a-z]{2}(-[A-Z]{2})?$/
  };

  /**
   * Validate a single value against a schema
   * @param {*} value - Value to validate
   * @param {Object} schema - Validation schema
   * @param {string} fieldName - Name of the field for error messages
   * @returns {*} Validated and sanitized value
   * @throws {Error} If validation fails
   */
  static validateValue(value, schema, fieldName) {
    // Handle undefined/null based on required setting
    if (value === undefined || value === null) {
      if (schema.required) {
        throw new Error(`Required field '${fieldName}' is missing or null`);
      }
      return schema.default !== undefined ? schema.default : value;
    }

    // Type validation
    const validatedValue = this.validateType(value, schema.type, fieldName);

    // Additional validations based on schema
    return this.applyValidationRules(validatedValue, schema, fieldName);
  }

  /**
   * Validate type and perform type coercion if safe
   * @param {*} value - Value to validate
   * @param {string} type - Expected type
   * @param {string} fieldName - Field name for errors
   * @returns {*} Type-validated value
   */
  static validateType(value, type, fieldName) {
    switch (type) {
      case this.TYPES.STRING:
        if (typeof value !== 'string') {
          // Safe coercion for primitives
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          throw new Error(`Field '${fieldName}' must be a string, got ${typeof value}`);
        }
        // Check for path traversal patterns immediately for string values
        if (value.includes('../') || value.includes('..\\')) {
          throw new Error(`Field '${fieldName}' contains invalid path traversal patterns`);
        }
        return value;

      case this.TYPES.NUMBER:
        if (typeof value === 'string') {
          const num = parseFloat(value);
          if (isNaN(num)) {
            throw new Error(`Field '${fieldName}' must be a valid number`);
          }
          return num;
        }
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Field '${fieldName}' must be a number`);
        }
        return value;

      case this.TYPES.INTEGER:
        const intValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!Number.isInteger(intValue)) {
          throw new Error(`Field '${fieldName}' must be an integer`);
        }
        return intValue;

      case this.TYPES.BOOLEAN:
        if (typeof value === 'string') {
          if (value === 'true') return true;
          if (value === 'false') return false;
        }
        if (typeof value !== 'boolean') {
          throw new Error(`Field '${fieldName}' must be a boolean`);
        }
        return value;

      case this.TYPES.DATE:
        if (value instanceof Date) {
          if (isNaN(value.getTime())) {
            throw new Error(`Field '${fieldName}' contains invalid date`);
          }
          return value.toISOString();
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error(`Field '${fieldName}' must be a valid date string`);
          }
          return value;
        }
        throw new Error(`Field '${fieldName}' must be a date or date string`);

      case this.TYPES.EMAIL:
        if (typeof value !== 'string' || !validator.isEmail(value)) {
          throw new Error(`Field '${fieldName}' must be a valid email address`);
        }
        return validator.normalizeEmail(value);

      case this.TYPES.URL:
        if (typeof value !== 'string' || !validator.isURL(value, { require_protocol: true })) {
          throw new Error(`Field '${fieldName}' must be a valid URL with protocol`);
        }
        return value;

      case this.TYPES.ARRAY:
        if (!Array.isArray(value)) {
          throw new Error(`Field '${fieldName}' must be an array`);
        }
        return value;

      case this.TYPES.OBJECT:
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error(`Field '${fieldName}' must be an object`);
        }
        return value;

      case this.TYPES.ID:
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new Error(`Field '${fieldName}' must be a string or number ID`);
        }
        // Check for path traversal in ID values
        const idStrCheck = String(value);
        if (idStrCheck.includes('../') || idStrCheck.includes('..\\')) {
          throw new Error(`Field '${fieldName}' contains invalid path traversal patterns`);
        }
        // Keep numeric IDs as numbers if they're valid integers
        if (typeof value === 'number' && Number.isInteger(value)) {
          return value;
        }
        const idStr = String(value);
        if (!this.PATTERNS.ID.test(idStr)) {
          throw new Error(`Field '${fieldName}' contains invalid ID format`);
        }
        return idStr;

      default:
        return value;
    }
  }

  /**
   * Apply additional validation rules
   * @param {*} value - Value to validate
   * @param {Object} schema - Validation schema
   * @param {string} fieldName - Field name for errors
   * @returns {*} Validated value
   */
  static applyValidationRules(value, schema, fieldName) {
    // String validations
    if (typeof value === 'string') {
      // Length validation
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        throw new Error(`Field '${fieldName}' must be at least ${schema.minLength} characters`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        throw new Error(`Field '${fieldName}' must be at most ${schema.maxLength} characters`);
      }

      // Pattern validation
      if (schema.pattern) {
        const pattern = typeof schema.pattern === 'string' 
          ? this.PATTERNS[schema.pattern] 
          : schema.pattern;
        if (!pattern.test(value)) {
          throw new Error(`Field '${fieldName}' has invalid format`);
        }
      }

      // Sanitization for string values
      if (schema.sanitize !== false) {
        value = this.sanitizeString(value, schema.sanitizeOptions);
      }

      // Trim whitespace by default
      if (schema.trim !== false) {
        value = value.trim();
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        throw new Error(`Field '${fieldName}' must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        throw new Error(`Field '${fieldName}' must be at most ${schema.max}`);
      }
      if (schema.positive && value <= 0) {
        throw new Error(`Field '${fieldName}' must be positive`);
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        throw new Error(`Field '${fieldName}' must have at least ${schema.minItems} items`);
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        throw new Error(`Field '${fieldName}' must have at most ${schema.maxItems} items`);
      }
      
      // Validate array items
      if (schema.items) {
        value = value.map((item, index) => 
          this.validateValue(item, schema.items, `${fieldName}[${index}]`)
        );
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`);
    }

    // Custom validation function
    if (schema.validate) {
      const result = schema.validate(value, fieldName);
      if (result !== true) {
        throw new Error(result || `Field '${fieldName}' failed custom validation`);
      }
    }

    return value;
  }

  /**
   * Sanitize string input to prevent XSS and injection attacks
   * @param {string} value - String to sanitize
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized string
   */
  static sanitizeString(value, options = {}) {
    // Check for path traversal patterns before any other sanitization
    if (value.includes('../') || value.includes('..\\')) {
      throw new Error('Input contains path traversal patterns');
    }
    
    // Basic XSS protection
    let sanitized = xss(value, {
      whiteList: {},  // No HTML tags allowed by default
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
      ...options
    });

    // Remove potential SQL injection patterns more carefully
    // Only remove dangerous patterns, not all quotes
    sanitized = sanitized
      .replace(/';|";/g, ';') // Replace quote+semicolon combinations  
      .replace(/--$/gm, '') // Remove SQL comments at end of lines
      .replace(/\/\*.*?\*\//g, ''); // Remove C-style comments

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    return sanitized;
  }

  /**
   * Validate an entire payload against a schema
   * @param {Object} payload - Payload to validate
   * @param {Object} schema - Validation schema for all fields
   * @returns {Object} Validated and sanitized payload
   * @throws {Error} If validation fails
   */
  static validatePayload(payload, schema) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    const validated = {};

    // Validate defined schema fields
    for (const [field, fieldSchema] of Object.entries(schema)) {
      validated[field] = this.validateValue(payload[field], fieldSchema, field);
    }

    // Check for unexpected fields (strict mode)
    if (schema._strict !== false) {
      const schemaFields = Object.keys(schema).filter(f => !f.startsWith('_'));
      const payloadFields = Object.keys(payload);
      // Filter out prototype pollution attempts silently
      const unexpectedFields = payloadFields.filter(f => {
        // Ignore prototype pollution attempts
        if (f === '__proto__' || f === 'constructor' || f === 'prototype') {
          return false;
        }
        return !schemaFields.includes(f);
      });
      
      if (unexpectedFields.length > 0) {
        throw new Error(`Unexpected fields in payload: ${unexpectedFields.join(', ')}`);
      }
    }

    return validated;
  }

  /**
   * Create a validation middleware for operations
   * @param {Object} validationSchemas - Map of operation names to schemas
   * @returns {Function} Validation middleware
   */
  static createValidator(validationSchemas) {
    return (operation, payload) => {
      const schema = validationSchemas[operation];
      if (!schema) {
        // No schema defined for this operation, return as-is
        return payload;
      }

      try {
        return this.validatePayload(payload, schema);
      } catch (error) {
        throw new Error(`Validation failed for operation '${operation}': ${error.message}`);
      }
    };
  }

  /**
   * Pre-configured validation schemas for commonly used fields.
   * These schemas can be reused across different operations to ensure consistency.
   * 
   * @static
   * @readonly
   * @type {Object<string, Object>}
   * @property {Object} id - Required ID field schema
   * @property {Object} optionalId - Optional ID field schema
   * @property {Object} search - Search term schema (1-100 chars)
   * @property {Object} name - Name field schema (1-200 chars)
   * @property {Object} description - Description field schema (max 5000 chars)
   * @property {Object} limit - Pagination limit schema (1-100)
   * @property {Object} offset - Pagination offset schema (min 0)
   * @property {Object} language - ISO language code schema
   * @property {Object} date - Date field schema
   * @property {Object} weight - Weight value schema (0-1000)
   * @property {Object} reps - Repetitions schema (0-1000)
   * @property {Object} sets - Sets schema (0-100)
   * @property {Object} calories - Calorie value schema (0-10000)
   * @property {Object} protein - Protein value schema in grams (0-1000)
   * @property {Object} carbs - Carbohydrate value schema in grams (0-1000)
   * @property {Object} fat - Fat value schema in grams (0-1000)
   * @property {Object} barcode - Product barcode schema
   * @property {Object} email - Email address schema
   * @property {Object} url - URL schema with protocol requirement
   * 
   * @example
   * // Reuse common schemas in your validation
   * const mySchema = {
   *   ...InputValidator.COMMON_SCHEMAS.id,
   *   customField: { type: InputValidator.TYPES.STRING, maxLength: 50 }
   * };
   */
  static COMMON_SCHEMAS = {
    id: {
      type: this.TYPES.ID,
      required: true,
      sanitize: true
    },
    optionalId: {
      type: this.TYPES.ID,
      required: false,
      sanitize: true
    },
    search: {
      type: this.TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 100,
      sanitize: true
    },
    name: {
      type: this.TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 200,
      sanitize: true
    },
    description: {
      type: this.TYPES.STRING,
      required: false,
      maxLength: 5000,
      sanitize: true
    },
    limit: {
      type: this.TYPES.INTEGER,
      required: false,
      min: 1,
      max: 100,
      default: 20
    },
    offset: {
      type: this.TYPES.INTEGER,
      required: false,
      min: 0,
      default: 0
    },
    language: {
      type: this.TYPES.STRING,
      required: false,
      pattern: 'LANGUAGE_CODE',
      default: 'en'
    },
    date: {
      type: this.TYPES.DATE,
      required: false
    },
    weight: {
      type: this.TYPES.NUMBER,
      required: true,
      min: 0,
      max: 1000
    },
    reps: {
      type: this.TYPES.INTEGER,
      required: false,
      min: 0,
      max: 1000
    },
    sets: {
      type: this.TYPES.INTEGER,
      required: false,
      min: 0,
      max: 100
    },
    calories: {
      type: this.TYPES.NUMBER,
      required: false,
      min: 0,
      max: 10000
    },
    protein: {
      type: this.TYPES.NUMBER,
      required: false,
      min: 0,
      max: 1000
    },
    carbs: {
      type: this.TYPES.NUMBER,
      required: false,
      min: 0,
      max: 1000
    },
    fat: {
      type: this.TYPES.NUMBER,
      required: false,
      min: 0,
      max: 1000
    },
    barcode: {
      type: this.TYPES.STRING,
      required: true,
      pattern: 'BARCODE'
    },
    email: {
      type: this.TYPES.EMAIL,
      required: true
    },
    url: {
      type: this.TYPES.URL,
      required: false
    }
  };
}

module.exports = InputValidator;