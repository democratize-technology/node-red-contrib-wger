# Dependency Modernization Plan
## Node-RED wger Contrib Package

**Created**: 2025-09-04  
**Current Version**: 0.1.0  
**Node.js Requirement**: >=20.0.0  

---

## Executive Summary

This document outlines a phased approach to modernizing the dependencies of the node-red-contrib-wger package. While the current audit reveals **zero security vulnerabilities**, several packages have newer major versions available with improved features, performance, and long-term support.

## Current State Analysis

### Security Status
✅ **npm audit**: 0 vulnerabilities found  
✅ **401 total dependencies**: All secure  
✅ **No deprecated packages** in the dependency tree  

### Outdated Dependencies

| Package | Current | Latest | Update Priority | Risk Level |
|---------|---------|--------|-----------------|------------|
| **validator** | 13.11.0 | 13.15.15 | HIGH | LOW |
| **node-red-node-test-helper** | 0.3.4 | 0.3.5 | HIGH | LOW |
| **mocha** | 10.8.2 | 11.7.2 | MEDIUM | MEDIUM |
| **sinon** | 15.2.0 | 21.0.0 | LOW | HIGH |

### Stable Dependencies
- **axios** (1.6.0): Current version is stable and widely used
- **xss** (1.0.15): Stable but consider alternatives for future
- **proxyquire** (2.1.3): Stable but consider modern alternatives

---

## Modernization Roadmap

### Phase 1: Quick Wins (Immediate - Low Risk)
**Timeline**: 1 sprint  
**Risk**: Minimal  

#### 1.1 Patch Updates
```bash
# These can be done immediately with minimal risk
npm update validator@^13.15.15  # Bug fixes only
npm update node-red-node-test-helper@^0.3.5  # Patch update
```

**Benefits**:
- Latest bug fixes and security patches
- No breaking changes
- Maintains compatibility

#### 1.2 Dependency Hygiene
- Run `npm dedupe` to optimize dependency tree
- Update npm scripts for better automation
- Add `npm run audit` script for regular checks

---

### Phase 2: Test Framework Modernization (Medium Priority)
**Timeline**: 2-3 sprints  
**Risk**: Medium  

#### 2.1 Mocha 10 → 11 Migration
```bash
npm install --save-dev mocha@^11.7.2
```

**Breaking Changes**:
- Node.js requirement already satisfied (>=20.0.0)
- Some CLI options have changed
- Reporter interface updates

**Migration Steps**:
1. Update mocha to 11.x
2. Run full test suite
3. Update any custom reporters
4. Verify CI/CD compatibility

#### 2.2 Sinon 15 → 21 Migration (Consider Deferring)
```bash
# Major version jump - requires careful testing
npm install --save-dev sinon@^21.0.0
```

**Breaking Changes**:
- Significant API changes between v15 and v21
- Fake timers implementation changed
- Stub behavior modifications
- Spy assertions updated

**Migration Strategy**:
1. Create branch for Sinon upgrade
2. Update test helper mocking patterns
3. Refactor all test files incrementally
4. Run comprehensive regression testing

---

### Phase 3: Security Hardening (Future-Proofing)
**Timeline**: 3-4 sprints  
**Risk**: Medium-High  

#### 3.1 XSS Library Evolution
Current: `xss` (1.0.15)  
Consider: `isomorphic-dompurify` (2.26.0) or `sanitize-html` (2.17.0)

**Evaluation Criteria**:
- **DOMPurify**: Industry standard, actively maintained, better security track record
- **sanitize-html**: More configurable, better for Node.js environments
- **Current xss**: Stable but less actively developed

**Recommendation**: Defer until needed, current library has no vulnerabilities

#### 3.2 Testing Infrastructure Modernization
Consider future migration to modern alternatives:
- **Vitest**: Faster, better ESM support, Vite integration
- **Native Node.js test runner**: Built-in, no dependencies
- **Keep Mocha**: Mature, stable, excellent Node-RED ecosystem support

**Recommendation**: Stay with Mocha for Node-RED compatibility

---

## Implementation Strategy

### Immediate Actions (Sprint 1)
1. ✅ Update validator to 13.15.15
2. ✅ Update node-red-node-test-helper to 0.3.5
3. ✅ Run full test suite
4. ✅ Update CI/CD if needed

