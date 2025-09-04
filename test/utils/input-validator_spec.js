const should = require('should');
const InputValidator = require('../../utils/input-validator');

describe('InputValidator', function() {
  describe('Type Validation', function() {
    it('should validate string types correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.STRING, required: true } };
      
      // Valid cases
      const result = InputValidator.validatePayload({ field: 'test' }, schema);
      result.field.should.equal('test');
      
      // Coercion cases
      const coerced = InputValidator.validatePayload({ field: 123 }, schema);
      coerced.field.should.equal('123');
      
      // Invalid cases
      should.throws(() => {
        InputValidator.validatePayload({ field: { obj: 'test' } }, schema);
      }, /must be a string/);
    });

    it('should validate number types correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.NUMBER, required: true } };
      
      // Valid cases
      const result = InputValidator.validatePayload({ field: 42.5 }, schema);
      result.field.should.equal(42.5);
      
      // Coercion from string
      const coerced = InputValidator.validatePayload({ field: '42.5' }, schema);
      coerced.field.should.equal(42.5);
      
      // Invalid cases
      should.throws(() => {
        InputValidator.validatePayload({ field: 'not-a-number' }, schema);
      }, /must be a valid number/);
    });

    it('should validate integer types correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.INTEGER, required: true } };
      
      // Valid cases
      const result = InputValidator.validatePayload({ field: 42 }, schema);
      result.field.should.equal(42);
      
      // Invalid cases - floats
      should.throws(() => {
        InputValidator.validatePayload({ field: 42.5 }, schema);
      }, /must be an integer/);
    });

    it('should validate boolean types correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.BOOLEAN, required: true } };
      
      // Valid cases
      const result = InputValidator.validatePayload({ field: true }, schema);
      result.field.should.equal(true);
      
      // String coercion
      const coercedTrue = InputValidator.validatePayload({ field: 'true' }, schema);
      coercedTrue.field.should.equal(true);
      
      const coercedFalse = InputValidator.validatePayload({ field: 'false' }, schema);
      coercedFalse.field.should.equal(false);
      
      // Invalid cases
      should.throws(() => {
        InputValidator.validatePayload({ field: 'yes' }, schema);
      }, /must be a boolean/);
    });

    it('should validate date types correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.DATE, required: true } };
      
      // Valid ISO string
      const result = InputValidator.validatePayload({ field: '2024-01-01' }, schema);
      result.field.should.equal('2024-01-01');
      
      // Valid Date object
      const date = new Date('2024-01-01');
      const dateResult = InputValidator.validatePayload({ field: date }, schema);
      dateResult.field.should.equal(date.toISOString());
      
      // Invalid date string
      should.throws(() => {
        InputValidator.validatePayload({ field: 'invalid-date' }, schema);
      }, /must be a valid date string/);
    });

    it('should validate email addresses correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.EMAIL, required: true } };
      
      // Valid email
      const result = InputValidator.validatePayload({ field: 'test@example.com' }, schema);
      result.field.should.equal('test@example.com');
      
      // Invalid emails
      should.throws(() => {
        InputValidator.validatePayload({ field: 'not-an-email' }, schema);
      }, /must be a valid email address/);
      
      should.throws(() => {
        InputValidator.validatePayload({ field: '@example.com' }, schema);
      }, /must be a valid email address/);
    });

    it('should validate URLs correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.URL, required: true } };
      
      // Valid URL with protocol
      const result = InputValidator.validatePayload({ field: 'https://example.com' }, schema);
      result.field.should.equal('https://example.com');
      
      // Invalid URL without protocol
      should.throws(() => {
        InputValidator.validatePayload({ field: 'example.com' }, schema);
      }, /must be a valid URL with protocol/);
    });

    it('should validate arrays correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.ARRAY, required: true } };
      
      // Valid array
      const result = InputValidator.validatePayload({ field: [1, 2, 3] }, schema);
      result.field.should.eql([1, 2, 3]);
      
      // Invalid non-array
      should.throws(() => {
        InputValidator.validatePayload({ field: 'not-array' }, schema);
      }, /must be an array/);
    });

    it('should validate IDs correctly', function() {
      const schema = { field: { type: InputValidator.TYPES.ID, required: true } };
      
      // Valid string ID
      const result = InputValidator.validatePayload({ field: 'user-123' }, schema);
      result.field.should.equal('user-123');
      
      // Valid numeric ID stays as number
      const numericResult = InputValidator.validatePayload({ field: 123 }, schema);
      numericResult.field.should.equal(123);
      
      // Invalid ID with special characters
      should.throws(() => {
        InputValidator.validatePayload({ field: 'user@123!' }, schema);
      }, /invalid ID format/);
    });
  });

  describe('Range and Boundary Validation', function() {
    it('should enforce min/max for numbers', function() {
      const schema = {
        weight: {
          type: InputValidator.TYPES.NUMBER,
          required: true,
          min: 0,
          max: 1000
        }
      };
      
      // Valid within range
      const valid = InputValidator.validatePayload({ weight: 75.5 }, schema);
      valid.weight.should.equal(75.5);
      
      // Below minimum
      should.throws(() => {
        InputValidator.validatePayload({ weight: -1 }, schema);
      }, /must be at least 0/);
      
      // Above maximum
      should.throws(() => {
        InputValidator.validatePayload({ weight: 1001 }, schema);
      }, /must be at most 1000/);
    });

    it('should enforce minLength/maxLength for strings', function() {
      const schema = {
        name: {
          type: InputValidator.TYPES.STRING,
          required: true,
          minLength: 2,
          maxLength: 50
        }
      };
      
      // Valid length
      const valid = InputValidator.validatePayload({ name: 'John Doe' }, schema);
      valid.name.should.equal('John Doe');
      
      // Too short
      should.throws(() => {
        InputValidator.validatePayload({ name: 'J' }, schema);
      }, /must be at least 2 characters/);
      
      // Too long
      const longName = 'a'.repeat(51);
      should.throws(() => {
        InputValidator.validatePayload({ name: longName }, schema);
      }, /must be at most 50 characters/);
    });

    it('should enforce minItems/maxItems for arrays', function() {
      const schema = {
        muscles: {
          type: InputValidator.TYPES.ARRAY,
          required: true,
          minItems: 1,
          maxItems: 5
        }
      };
      
      // Valid array size
      const valid = InputValidator.validatePayload({ muscles: [1, 2, 3] }, schema);
      valid.muscles.should.eql([1, 2, 3]);
      
      // Too few items
      should.throws(() => {
        InputValidator.validatePayload({ muscles: [] }, schema);
      }, /must have at least 1 items/);
      
      // Too many items
      should.throws(() => {
        InputValidator.validatePayload({ muscles: [1, 2, 3, 4, 5, 6] }, schema);
      }, /must have at most 5 items/);
    });
  });

  describe('Sanitization and Security', function() {
    it('should sanitize HTML/XSS attempts in strings', function() {
      const schema = {
        comment: {
          type: InputValidator.TYPES.STRING,
          required: true,
          sanitize: true
        }
      };
      
      // XSS attempt
      const xss = InputValidator.validatePayload({ 
        comment: '<script>alert("xss")</script>Hello' 
      }, schema);
      xss.comment.should.equal('Hello');
      
      // HTML tags removed
      const html = InputValidator.validatePayload({ 
        comment: '<b>Bold</b> text' 
      }, schema);
      html.comment.should.equal('Bold text');
    });

    it('should remove SQL injection patterns', function() {
      const schema = {
        query: {
          type: InputValidator.TYPES.STRING,
          required: true,
          sanitize: true
        }
      };
      
      // SQL injection attempts
      const sqlComment = InputValidator.validatePayload({ 
        query: 'admin\'--' 
      }, schema);
      sqlComment.query.should.equal('admin\'');  // Only end -- is removed
      
      const sqlQuotes = InputValidator.validatePayload({ 
        query: '\'; DROP TABLE users;' 
      }, schema);
      sqlQuotes.query.should.equal('; DROP TABLE users;');  // Quote+semicolon becomes just semicolon
    });

    it('should remove null bytes', function() {
      const schema = {
        field: {
          type: InputValidator.TYPES.STRING,
          required: true,
          sanitize: true
        }
      };
      
      const result = InputValidator.validatePayload({ 
        field: 'test\0hidden' 
      }, schema);
      result.field.should.equal('testhidden');
    });

    it('should validate against path traversal in endpoints', function() {
      const schema = {
        endpoint: {
          type: InputValidator.TYPES.STRING,
          required: true,
          validate: (value) => {
            if (value.includes('../') || value.includes('..\\')) {
              return 'Endpoint cannot contain path traversal patterns';
            }
            return true;
          }
        }
      };
      
      // Valid endpoint
      const valid = InputValidator.validatePayload({ 
        endpoint: '/api/v2/exercise/' 
      }, schema);
      valid.endpoint.should.equal('/api/v2/exercise/');
      
      // Path traversal attempt - now caught at type validation level
      should.throws(() => {
        InputValidator.validatePayload({ 
          endpoint: '/api/../../../etc/passwd' 
        }, schema);
      }, /contains invalid path traversal patterns/); // Changed message to match type validation
    });
  });

  describe('Pattern Validation', function() {
    it('should validate barcode patterns', function() {
      const schema = {
        barcode: {
          type: InputValidator.TYPES.STRING,
          required: true,
          pattern: 'BARCODE'
        }
      };
      
      // Valid barcodes
      const valid8 = InputValidator.validatePayload({ barcode: '12345678' }, schema);
      valid8.barcode.should.equal('12345678');
      
      const valid13 = InputValidator.validatePayload({ barcode: '1234567890123' }, schema);
      valid13.barcode.should.equal('1234567890123');
      
      // Invalid - too short
      should.throws(() => {
        InputValidator.validatePayload({ barcode: '1234567' }, schema);
      }, /invalid format/);
      
      // Invalid - contains letters
      should.throws(() => {
        InputValidator.validatePayload({ barcode: '12345678ABC' }, schema);
      }, /invalid format/);
    });

    it('should validate language codes', function() {
      const schema = {
        language: {
          type: InputValidator.TYPES.STRING,
          required: true,
          pattern: 'LANGUAGE_CODE'
        }
      };
      
      // Valid language codes
      const valid2 = InputValidator.validatePayload({ language: 'en' }, schema);
      valid2.language.should.equal('en');
      
      const validRegion = InputValidator.validatePayload({ language: 'en-US' }, schema);
      validRegion.language.should.equal('en-US');
      
      // Invalid format
      should.throws(() => {
        InputValidator.validatePayload({ language: 'english' }, schema);
      }, /invalid format/);
    });
  });

  describe('Enum Validation', function() {
    it('should enforce enum values', function() {
      const schema = {
        ordering: {
          type: InputValidator.TYPES.STRING,
          required: true,
          enum: ['date', '-date', 'name', '-name']
        }
      };
      
      // Valid enum value
      const valid = InputValidator.validatePayload({ ordering: '-date' }, schema);
      valid.ordering.should.equal('-date');
      
      // Invalid enum value
      should.throws(() => {
        InputValidator.validatePayload({ ordering: 'invalid' }, schema);
      }, /must be one of: date, -date, name, -name/);
    });
  });

  describe('Required and Optional Fields', function() {
    it('should enforce required fields', function() {
      const schema = {
        required: { type: InputValidator.TYPES.STRING, required: true },
        optional: { type: InputValidator.TYPES.STRING, required: false }
      };
      
      // Missing required field
      should.throws(() => {
        InputValidator.validatePayload({ optional: 'test' }, schema);
      }, /Required field 'required' is missing/);
      
      // Optional field can be omitted
      const valid = InputValidator.validatePayload({ required: 'test' }, schema);
      valid.required.should.equal('test');
      should.not.exist(valid.optional);
    });

    it('should apply default values', function() {
      const schema = {
        limit: {
          type: InputValidator.TYPES.INTEGER,
          required: false,
          default: 20
        }
      };
      
      // Default value applied
      const result = InputValidator.validatePayload({}, schema);
      result.limit.should.equal(20);
      
      // Provided value overrides default
      const override = InputValidator.validatePayload({ limit: 50 }, schema);
      override.limit.should.equal(50);
    });
  });

  describe('Strict Mode', function() {
    it('should reject unexpected fields in strict mode', function() {
      const schema = {
        field1: { type: InputValidator.TYPES.STRING, required: true },
        _strict: true  // Explicit strict mode
      };
      
      // Unexpected field rejected
      should.throws(() => {
        InputValidator.validatePayload({ 
          field1: 'test',
          unexpectedField: 'value' 
        }, schema);
      }, /Unexpected fields in payload: unexpectedField/);
    });

    it('should allow unexpected fields when strict is false', function() {
      const schema = {
        field1: { type: InputValidator.TYPES.STRING, required: true },
        _strict: false
      };
      
      // Unexpected field allowed
      const result = InputValidator.validatePayload({ 
        field1: 'test',
        unexpectedField: 'value' 
      }, schema);
      result.field1.should.equal('test');
    });
  });

  describe('Custom Validation Functions', function() {
    it('should support custom validation functions', function() {
      const schema = {
        age: {
          type: InputValidator.TYPES.INTEGER,
          required: true,
          validate: (value, fieldName) => {
            if (value < 18) {
              return `${fieldName} must be at least 18`;
            }
            if (value > 120) {
              return `${fieldName} is unrealistic`;
            }
            return true;
          }
        }
      };
      
      // Valid age
      const valid = InputValidator.validatePayload({ age: 25 }, schema);
      valid.age.should.equal(25);
      
      // Too young
      should.throws(() => {
        InputValidator.validatePayload({ age: 17 }, schema);
      }, /age must be at least 18/);
      
      // Unrealistic
      should.throws(() => {
        InputValidator.validatePayload({ age: 150 }, schema);
      }, /age is unrealistic/);
    });
  });

  describe('Array Item Validation', function() {
    it('should validate array items', function() {
      const schema = {
        muscles: {
          type: InputValidator.TYPES.ARRAY,
          required: true,
          items: {
            type: InputValidator.TYPES.INTEGER,
            min: 1,
            max: 100
          }
        }
      };
      
      // Valid array with valid items
      const valid = InputValidator.validatePayload({ muscles: [1, 50, 100] }, schema);
      valid.muscles.should.eql([1, 50, 100]);
      
      // Invalid item in array
      should.throws(() => {
        InputValidator.validatePayload({ muscles: [1, 101, 50] }, schema);
      }, /muscles\[1\].*must be at most 100/);
      
      // Wrong type in array
      should.throws(() => {
        InputValidator.validatePayload({ muscles: [1, 'two', 3] }, schema);
      }, /muscles\[1\].*must be an integer/);
    });
  });

  describe('Complex Schema Validation', function() {
    it('should validate workout session creation schema', function() {
      const schema = {
        workout: { type: InputValidator.TYPES.ID, required: true },
        date: { type: InputValidator.TYPES.DATE, required: true },
        notes: { 
          type: InputValidator.TYPES.STRING, 
          required: false,
          maxLength: 1000,
          sanitize: true
        },
        impression: {
          type: InputValidator.TYPES.INTEGER,
          required: false,
          min: 1,
          max: 5
        },
        time_start: {
          type: InputValidator.TYPES.STRING,
          required: false,
          pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
        }
      };
      
      // Valid complete payload
      const valid = InputValidator.validatePayload({
        workout: 'workout-123',
        date: '2024-01-15',
        notes: 'Great workout!',
        impression: 4,
        time_start: '14:30'
      }, schema);
      
      valid.workout.should.equal('workout-123');
      valid.date.should.equal('2024-01-15');
      valid.notes.should.equal('Great workout!');
      valid.impression.should.equal(4);
      valid.time_start.should.equal('14:30');
      
      // Invalid time format
      should.throws(() => {
        InputValidator.validatePayload({
          workout: 'workout-123',
          date: '2024-01-15',
          time_start: '25:00'  // Invalid hour
        }, schema);
      }, /invalid format/);
    });
  });

  describe('Security Edge Cases', function() {
    it('should handle prototype pollution attempts', function() {
      const schema = {
        field: { type: InputValidator.TYPES.STRING, required: true }
      };
      
      const maliciousPayload = {
        field: 'test',
        '__proto__': { admin: true },
        'constructor': { prototype: { isAdmin: true } }
      };
      
      // Should silently ignore prototype pollution attempts and validate normally
      const result = InputValidator.validatePayload(maliciousPayload, schema);
      result.field.should.equal('test');
      // The validated result should not include the malicious fields
      Object.keys(result).should.eql(['field']);
      // Verify no pollution occurred
      const testObj = {};
      should.not.exist(testObj.admin);
      should.not.exist(testObj.isAdmin);
    });

    it('should handle extremely long inputs', function() {
      const schema = {
        field: {
          type: InputValidator.TYPES.STRING,
          required: true,
          maxLength: 100
        }
      };
      
      // Attempt buffer overflow with very long string
      const longString = 'a'.repeat(1000000);
      should.throws(() => {
        InputValidator.validatePayload({ field: longString }, schema);
      }, /must be at most 100 characters/);
    });

    it('should handle Unicode and special characters', function() {
      const schema = {
        name: {
          type: InputValidator.TYPES.STRING,
          required: true,
          sanitize: true
        }
      };
      
      // Unicode should be preserved
      const unicode = InputValidator.validatePayload({ 
        name: 'José García 你好 🏃‍♂️' 
      }, schema);
      unicode.name.should.equal('José García 你好 🏃‍♂️');
      
      // Control characters should be handled
      const control = InputValidator.validatePayload({ 
        name: 'test\r\n\tname' 
      }, schema);
      control.name.should.equal('test\r\n\tname');
    });
  });

  describe('Security - Path Traversal Prevention', function() {
    it('should reject path traversal patterns in STRING type', function() {
      const schema = {
        path: { type: InputValidator.TYPES.STRING, required: true }
      };
      
      // Should reject ../ pattern
      should.throws(() => {
        InputValidator.validatePayload({ path: '../etc/passwd' }, schema);
      }, /contains invalid path traversal patterns/);
      
      // Should reject ..\\ pattern  
      should.throws(() => {
        InputValidator.validatePayload({ path: '..\\windows\\system32' }, schema);
      }, /contains invalid path traversal patterns/);
      
      // Should reject mixed patterns
      should.throws(() => {
        InputValidator.validatePayload({ path: 'something/../../../etc/passwd' }, schema);
      }, /contains invalid path traversal patterns/);
    });

    it('should reject path traversal patterns in ID type', function() {
      const schema = {
        id: { type: InputValidator.TYPES.ID, required: true }
      };
      
      // Should reject ../ in ID values
      should.throws(() => {
        InputValidator.validatePayload({ id: '../123' }, schema);
      }, /contains invalid path traversal patterns/);
      
      // Should reject ..\\ in ID values
      should.throws(() => {
        InputValidator.validatePayload({ id: '..\\456' }, schema);
      }, /contains invalid path traversal patterns/);
    });

    it('should reject path traversal in sanitized strings', function() {
      const schema = {
        text: { type: InputValidator.TYPES.STRING, required: true, sanitize: true }
      };
      
      // Should reject during sanitization
      should.throws(() => {
        InputValidator.validatePayload({ text: 'safe/../dangerous' }, schema);
      }, /contains invalid path traversal patterns/);
    });

    it('should reject path traversal patterns in API endpoint validation', function() {
      // Path traversal is now caught at type validation level before custom validation
      const schema = {
        endpoint: {
          type: InputValidator.TYPES.STRING,
          required: true
        }
      };
      
      // Path traversal is caught automatically during type validation
      should.throws(() => {
        InputValidator.validatePayload({ endpoint: '/api/v2/../admin' }, schema);
      }, /contains invalid path traversal patterns/);
    });

    it('should properly validate safe paths without traversal', function() {
      const schema = {
        path: { type: InputValidator.TYPES.STRING, required: true }
      };
      
      // These should all be valid
      const valid1 = InputValidator.validatePayload({ path: '/api/v2/exercise/' }, schema);
      valid1.path.should.equal('/api/v2/exercise/');
      
      const valid2 = InputValidator.validatePayload({ path: 'workouts/123/sets' }, schema);
      valid2.path.should.equal('workouts/123/sets');
      
      const valid3 = InputValidator.validatePayload({ path: 'file.name.with.dots' }, schema);
      valid3.path.should.equal('file.name.with.dots');
    });
  });

  describe('Security - Parameter Validation', function() {
    it('should validate object parameters for path traversal', function() {
      const schema = {
        params: {
          type: InputValidator.TYPES.OBJECT,
          required: false,
          validate: (value) => {
            for (const [key, val] of Object.entries(value)) {
              if (typeof val === 'string') {
                if (val.includes('../') || val.includes('..\\')) {
                  return `Parameter '${key}' contains path traversal patterns`;
                }
              }
            }
            return true;
          }
        }
      };
      
      // Should reject path traversal in object values
      should.throws(() => {
        InputValidator.validatePayload({ 
          params: { id: '123', path: '../admin' }
        }, schema);
      }, /Parameter 'path' contains path traversal patterns/);
      
      // Should allow valid parameters
      const valid = InputValidator.validatePayload({ 
        params: { id: '123', name: 'test' }
      }, schema);
      valid.params.id.should.equal('123');
    });
  });

  describe('Security - Prototype Pollution Prevention', function() {
    it('should silently filter prototype pollution attempts', function() {
      const schema = {
        name: { type: InputValidator.TYPES.STRING, required: true }
      };
      
      // Prototype pollution attempts are silently filtered in the unexpectedFields check
      // The validator doesn't add these fields to the result
      const payload1 = { name: 'test', __proto__: { evil: true } };
      const result1 = InputValidator.validatePayload(payload1, schema);
      result1.should.have.property('name', 'test');
      Object.keys(result1).should.deepEqual(['name']); // Only validated fields are returned
      
      // Should silently ignore constructor
      const payload2 = { name: 'test', constructor: { evil: true } };
      const result2 = InputValidator.validatePayload(payload2, schema);
      result2.should.have.property('name', 'test');
      Object.keys(result2).should.deepEqual(['name']);
      
      // Should silently ignore prototype
      const payload3 = { name: 'test', prototype: { evil: true } };
      const result3 = InputValidator.validatePayload(payload3, schema);
      result3.should.have.property('name', 'test');
      Object.keys(result3).should.deepEqual(['name']);
    });
  });
});