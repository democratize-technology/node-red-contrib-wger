/**
 * @fileoverview Custom error classes for Node-RED wger nodes
 * @module utils/custom-errors
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * Base custom error class for wger nodes.
 * @class WgerError
 * @extends Error
 */
class WgerError extends Error {
  constructor(message, code = 'WGER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when a required operation is missing.
 * @class MissingOperationError
 * @extends WgerError
 */
class MissingOperationError extends WgerError {
  constructor(message = 'Operation not specified.') {
    super(message, 'MISSING_OPERATION');
  }
}

/**
 * Error thrown when an invalid or unsupported operation is requested.
 * @class InvalidOperationError
 * @extends WgerError
 */
class InvalidOperationError extends WgerError {
  constructor(operation) {
    super(`Invalid or unsupported operation: ${operation}`, 'INVALID_OPERATION');
    this.operation = operation;
  }
}

/**
 * Error thrown when a required field is missing from the payload.
 * @class RequiredFieldError
 * @extends WgerError
 */
class RequiredFieldError extends WgerError {
  constructor(field) {
    super(`Missing required field: ${field}`, 'REQUIRED_FIELD');
    this.field = field;
  }
}

module.exports = {
  WgerError,
  MissingOperationError,
  InvalidOperationError,
  RequiredFieldError,
};
