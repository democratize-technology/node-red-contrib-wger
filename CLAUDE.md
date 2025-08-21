# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Node-RED contrib package** for integrating with the [wger](https://wger.de) workout and fitness tracker API. It provides specialized nodes for exercise management, workout planning, nutrition tracking, weight logging, and user profile management.

## Development Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Test specific files (Mocha pattern)
npm test -- --grep "specific test name"
```

## Architecture Overview

### Node-RED Contrib Structure
- **Entry Point**: `index.js` - Loads all node modules for registration
- **Node Pattern**: Each node has paired `.js` (logic) and `.html` (UI) files
- **Registration**: Nodes auto-register via `package.json` "node-red" section
- **Examples**: Ready-to-import flows in `examples/` directory

### Core Components

#### 1. Configuration Node (`wger-config`)
- Manages connection settings and authentication
- Supports three auth modes: none, token ("Token <value>"), JWT ("Bearer <value>")
- Built-in connection testing via `/test` endpoint
- Automatic test mode detection for localhost URLs

#### 2. Domain Nodes
- **wger-exercise**: Exercise search, categories, muscles, equipment
- **wger-workout**: Workout plans, days, sessions, logging  
- **wger-nutrition**: Nutrition plans, meals, ingredients
- **wger-weight**: Weight tracking and statistics
- **wger-user**: User profile management
- **wger-api**: Generic API access for custom operations

#### 3. Shared Infrastructure
- **WgerApiClient** (`utils/api-client.js`): HTTP client with enhanced error handling
- **Test Helper** (`test/test-helper.js`): Sinon mocking for API client tests

### API Client Pattern

The `WgerApiClient` class provides:
- Automatic path parameter replacement (`{id}` → actual ID)
- Enhanced error handling with status codes and response data
- Convenience methods for all HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- Consistent authentication header injection

```javascript
// Usage pattern in nodes:
const client = new WgerApiClient(config.apiUrl, config.authHeader);
const result = await client.get('/api/v2/exercise/', { search: 'bench press' });
```

### Node Development Patterns

#### Message Flow
```javascript
// Standard pattern for operation handling:
msg.operation = msg.operation || node.operation;
// Process based on operation type
// Return result in msg.payload
```

#### Status Indicators
- Blue dot: Processing request
- Green dot: Success  
- Red dot/ring: Error occurred

#### Error Handling
All nodes provide detailed error outputs with API response context when available.

## Testing Strategy

### Test Structure
- **Framework**: Mocha + Should + Sinon + node-red-node-test-helper
- **Mocking**: Global API client mock via `test/test-helper.js`
- **Pattern**: Each node has corresponding `*_spec.js` test file

### Mock Setup
The test helper provides a global mock that replaces `WgerApiClient`:
```javascript
const { mockApiClient, resetMocks } = require('./test-helper');

beforeEach(() => {
  resetMocks();
  mockApiClient.get.resolves({ data: 'test' });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file  
npm test test/nodes/wger-exercise_spec.js
```

## Configuration Patterns

### Authentication Setup
1. **none**: Public endpoints (limited access)
2. **token**: Permanent API token from wger profile settings
3. **jwt**: JSON Web Tokens for session-based auth

### Environment Detection
- Localhost URLs automatically enable test mode
- Authentication optional for public demo instances
- Production requires valid API credentials

## File Structure

```
nodes/                  # Node-RED node implementations
├── wger-config.js     # Configuration node
├── wger-*.js          # Domain-specific nodes
utils/                 # Shared utilities
├── api-client.js      # HTTP client wrapper
test/                  # Test suite
├── test-helper.js     # Global mocking setup
├── nodes/             # Node tests
examples/              # Ready-to-import flows
```

## Development Workflow

1. **Node Creation**: Create paired `.js`/`.html` files in `nodes/`
2. **Registration**: Add to `package.json` "node-red.nodes" section
3. **Testing**: Create corresponding `*_spec.js` with API mocking
4. **Examples**: Add demo flow to `examples/` if introducing new patterns

## Important Notes

- Requires Node.js >=20.0.0
- Uses axios for HTTP requests (v1.6.0)
- All API operations are async/await based
- Error responses include wger API details when available
- Example flows demonstrate typical usage patterns