### Short-term (Sprints 2-3)
1. ⏳ Evaluate Mocha 11 migration
2. ⏳ Create test branch for major updates
3. ⏳ Document any breaking changes
4. ⏳ Update contributor guidelines

### Long-term (Sprints 4+)
1. 🔮 Assess Sinon migration necessity
2. 🔮 Evaluate modern testing alternatives
3. 🔮 Consider XSS library alternatives
4. 🔮 Plan for ESM module support

---

## Dependency Update Policy

### Automated Updates
Configure Dependabot or Renovate for:
- Security patches: Auto-merge
- Patch versions: Auto-PR with tests
- Minor versions: Manual review required
- Major versions: Planned migration

### Review Criteria
Before any major update:
1. Check Node-RED compatibility matrix
2. Review breaking changes
3. Test with example flows
4. Verify all nodes function correctly
5. Check downstream plugin compatibility

### Testing Requirements
- All updates must pass existing test suite
- Major updates require additional integration testing
- Performance benchmarks for critical paths
- Memory usage profiling for large datasets

---

## Risk Mitigation

### Rollback Strategy
1. Tag releases before major updates
2. Keep dependency lock file in version control
3. Document rollback procedures
4. Maintain compatibility branches

### Compatibility Matrix
| Node-RED Version | Node.js | Our Package | Notes |
|-----------------|---------|-------------|-------|
| 4.1.x | >=20.0.0 | 0.1.x | Current |
| 4.0.x | >=18.0.0 | 0.1.x | Compatible |
| 3.x.x | >=14.0.0 | - | Not tested |

### Breaking Change Communication
- Semantic versioning strictly followed
- CHANGELOG.md updated for all changes
- Migration guides for major updates
- Deprecation warnings before removal

---

## Monitoring & Maintenance

### Regular Audits (Monthly)
```bash
npm audit
npm outdated
npm ls --depth=0
```

### Quarterly Reviews
- Assess new security advisories
- Evaluate emerging alternatives
- Review dependency health metrics
- Update modernization roadmap

### Annual Planning
- Major version planning
- Technology stack evaluation
- Performance baseline updates
- Security posture assessment

---

## Alternative Technologies Assessment

### Testing Frameworks
| Framework | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| **Mocha** (current) | Stable, Node-RED standard | Slower than modern alternatives | KEEP |
| **Vitest** | Fast, modern, ESM native | Less Node-RED ecosystem support | WATCH |
| **Jest** | Feature-rich, snapshot testing | Heavy, Facebook dependency | AVOID |
| **Node Test** | Built-in, no dependencies | Limited features, new | WATCH |

### Mocking Libraries
| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **Sinon** (current) | Comprehensive, mature | Complex API, large | KEEP |
| **Vitest mocks** | Integrated, modern | Requires Vitest | FUTURE |
| **testdouble.js** | Simpler API | Less features | CONSIDER |

### XSS Prevention
| Library | Pros | Cons | Recommendation |
|---------|------|------|----------------|
| **xss** (current) | Simple, stable | Less active development | KEEP |
| **DOMPurify** | Industry standard | Browser-focused | CONSIDER |
| **sanitize-html** | Node.js focused | More complex | CONSIDER |

---

## Success Metrics

### Technical Metrics
- Zero security vulnerabilities maintained
- Test coverage remains >80%
- Build time <30 seconds
- Bundle size increase <10%

### Development Metrics
- No breaking changes without major version
- Migration guides for all breaking changes
- Dependency updates within 30 days of release
- Security patches within 7 days

---

## Conclusion

The node-red-contrib-wger package is currently in a **healthy state** with no security vulnerabilities. The modernization plan focuses on:

1. **Immediate**: Low-risk patch updates
2. **Short-term**: Test framework modernization
3. **Long-term**: Technology stack evolution

This phased approach ensures stability while progressively modernizing the codebase. The key is maintaining Node-RED compatibility while adopting modern development practices.

---

## Appendix: Commands Reference

```bash
# Security auditing
npm audit
npm audit fix  # Auto-fix when safe

# Dependency management
npm outdated
npm update  # Update to latest minor/patch
npm dedupe  # Optimize dependency tree

# Version checking
npm ls --depth=0  # Direct dependencies
npm ls <package>  # Find specific package

# Clean install
rm -rf node_modules package-lock.json
npm install

# Test after updates
npm test
npm run lint  # If configured
```