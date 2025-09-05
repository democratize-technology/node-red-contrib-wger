/**
 * @fileoverview Comprehensive input validation and sanitization utility
 * @module utils/input-validator
 * @requires validator
 * @requires dompurify
 * @requires zod
 * @version 2.0.0
 * @author Node-RED wger contrib team
 */

const validator = require('validator');
const { z } = require('zod');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Initialize DOMPurify for Node.js environment
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

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
    // Handle undefined/null based on required setting first
    if (value === undefined || value === null) {
      if (schema.required) {
        throw new Error(`Required field '${fieldName}' is missing or null`);
      }
      return schema.default !== undefined ? schema.default : value;
    }

    try {
      const zodSchema = this._buildZodSchema(schema, fieldName);
      return zodSchema.parse(value);
    } catch (error) {
      if (error.issues) {
        // Zod validation error - convert to expected format
        const issue = error.issues[0];
        throw new Error(this._formatZodError(issue, fieldName, schema));
      }
      throw error;
    }
  }

  /**
   * Build a Zod schema from our legacy schema format
   * @param {Object} schema - Legacy schema definition
   * @param {string} fieldName - Field name for error messages
   * @returns {z.ZodType} Zod schema
   * @private
   */
  static _buildZodSchema(schema, fieldName) {
    // Use strategy pattern to build base schema by type
    const schemaBuilder = this._getSchemaBuilder(schema.type);
    let zodSchema = schemaBuilder.call(this, fieldName, schema);

    // Apply additional validation rules
    zodSchema = this._applyValidationRules(zodSchema, schema, fieldName);
    
    return zodSchema;
  }

  /**
   * Gets the appropriate schema builder function for the given type.
   * 
   * @private
   * @param {string} type - The validation type
   * @returns {Function} Schema builder function
   */
  static _getSchemaBuilder(type) {
    const builders = {
      [this.TYPES.STRING]: this._buildStringSchema,
      [this.TYPES.NUMBER]: this._buildNumberSchema,
      [this.TYPES.INTEGER]: this._buildIntegerSchema,
      [this.TYPES.BOOLEAN]: this._buildBooleanSchema,
      [this.TYPES.DATE]: this._buildDateSchema,
      [this.TYPES.EMAIL]: this._buildEmailSchema,
      [this.TYPES.URL]: this._buildUrlSchema,
      [this.TYPES.ARRAY]: this._buildArraySchema,
      [this.TYPES.OBJECT]: this._buildObjectSchema,
      [this.TYPES.ID]: this._buildIdSchema,
    };
    
    return builders[type] || this._buildAnySchema;
  }

  /**
   * Builds a Zod schema for string validation with type coercion and security checks.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod string schema
   */
  static _buildStringSchema(fieldName, schema) {
    return z.union([
      z.string(),
      z.number().transform(val => String(val)),
      z.boolean().transform(val => String(val))
    ], {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_union') {
          return { message: `Field '${fieldName}' must be a string, got ${typeof ctx.data}` };
        }
        return { message: issue.message || `Field '${fieldName}' must be a string` };
      }
    }).refine((val) => {
      // Path traversal check
      if (val.includes('../') || val.includes('..\\')) {
        return false;
      }
      return true;
    }, { message: `Field '${fieldName}' contains invalid path traversal patterns` });
  }

  /**
   * Builds a Zod schema for number validation with string coercion.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod number schema
   */
  static _buildNumberSchema(fieldName, schema) {
    return z.union([
      z.number(),
      z.string().transform((val, ctx) => {
        const num = parseFloat(val);
        if (isNaN(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Field '${fieldName}' must be a valid number`
          });
          return z.NEVER;
        }
        return num;
      })
    ], {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_union') {
          return { message: `Field '${fieldName}' must be a valid number` };
        }
        return { message: issue.message || `Field '${fieldName}' must be a valid number` };
      }
    });
  }

  /**
   * Builds a Zod schema for integer validation with string coercion.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod integer schema
   */
  static _buildIntegerSchema(fieldName, schema) {
    return z.union([
      z.number().int(),
      z.string().transform((val, ctx) => {
        const num = parseInt(val, 10);
        if (!Number.isInteger(num)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Field '${fieldName}' must be an integer`
          });
          return z.NEVER;
        }
        return num;
      })
    ], {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_union') {
          return { message: `Field '${fieldName}' must be an integer` };
        }
        return { message: issue.message || `Field '${fieldName}' must be an integer` };
      }
    });
  }

  /**
   * Builds a Zod schema for boolean validation with string coercion.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod boolean schema
   */
  static _buildBooleanSchema(fieldName, schema) {
    return z.union([
      z.boolean(),
      z.string().transform((val, ctx) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field '${fieldName}' must be a boolean`
        });
        return z.NEVER;
      })
    ], {
      errorMap: (issue, ctx) => {
        if (issue.code === 'invalid_union') {
          return { message: `Field '${fieldName}' must be a boolean` };
        }
        return { message: issue.message || `Field '${fieldName}' must be a boolean` };
      }
    });
  }

  /**
   * Builds a Zod schema for date validation with string/Date coercion.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod date schema
   */
  static _buildDateSchema(fieldName, schema) {
    return z.union([
      z.date().transform(date => {
        if (isNaN(date.getTime())) {
          throw new Error(`Field '${fieldName}' contains invalid date`);
        }
        return date.toISOString();
      }),
      z.string().refine((val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) {
          return false;
        }
        return true;
      }, { message: `Field '${fieldName}' must be a valid date string` })
    ]);
  }

  /**
   * Builds a Zod schema for email validation with normalization.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod email schema
   */
  static _buildEmailSchema(fieldName, schema) {
    return z.string()
      .email({ message: `Field '${fieldName}' must be a valid email address` })
      .transform(val => validator.normalizeEmail(val) || val);
  }

  /**
   * Builds a Zod schema for URL validation with protocol requirement.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod URL schema
   */
  static _buildUrlSchema(fieldName, schema) {
    return z.string().url({ message: `Field '${fieldName}' must be a valid URL with protocol` })
      .refine(val => validator.isURL(val, { require_protocol: true }), {
        message: `Field '${fieldName}' must be a valid URL with protocol`
      });
  }

  /**
   * Builds a Zod schema for array validation.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod array schema
   */
  static _buildArraySchema(fieldName, schema) {
    return z.array(z.any(), {
      invalid_type_error: `Field '${fieldName}' must be an array`,
      required_error: `Required field '${fieldName}' is missing or null`
    });
  }

  /**
   * Builds a Zod schema for object validation.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod object schema
   */
  static _buildObjectSchema(fieldName, schema) {
    return z.object({}).passthrough()
      .refine(val => val !== null && !Array.isArray(val), {
        message: `Field '${fieldName}' must be an object`
      });
  }

  /**
   * Builds a Zod schema for ID validation with security checks.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod ID schema
   */
  static _buildIdSchema(fieldName, schema) {
    return z.union([
      z.string(),
      z.number().int()
    ]).transform((val, ctx) => {
      const idStrCheck = String(val);
      if (idStrCheck.includes('../') || idStrCheck.includes('..\\')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field '${fieldName}' contains invalid path traversal patterns`
        });
        return z.NEVER;
      }
      
      if (typeof val === 'number' && Number.isInteger(val)) {
        return val;
      }
      
      const idStr = String(val);
      if (!this.PATTERNS.ID.test(idStr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Field '${fieldName}' contains invalid ID format`
        });
        return z.NEVER;
      }
      return idStr;
    });
  }

  /**
   * Builds a fallback schema for unknown types.
   * 
   * @private
   * @param {string} fieldName - Field name for error messages
   * @param {Object} schema - Schema configuration
   * @returns {z.ZodType} Zod any schema
   */
  static _buildAnySchema(fieldName, schema) {
    return z.any();
  }

  /**
   * Apply additional validation rules to Zod schema
   * @param {z.ZodType} zodSchema - Base Zod schema
   * @param {Object} schema - Legacy schema definition
   * @param {string} fieldName - Field name for errors
   * @returns {z.ZodType} Enhanced Zod schema
   * @private
   */
  static _applyValidationRules(zodSchema, schema, fieldName) {
    // Apply type-specific validations
    if (schema.type === this.TYPES.STRING) {
      zodSchema = this._applyStringValidations(zodSchema, schema, fieldName);
    }
    
    if (schema.type === this.TYPES.NUMBER || schema.type === this.TYPES.INTEGER) {
      zodSchema = this._applyNumberValidations(zodSchema, schema, fieldName);
    }
    
    if (schema.type === this.TYPES.ARRAY) {
      zodSchema = this._applyArrayValidations(zodSchema, schema, fieldName);
    }

    // Apply common validations
    zodSchema = this._applyCommonValidations(zodSchema, schema, fieldName);
    
    return zodSchema;
  }

  /**
   * Applies string-specific validation rules including length, pattern, and sanitization.
   * 
   * @private
   * @param {z.ZodType} zodSchema - Base Zod schema
   * @param {Object} schema - Schema configuration
   * @param {string} fieldName - Field name for error messages
   * @returns {z.ZodType} Enhanced schema with string validations
   */
  static _applyStringValidations(zodSchema, schema, fieldName) {
    // Length validation
    if (schema.minLength !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val.length >= schema.minLength,
        `Field '${fieldName}' must be at least ${schema.minLength} characters`
      );
    }
    if (schema.maxLength !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val.length <= schema.maxLength,
        `Field '${fieldName}' must be at most ${schema.maxLength} characters`
      );
    }

    // Pattern validation
    if (schema.pattern) {
      const pattern = typeof schema.pattern === 'string' 
        ? this.PATTERNS[schema.pattern] 
        : schema.pattern;
      zodSchema = zodSchema.refine(
        (val) => pattern.test(val),
        `Field '${fieldName}' has invalid format`
      );
    }

    // Sanitization and trimming
    zodSchema = zodSchema.transform((val, ctx) => {
      // Trim whitespace by default
      if (schema.trim !== false) {
        val = val.trim();
      }

      // Sanitization for string values
      if (schema.sanitize !== false) {
        try {
          val = this.sanitizeString(val, schema.sanitizeOptions);
        } catch (error) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error.message
          });
          return z.NEVER;
        }
      }
      return val;
    });
    
    return zodSchema;
  }

  /**
   * Applies number-specific validation rules including min/max and positive constraints.
   * 
   * @private
   * @param {z.ZodType} zodSchema - Base Zod schema
   * @param {Object} schema - Schema configuration
   * @param {string} fieldName - Field name for error messages
   * @returns {z.ZodType} Enhanced schema with number validations
   */
  static _applyNumberValidations(zodSchema, schema, fieldName) {
    if (schema.min !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val >= schema.min,
        `Field '${fieldName}' must be at least ${schema.min}`
      );
    }
    if (schema.max !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val <= schema.max,
        `Field '${fieldName}' must be at most ${schema.max}`
      );
    }
    if (schema.positive) {
      zodSchema = zodSchema.refine(
        (val) => val > 0,
        `Field '${fieldName}' must be positive`
      );
    }
    
    return zodSchema;
  }

  /**
   * Applies array-specific validation rules including length constraints and item validation.
   * 
   * @private
   * @param {z.ZodType} zodSchema - Base Zod schema
   * @param {Object} schema - Schema configuration
   * @param {string} fieldName - Field name for error messages
   * @returns {z.ZodType} Enhanced schema with array validations
   */
  static _applyArrayValidations(zodSchema, schema, fieldName) {
    if (schema.minItems !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val.length >= schema.minItems,
        `Field '${fieldName}' must have at least ${schema.minItems} items`
      );
    }
    if (schema.maxItems !== undefined) {
      zodSchema = zodSchema.refine(
        (val) => val.length <= schema.maxItems,
        `Field '${fieldName}' must have at most ${schema.maxItems} items`
      );
    }
    
    // Validate array items
    if (schema.items) {
      zodSchema = zodSchema.transform((arr, ctx) => {
        return arr.map((item, index) => {
          try {
            return this.validateValue(item, schema.items, `${fieldName}[${index}]`);
          } catch (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: error.message,
              path: [index]
            });
            return item;
          }
        });
      });
    }
    
    return zodSchema;
  }

  /**
   * Applies common validation rules that apply to all types (enum, custom validation).
   * 
   * @private
   * @param {z.ZodType} zodSchema - Base Zod schema
   * @param {Object} schema - Schema configuration
   * @param {string} fieldName - Field name for error messages
   * @returns {z.ZodType} Enhanced schema with common validations
   */
  static _applyCommonValidations(zodSchema, schema, fieldName) {
    // Enum validation
    if (schema.enum) {
      zodSchema = zodSchema.refine(
        (value) => schema.enum.includes(value),
        `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`
      );
    }

    // Custom validation function
    if (schema.validate) {
      zodSchema = zodSchema.superRefine((value, ctx) => {
        const result = schema.validate(value, fieldName);
        if (result !== true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result || `Field '${fieldName}' failed custom validation`
          });
        }
      });
    }

    return zodSchema;
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
    
    // Enhanced XSS protection with DOMPurify
    let sanitized = DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [], // No HTML tags allowed by default
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Keep text content, remove tags
      ...options
    });

    // Remove potential SQL injection patterns more carefully
    // Only remove dangerous patterns, not all quotes
    sanitized = sanitized
      .replace(/';|";/g, ';') // Replace quote+semicolon combinations  
      .replace(/--/g, '') // Remove SQL comments (all -- patterns)
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
    
    // First, create a clean payload that excludes prototype pollution attempts
    const cleanPayload = {};
    for (const [key, value] of Object.entries(payload)) {
      // Silently exclude prototype pollution attempts
      if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        cleanPayload[key] = value;
      }
    }

    // Validate defined schema fields from clean payload
    for (const [field, fieldSchema] of Object.entries(schema)) {
      if (!field.startsWith('_')) { // Skip schema configuration fields
        validated[field] = this.validateValue(cleanPayload[field], fieldSchema, field);
      }
    }

    // Check for unexpected fields (strict mode) using clean payload
    if (schema._strict !== false) {
      const schemaFields = Object.keys(schema).filter(f => !f.startsWith('_'));
      const payloadFields = Object.keys(cleanPayload);
      const unexpectedFields = payloadFields.filter(f => !schemaFields.includes(f));
      
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
   * Format Zod error to match legacy error format
   * @param {Object} issue - Zod validation issue
   * @param {string} fieldName - Field name being validated
   * @returns {string} Formatted error message
   * @private
   */
  static _formatZodError(issue, fieldName, schema = null) {
    // Map Zod error codes to our expected messages
    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'string') {
          return `Field '${fieldName}' must be a string, got ${issue.received}`;
        }
        if (issue.expected === 'number') {
          // Check if this is an integer field by looking at the schema
          if (schema && schema.type === InputValidator.TYPES.INTEGER) {
            return `Field '${fieldName}' must be an integer`;
          }
          return `Field '${fieldName}' must be a valid number`;
        }
        if (issue.expected === 'boolean') {
          return `Field '${fieldName}' must be a boolean`;
        }
        if (issue.expected === 'array') {
          return `Field '${fieldName}' must be an array`;
        }
        if (issue.expected === 'object') {
          return `Field '${fieldName}' must be an object`;
        }
        return issue.message;
      case 'invalid_union':
        // Check if this is an integer field first - integer unions should always say "must be an integer"
        if (schema && schema.type === InputValidator.TYPES.INTEGER) {
          return `Field '${fieldName}' must be an integer`;
        }
        
        // Check if this union has a custom error message from errorMap
        if (issue.message && !issue.message.startsWith('Invalid input')) {
          return issue.message;
        }
        
        // Handle union type errors more specifically
        if (issue.errors && issue.errors[0] && issue.errors[0][0]) {
          const firstError = issue.errors[0][0];
          if (firstError.code === 'invalid_type') {
            const expectedType = firstError.expected;
            const receivedType = firstError.message.includes('received object') ? 'object' :
                               firstError.message.includes('received array') ? 'array' :
                               firstError.message.includes('received null') ? 'null' :
                               firstError.message.includes('received undefined') ? 'undefined' :
                               'unknown';
            
            if (expectedType === 'string') {
              return `Field '${fieldName}' must be a string, got ${receivedType}`;
            }
            if (expectedType === 'int') {
              return `Field '${fieldName}' must be an integer`;
            }
            if (expectedType === 'number') {
              return `Field '${fieldName}' must be a valid number`;
            }
            if (expectedType === 'boolean') {
              return `Field '${fieldName}' must be a boolean`;
            }
            if (expectedType === 'array') {
              return `Field '${fieldName}' must be an array`;
            }
            return `Field '${fieldName}' must be ${expectedType}, got ${receivedType}`;
          }
        }
        return `Field '${fieldName}' has invalid type`;
      case 'too_small':
        if (issue.type === 'string') {
          return `Field '${fieldName}' must be at least ${issue.minimum} characters`;
        }
        if (issue.type === 'array') {
          return `Field '${fieldName}' must have at least ${issue.minimum} items`;
        }
        return `Field '${fieldName}' must be at least ${issue.minimum}`;
      case 'too_big':
        if (issue.type === 'string') {
          return `Field '${fieldName}' must be at most ${issue.maximum} characters`;
        }
        if (issue.type === 'array') {
          return `Field '${fieldName}' must have at most ${issue.maximum} items`;
        }
        return `Field '${fieldName}' must be at most ${issue.maximum}`;
      case 'invalid_string':
        if (issue.validation === 'email') {
          return `Field '${fieldName}' must be a valid email address`;
        }
        if (issue.validation === 'url') {
          return `Field '${fieldName}' must be a valid URL with protocol`;
        }
        if (issue.validation === 'regex') {
          return `Field '${fieldName}' has invalid format`;
        }
        return issue.message;
      case 'custom':
        // Return custom error messages as-is
        return issue.message;
      default:
        // Check if the message already contains the expected format
        if (issue.message && !issue.message.startsWith('Invalid input')) {
          return issue.message;
        }
        return `Field '${fieldName}' validation failed: ${issue.message}`;
    }
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