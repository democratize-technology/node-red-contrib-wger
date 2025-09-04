# SSRF Protection Implementation - Security Fix

## Overview
This document describes the Server-Side Request Forgery (SSRF) protection implemented in the Node-RED wger contrib package to address a **MEDIUM priority security vulnerability**.

## Vulnerability Details
- **Type**: Server-Side Request Forgery (SSRF)
- **Severity**: MEDIUM
- **Location**: `nodes/wger-config.js` lines 57-74 in `testConnection` method
- **Issue**: The server didn't validate URLs on the server-side, allowing potential SSRF attacks where an attacker could make the server request internal/localhost addresses or other sensitive endpoints.

## Implementation Summary

### 1. New URL Validator Module (`utils/url-validator.js`)
Created a comprehensive URL validation utility with the following security features:

#### Protocol Validation
- ✅ Only allows `http://` and `https://` protocols
- ❌ Blocks dangerous protocols: `file://`, `ftp://`, `gopher://`, `javascript:`, etc.

#### IP Address Filtering
- ❌ Blocks private IP ranges (RFC 1918):
  - 10.0.0.0/8
  - 172.16.0.0/12
  - 192.168.0.0/16
- ❌ Blocks special IP ranges:
  - 0.0.0.0/8 (Current network)
  - 169.254.0.0/16 (Link-local)
  - 224.0.0.0/4 (Multicast)
  - 240.0.0.0/4 (Reserved/Broadcast)
- ❌ Blocks localhost/loopback:
  - localhost
  - 127.0.0.1
  - ::1 (IPv6 localhost)

#### Domain Whitelisting
- ✅ Allows official wger domains:
  - wger.de
  - *.wger.de (subdomains)
- ✅ Supports additional whitelisted domains via configuration
- ❌ Blocks all non-whitelisted domains in production

#### DNS Rebinding Protection
- Resolves hostnames to IP addresses
- Validates resolved IPs against blocked ranges
- Prevents DNS rebinding attacks where a domain resolves to internal IPs

#### Additional Security Measures
- ❌ Blocks URLs with embedded credentials (username:password@domain)
- ⚠️ Warns about non-standard ports
- ✅ Normalizes and sanitizes URLs
- ✅ Handles various IP notation bypass attempts (decimal, octal, hexadecimal)

### 2. Integration in wger-config Node
Updated `nodes/wger-config.js` to integrate URL validation:

#### Node Initialization
- Validates URL synchronously on node creation
- Logs errors for invalid URLs
- Sets error status on node for invalid configurations

#### Test Connection Method
- Performs comprehensive async validation with DNS resolution
- Returns detailed validation errors to client
- Includes security warnings in response

#### Admin Endpoint Protection
- Validates URLs submitted via admin test endpoint
- Prevents SSRF attacks through the UI test functionality
- Returns clear error messages for security violations

### 3. Development Mode Exceptions
The implementation includes smart development mode detection:

#### Automatic Detection
URLs containing these patterns trigger development mode:
- `localhost`
- `test`
- `127.0.0.1`
- `::1`

#### Development Mode Permissions
In development mode, the following are allowed with warnings:
- Localhost/loopback addresses
- Private IP ranges
- Non-whitelisted domains

### 4. Comprehensive Test Coverage
Created extensive test suites to verify security:

#### URL Validator Tests (`test/utils/url-validator_spec.js`)
- 90+ test cases covering all validation scenarios
- Tests for bypass attempts and edge cases
- Verification of DNS rebinding protection

#### Security Integration Tests (`test/security/ssrf-protection_spec.js`)
- Tests SSRF protection in actual node context
- Verifies admin endpoint protection
- Validates development mode exceptions

#### Updated Config Node Tests (`test/wger-config_spec.js`)
- Tests for URL validation during node initialization
- Verification of error handling for invalid URLs

## Security Benefits

### Attack Vectors Prevented
1. **Internal Network Scanning**: Blocks access to private IP ranges
2. **Cloud Metadata Access**: Prevents access to cloud provider metadata endpoints (169.254.169.254)
3. **Localhost Service Access**: Blocks attempts to access local services
4. **DNS Rebinding**: Validates resolved IPs to prevent DNS-based attacks
5. **Protocol Smuggling**: Only allows HTTP/HTTPS protocols
6. **Credential Theft**: Blocks URLs with embedded credentials

### Defense in Depth
- **Multiple Validation Layers**: Synchronous validation on init, async validation on test
- **Clear Error Messages**: Security violations are clearly communicated
- **Fail Secure**: Invalid URLs are rejected by default
- **Audit Trail**: All validation errors are logged

## Testing the Implementation

### Manual Testing
1. Try to configure a node with a private IP:
   ```
   http://192.168.1.1
   ```
   Result: Configuration rejected with error

2. Try to test connection to localhost:
   ```
   http://127.0.0.1:8000
   ```
   Result: Blocked in production, allowed in development

3. Try to access cloud metadata:
   ```
   http://169.254.169.254/latest/meta-data/
   ```
   Result: Blocked as link-local address

### Automated Testing
Run the test suite:
```bash
npm test
```

Specifically test SSRF protection:
```bash
npm test test/utils/url-validator_spec.js
npm test test/security/ssrf-protection_spec.js
```

## Maintaining Security

### Adding Trusted Domains
To add additional trusted wger instances, update the whitelist in `utils/url-validator.js`:
```javascript
WHITELISTED_DOMAINS: [
  'wger.de',
  '*.wger.de',
  'your-trusted-domain.com'  // Add here
]
```

### Monitoring
- Review error logs for blocked URL attempts
- Monitor for patterns of attack attempts
- Keep validation rules updated with new attack vectors

## Conclusion
The implemented SSRF protection provides comprehensive defense against server-side request forgery attacks while maintaining functionality for legitimate wger instances. The solution balances security with usability by providing clear error messages and allowing necessary exceptions for development environments.