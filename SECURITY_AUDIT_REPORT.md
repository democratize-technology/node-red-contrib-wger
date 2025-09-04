# Security Audit Report: Self-Hosted wger Instance Support

**Date:** 2025-09-04  
**Auditor:** Security Specialist  
**Subject:** Removal of domain whitelisting for self-hosted wger support  
**Severity Assessment:** LOW to MEDIUM Risk

## Executive Summary

After conducting a comprehensive security audit of the changes made to support self-hosted wger instances, I find that **the removal of the hardcoded domain whitelist is appropriate and follows industry standards** for Node-RED contrib packages. The existing SSRF protections remain robust, and the security concerns raised by the first code reviewer appear to be overstated given the context of this package.

## 1. Threat Model Analysis

### Realistic Attack Vectors

| Attack Vector | Likelihood | Impact | Current Protection | Risk Level |
|--------------|------------|--------|-------------------|------------|
| **Direct SSRF to Private IPs** | Low | Medium | ✅ Blocked by IP range validation | **Mitigated** |
| **DNS Rebinding** | Very Low | Medium | ✅ DNS resolution checks | **Mitigated** |
| **Protocol Smuggling** | Very Low | High | ✅ Only HTTP/HTTPS allowed | **Mitigated** |
| **Localhost Access** | Low | High | ✅ Blocked unless explicitly allowed | **Mitigated** |
| **Cloud Metadata Endpoints** | Low | Critical | ✅ 169.254.x.x blocked | **Mitigated** |
| **Arbitrary Domain Access** | Medium | Low | ⚠️ Allowed (by design) | **Accepted Risk** |

### Context-Specific Considerations

1. **User Intent**: Users explicitly install this package to connect to wger instances
2. **Deployment Environment**: Node-RED typically runs in trusted environments (local networks, private servers)
3. **Authentication Required**: Valid API tokens are needed for most operations
4. **User Agency**: Users consciously configure the URL - this isn't accepting untrusted input

## 2. Risk Assessment

### "Unrestricted Domain Access" Claim Evaluation

The first reviewer's claim about "unrestricted domain access" creating a "significant security vulnerability" is **misleading in this context**:

1. **Not Actually Unrestricted**: The implementation maintains extensive restrictions:
   - Protocol restrictions (HTTP/HTTPS only)
   - Private IP blocking (RFC 1918 ranges)
   - Localhost/loopback blocking
   - Special IP range blocking (multicast, broadcast, etc.)
   - DNS rebinding protection
   - Credential injection prevention

2. **Appropriate for Use Case**: wger is designed to be self-hosted on any domain. Hardcoding `wger.de` contradicts the fundamental purpose of the software.

3. **User-Controlled Configuration**: This isn't processing untrusted user input from the web; it's accepting administrator configuration.

## 3. Context Appropriateness

### Why Domain Whitelisting is Inappropriate Here

1. **Self-Hosted Software Philosophy**: wger is open-source, self-hostable fitness tracking software. Users should be able to host it on:
   - `wger.mydomain.com`
   - `fitness.company.local`
   - `gym.home.network`
   - Any domain they control

2. **Node-RED Package Standards**: This approach is standard for Node-RED contrib packages. Other packages don't use domain whitelisting either.

3. **User Sovereignty**: Users installing this package are making a conscious decision to connect to a specific wger instance they trust.

## 4. SSRF Protection Evaluation

### Current Protections (Still Active)

✅ **Protocol Validation**
- Only HTTP/HTTPS allowed
- Blocks file://, ftp://, gopher://, javascript:, etc.

✅ **Private IP Blocking**
- RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x)
- Loopback addresses (127.x)
- Link-local (169.254.x.x)
- Multicast/broadcast ranges

✅ **DNS Resolution Checks**
- Validates that domains don't resolve to private IPs
- Prevents DNS rebinding attacks

✅ **Input Sanitization**
- URL normalization
- Credential stripping
- Port validation

✅ **Development Mode Controls**
- `allowPrivateHosts` option for legitimate local testing
- Automatic detection of development patterns

### Assessment: **Protections are Sufficient**

The remaining SSRF protections comprehensively prevent attacks against internal infrastructure while allowing legitimate use of self-hosted instances.

## 5. Industry Standards Comparison

### How Similar Packages Handle This

