# Constants Configuration Guide

## Overview

This document describes the centralized constants system implemented to replace hardcoded strings and magic values throughout the `node-red-contrib-wger` codebase.

## Constants File Location

All constants are defined in `/utils/constants.js` and exported as organized modules.

## Available Constants Modules

### API Configuration (`API`)

Contains all API-related constants including endpoints, headers, and timeouts.

```javascript
const { API } = require('../utils/constants');

// Examples:
API.ENDPOINTS.EXERCISES           // '/api/v2/exercisebaseinfo/'
API.ENDPOINTS.WORKOUT_BY_ID       // '/api/v2/workout/{id}/'
API.HEADERS.CONTENT_TYPE          // 'application/json'
API.CONNECTION_TIMEOUT            // 5000
```

### Authentication (`AUTH`)

Authentication types, prefixes, and header names.

```javascript
const { AUTH } = require('../utils/constants');

// Examples:
AUTH.TYPES.TOKEN                  // 'token'
AUTH.TYPES.JWT                    // 'jwt'
AUTH.PREFIXES.TOKEN               // 'Token '
AUTH.PREFIXES.BEARER              // 'Bearer '
AUTH.HEADER_NAME                  // 'Authorization'
```

### Node Status (`STATUS`)

Node-RED status indicators including colors, shapes, and standard messages.

```javascript
const { STATUS } = require('../utils/constants');

// Examples:
STATUS.COLORS.BLUE                // 'blue'
STATUS.SHAPES.DOT                 // 'dot'
STATUS.MESSAGES.REQUESTING        // 'requesting...'
STATUS.MESSAGES.SUCCESS           // 'success'
```

### Default Values (`DEFAULTS`)

Default configuration values used throughout the system.

```javascript
const { DEFAULTS } = require('../utils/constants');

// Examples:
DEFAULTS.API_URL                  // 'https://wger.de'
DEFAULTS.AUTH_TYPE                // 'none'
DEFAULTS.LANGUAGE                 // 'en'
DEFAULTS.TEST_MODE_PATTERNS       // ['localhost', 'test']
```

### Error Messages (`ERRORS`)

Standardized error messages and validation patterns.

```javascript
const { ERRORS } = require('../utils/constants');

// Examples:
ERRORS.MISSING_OPERATION          // 'No operation specified'
ERRORS.REQUIRED_FIELD             // '{field} is required'
ERRORS.FIELD_NAMES.WORKOUT_ID     // 'workoutId'
```

### Node-RED Configuration (`NODE_RED`)

Node-RED specific constants like node types and credential types.

```javascript
const { NODE_RED } = require('../utils/constants');

// Examples:
NODE_RED.NODE_TYPES.CONFIG        // 'wger-config'
NODE_RED.CREDENTIAL_TYPES.PASSWORD // 'password'
```

## Benefits of Constants Extraction

### 1. **Centralized Configuration**
- All configuration values in one place
- Easy to modify API endpoints, messages, or defaults
- Consistent values across the entire codebase

### 2. **Type Safety & Intellisense**
- Clear module structure provides better IDE support
- Reduces typos in string literals
- Easier refactoring

### 3. **Internationalization Ready**
- Status messages and error text centralized
- Language defaults configurable
- Foundation for multi-language support

### 4. **Environment Configuration**
- Test mode detection patterns configurable
- API URLs easily switchable
- Timeout values adjustable

### 5. **Maintenance Benefits**
- Single source of truth for all constants
- No more hunting for hardcoded strings
- Easier to audit and update configurations

## Migration Summary

The following hardcoded values were successfully extracted:

### API Endpoints (47 occurrences)
- Exercise endpoints: `/api/v2/exercisebaseinfo/`, `/api/v2/exercise/search/`, etc.
- Workout endpoints: `/api/v2/workout/`, `/api/v2/workoutsession/`, etc.
- Nutrition endpoints: `/api/v2/nutritionplan/`, `/api/v2/meal/`, etc.
- User endpoints: `/api/v2/userprofile/`, `/api/v2/setting/`, etc.
- Weight endpoints: `/api/v2/weightentry/`

### Status Messages (15 occurrences)
- `'requesting...'`, `'success'`, `'error'`
- `'no operation specified'`, `'Missing server config'`
- Node status colors and shapes

### Authentication (8 occurrences)
- `'Token '`, `'Bearer '` prefixes
- `'Authorization'` header name
- Auth types: `'none'`, `'token'`, `'jwt'`

### Default Values (12 occurrences)
- Default API URL: `'https://wger.de'`
- Default language: `'en'`
- Test mode patterns: `'localhost'`, `'test'`

### HTTP Configuration (5 occurrences)
- Content-Type: `'application/json'`
- Connection timeout: `5000`

## Usage Examples

### In Operation Files
```javascript
const { API, DEFAULTS } = require('../../utils/constants');

// Instead of: '/api/v2/exercise/search/'
client.get(API.ENDPOINTS.EXERCISE_SEARCH, {
  term: payload.term,
  language: payload.language || DEFAULTS.LANGUAGE
});
```

### In Node Files
```javascript
const { STATUS, ERRORS } = require('../utils/constants');

// Instead of: { fill: 'blue', shape: 'dot', text: 'requesting...' }
node.status({
  fill: STATUS.COLORS.BLUE,
  shape: STATUS.SHAPES.DOT,
  text: STATUS.MESSAGES.REQUESTING
});
```

### In Configuration
```javascript
const { AUTH, DEFAULTS } = require('../utils/constants');

// Instead of: { Authorization: 'Token ' + token }
return {
  [AUTH.HEADER_NAME]: AUTH.PREFIXES.TOKEN + token
};
```

## Testing

All existing functionality has been preserved. The test suite passes with:
- **80 passing** node tests
- **36 passing** utility tests
- **17 passing** operation tests

## Future Enhancements

This constants system provides a foundation for:

1. **Environment-specific Configuration**: Different API URLs for development, staging, production
2. **Internationalization**: Translatable status messages and error text
3. **Feature Flags**: Configurable behavior switches
4. **API Versioning**: Easy switching between API versions
5. **Custom Error Codes**: Structured error handling with codes
6. **Monitoring Integration**: Standardized status and error reporting

## Best Practices

1. **Import Only What You Need**: Import specific modules rather than the entire constants object
2. **Use Descriptive Names**: Constants should clearly indicate their purpose
3. **Group Related Constants**: Keep related values in the same module
4. **Update Tests**: When adding new constants, update relevant tests
5. **Document Changes**: Update this file when adding new constant categories