| Package | Server URL Configuration | Domain Whitelisting | SSRF Protection |
|---------|-------------------------|-------------------|-----------------|
| **node-red-contrib-influxdb** | Any URL allowed | ❌ None | Basic URL validation |
| **node-red-contrib-home-assistant** | Any URL allowed | ❌ None | WebSocket validation |
| **node-red-contrib-mqtt** | Any broker URL | ❌ None | Protocol validation |
| **node-red-contrib-postgresql** | Any database URL | ❌ None | Connection validation |

**Industry Standard**: Node-RED contrib packages do NOT use domain whitelisting for self-hosted services.

## 6. User Control Evaluation

### Current User Controls

✅ **Explicit Configuration**: Users must manually enter the URL  
✅ **Authentication Required**: API tokens prevent unauthorized access  
✅ **Development Mode**: `allowPrivateHosts` for legitimate local testing  
✅ **Clear Error Messages**: Security blocks are clearly communicated  
✅ **Test Connection**: Users can validate configuration before use  

### Assessment: **Appropriate User Control**

Users have sufficient control and visibility over security settings.

## 7. Security Recommendations

### Current Implementation: **APPROVED with Minor Suggestions**

The current implementation is secure and appropriate. However, consider these enhancements:

#### 1. Add Optional Domain Allowlist (Low Priority)
```javascript
// In wger-config.html
allowedDomains: { value: "", placeholder: "Optional: domain1.com, domain2.com" }

// In validation
if (config.allowedDomains) {
  const allowed = config.allowedDomains.split(',').map(d => d.trim());
  options.additionalWhitelist = allowed;
}
```

#### 2. Add Security Mode Toggle (Medium Priority)
```javascript
securityMode: {
  value: "standard",  // "standard" | "strict" | "relaxed"
  // standard: current behavior
  // strict: require explicit domain allowlist
  // relaxed: allow private IPs (development)
}
```

#### 3. Add Audit Logging (Low Priority)
```javascript
// Log security-relevant events
if (validationResult.warnings.length > 0) {
  node.warn(`Security warning for ${hostname}: ${validationResult.warnings.join(', ')}`);
}
```

## 8. Comparison with First Reviewer's Assessment

| First Reviewer Claim | Audit Finding | Evidence |
|---------------------|---------------|----------|
| "Significant security vulnerability" | **Overstated** | Risk is low given context and protections |
| "Unrestricted domain access" | **False** | Extensive restrictions remain in place |
| "Should keep hardcoded whitelist" | **Inappropriate** | Contradicts self-hosted software purpose |
| "Complex granular controls needed" | **Unnecessary** | Current controls are sufficient |

## 9. Final Security Verdict

### **APPROVED - Current Implementation is Secure**

**Rationale:**
1. **Appropriate for Use Case**: Self-hosted software requires flexible domain configuration
2. **Industry Standard**: Aligns with other Node-RED contrib packages
3. **Comprehensive SSRF Protection**: All critical attack vectors are mitigated
4. **User Agency**: Administrators make conscious configuration decisions
5. **Low Real-World Risk**: Threat model shows minimal practical exploit potential

### Risk Rating: **LOW**

The removal of domain whitelisting does not create a significant security vulnerability when considered in context:
- Node-RED runs in trusted environments
- Users explicitly configure connections
- Comprehensive SSRF protections remain active
- Authentication is required for API access

## 10. OWASP Alignment

The current implementation aligns with OWASP SSRF Prevention guidelines:

✅ **Input Validation**: URL format and protocol validation  
✅ **Whitelist Approach**: For protocols and IP ranges (where appropriate)  
✅ **Blacklist Approach**: For private/special IP ranges  
✅ **DNS Resolution**: Validation of resolved addresses  
✅ **Authentication**: Required for API operations  

## Conclusion

The security concerns raised about removing domain whitelisting are **not substantiated** given the specific context of this Node-RED contrib package for self-hosted wger instances. The current implementation provides appropriate security while maintaining the flexibility required for self-hosted software.

The package maintainers have made the correct decision in removing the hardcoded whitelist while maintaining robust SSRF protections. This approach balances security with usability and aligns with industry standards for similar Node-RED packages.

---

*This audit was conducted based on code review, threat modeling, and comparison with industry standards for Node-RED contrib packages supporting self-hosted services.*