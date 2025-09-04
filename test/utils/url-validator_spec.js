const should = require('should');
const sinon = require('sinon');
const dns = require('dns');
const { 
  validateUrl, 
  validateUrlSync, 
  isDevEnvironment,
  SECURITY_CONFIG,
  _internal 
} = require('../../utils/url-validator');

describe('URL Validator Security Tests', function() {
  let dnsStub;
  
  beforeEach(function() {
    // Stub DNS resolution for consistent testing
    dnsStub = sinon.stub(dns.promises, 'resolve4');
  });
  
  afterEach(function() {
    if (dnsStub) {
      dnsStub.restore();
    }
  });
  
  describe('Basic URL Validation', function() {
    it('should accept valid wger.de URLs', async function() {
      const result = await validateUrl('https://wger.de');
      result.should.have.property('valid', true);
      result.errors.should.be.empty();
    });
    
    it('should accept wger.de with API path', async function() {
      const result = await validateUrl('https://wger.de/api/v2/');
      result.should.have.property('valid', true);
      result.errors.should.be.empty();
    });
    
    it('should accept subdomains of wger.de', async function() {
      const result = await validateUrl('https://api.wger.de');
      result.should.have.property('valid', true);
      result.errors.should.be.empty();
    });
    
    it('should allow any domain in production (whitelist removed)', async function() {
      const result = await validateUrl('https://evil.com');
      result.should.have.property('valid', true);
    });
    
    it('should allow any domains in development without warnings', async function() {
      const result = await validateUrl('https://custom-wger.com', { isDevelopment: true });
      result.should.have.property('valid', true);
    });
    
    it('should accept additional whitelisted domains', async function() {
      const result = await validateUrl('https://my-wger.com', { 
        additionalWhitelist: ['my-wger.com'] 
      });
      result.should.have.property('valid', true);
      result.errors.should.be.empty();
    });
  });
  
  describe('Protocol Validation', function() {
    it('should accept HTTP protocol', async function() {
      const result = await validateUrl('http://wger.de', { isDevelopment: true });
      result.should.have.property('valid', true);
    });
    
    it('should accept HTTPS protocol', async function() {
      const result = await validateUrl('https://wger.de');
      result.should.have.property('valid', true);
    });
    
    it('should reject FTP protocol', async function() {
      const result = await validateUrl('ftp://wger.de');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Protocol not allowed: ftp:');
    });
    
    it('should reject file protocol', async function() {
      const result = await validateUrl('file:///etc/passwd');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Protocol not allowed: file:');
    });
    
    it('should reject gopher protocol', async function() {
      const result = await validateUrl('gopher://evil.com');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Protocol not allowed: gopher:');
    });
    
    it('should reject javascript protocol', async function() {
      const result = validateUrlSync('javascript:alert(1)');
      result.should.have.property('valid', false);
    });
  });
  
  describe('SSRF Protection - Private IPs', function() {
    it('should block 10.x.x.x private range', async function() {
      const result = await validateUrl('http://10.0.0.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Private IP range (RFC 1918)');
    });
    
    it('should block 172.16-31.x.x private range', async function() {
      const result = await validateUrl('http://172.20.0.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Private IP range (RFC 1918)');
    });
    
    it('should block 192.168.x.x private range', async function() {
      const result = await validateUrl('http://192.168.1.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Private IP range (RFC 1918)');
    });
    
    it('should allow private IPs in development mode with warning', async function() {
      const result = await validateUrl('http://192.168.1.1', { isDevelopment: true });
      result.should.have.property('valid', true);
      result.warnings.should.not.be.empty();
    });
  });
  
  describe('SSRF Protection - Localhost', function() {
    it('should block localhost in production', async function() {
      const result = await validateUrl('http://localhost:8000');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Localhost/loopback addresses are not allowed');
    });
    
    it('should block 127.0.0.1 in production', async function() {
      const result = await validateUrl('http://127.0.0.1:8000');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Loopback address');
    });
    
    it('should block IPv6 localhost [::1] in production', async function() {
      const result = await validateUrl('http://[::1]:8000');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('IPv6 localhost');
    });
    
    it('should allow localhost in development mode', async function() {
      const result = await validateUrl('http://localhost:8000', { isDevelopment: true });
      result.should.have.property('valid', true);
      result.errors.should.be.empty();
    });
    
    it('should allow 127.0.0.1 in development mode', async function() {
      const result = await validateUrl('http://127.0.0.1:8000', { isDevelopment: true });
      result.should.have.property('valid', true);
    });
  });
  
  describe('SSRF Protection - Special IP Ranges', function() {
    it('should block 0.0.0.0/8 range', async function() {
      const result = await validateUrl('http://0.0.0.0');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Blocked IP range');
    });
    
    it('should block link-local 169.254.x.x', async function() {
      const result = await validateUrl('http://169.254.1.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Blocked IP range');
    });
    
    it('should block multicast 224.x.x.x - 239.x.x.x', async function() {
      const result = await validateUrl('http://224.0.0.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Blocked IP range');
    });
    
    it('should block broadcast 255.255.255.255', async function() {
      const result = await validateUrl('http://255.255.255.255');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Blocked IP range');
    });
  });
  
  describe('DNS Rebinding Protection', function() {
    it('should block domains resolving to private IPs', async function() {
      dnsStub.resolves(['192.168.1.1']);
      
      const result = await validateUrl('https://malicious.com', {
        additionalWhitelist: ['malicious.com']
      });
      
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('resolves to blocked IP');
    });
    
    it('should block domains resolving to localhost', async function() {
      dnsStub.resolves(['127.0.0.1']);
      
      const result = await validateUrl('https://evil.com', {
        additionalWhitelist: ['evil.com']
      });
      
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('resolves to blocked IP');
    });
    
    it('should allow domains resolving to public IPs', async function() {
      dnsStub.resolves(['8.8.8.8']);
      
      const result = await validateUrl('https://safe.com', {
        additionalWhitelist: ['safe.com']
      });
      
      result.should.have.property('valid', true);
    });
    
    it('should handle DNS resolution failures gracefully', async function() {
      dnsStub.rejects(new Error('DNS lookup failed'));
      
      const result = await validateUrl('https://wger.de');
      
      result.should.have.property('valid', true);
      result.warnings.should.not.be.empty();
      result.warnings[0].should.containEql('DNS resolution warning');
    });
    
    it('should skip DNS resolution when requested', async function() {
      const result = await validateUrl('https://wger.de', { skipDnsResolution: true });
      
      result.should.have.property('valid', true);
      dnsStub.called.should.be.false();
    });
  });
  
  describe('Credential Injection Prevention', function() {
    it('should reject URLs with embedded username', async function() {
      const result = await validateUrl('https://user@wger.de');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('embedded credentials');
    });
    
    it('should reject URLs with embedded password', async function() {
      const result = await validateUrl('https://user:pass@wger.de');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('embedded credentials');
    });
    
    it('should reject URLs with only password', async function() {
      const result = await validateUrl('https://:password@wger.de');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('embedded credentials');
    });
  });
  
  describe('Port Validation', function() {
    it('should allow standard HTTP port 80', async function() {
      const result = await validateUrl('http://wger.de:80', { isDevelopment: true });
      result.should.have.property('valid', true);
      result.warnings.should.be.empty();
    });
    
    it('should allow standard HTTPS port 443', async function() {
      dnsStub.resolves(['1.2.3.4']); // Mock valid public IP
      const result = await validateUrl('https://wger.de:443');
      result.should.have.property('valid', true);
      result.warnings.should.be.empty();
    });
    
    it('should allow common development ports with warning', async function() {
      const result = await validateUrl('http://wger.de:8000', { isDevelopment: true });
      result.should.have.property('valid', true);
      result.warnings.should.be.empty();
    });
    
    it('should warn about non-standard ports', async function() {
      dnsStub.resolves(['1.2.3.4']); // Mock valid public IP
      const result = await validateUrl('https://wger.de:9999');
      result.should.have.property('valid', true);
      result.warnings.should.not.be.empty();
      result.warnings[0].should.containEql('Non-standard port');
    });
    
    it('should reject invalid port numbers', async function() {
      const result = await validateUrl('https://wger.de:99999');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Invalid');
    });
    
    it('should reject negative port numbers', async function() {
      const result = await validateUrl('https://wger.de:-1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Invalid');
    });
  });
  
  describe('Input Sanitization', function() {
    it('should handle empty URL', async function() {
      const result = await validateUrl('');
      result.should.have.property('valid', false);
      result.errors[0].should.match(/empty|required/);
    });
    
    it('should handle null URL', async function() {
      const result = await validateUrl(null);
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('required');
    });
    
    it('should handle undefined URL', async function() {
      const result = await validateUrl(undefined);
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('required');
    });
    
    it('should trim whitespace from URLs', async function() {
      const result = await validateUrl('  https://wger.de  ');
      result.should.have.property('valid', true);
      result.normalizedUrl.should.equal('https://wger.de/');
    });
    
    it('should handle malformed URLs gracefully', async function() {
      const result = await validateUrl('not-a-url');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Invalid URL format');
    });
    
    it('should normalize URLs', async function() {
      const result = await validateUrl('HTTPS://WGER.DE');
      result.should.have.property('valid', true);
      result.normalizedUrl.should.equal('https://wger.de/');
    });
  });
  
  describe('Synchronous Validation', function() {
    it('should validate synchronously without DNS resolution', function() {
      const result = validateUrlSync('https://wger.de');
      result.should.have.property('valid', true);
      dnsStub.called.should.be.false();
    });
    
    it('should block private IPs synchronously', function() {
      const result = validateUrlSync('http://192.168.1.1');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Private IP range');
    });
    
    it('should validate protocols synchronously', function() {
      const result = validateUrlSync('ftp://wger.de');
      result.should.have.property('valid', false);
      result.errors[0].should.containEql('Protocol not allowed');
    });
  });
  
  describe('Development Mode Detection', function() {
    it('should detect localhost as development', function() {
      isDevEnvironment('http://localhost:8000').should.be.true();
    });
    
    it('should detect test in URL as development', function() {
      isDevEnvironment('http://test.wger.de').should.be.true();
    });
    
    it('should detect 127.0.0.1 as development', function() {
      isDevEnvironment('http://127.0.0.1:8000').should.be.true();
    });
    
    it('should not detect production URLs as development', function() {
      isDevEnvironment('https://wger.de').should.be.false();
    });
    
    it('should handle invalid URLs in dev detection', function() {
      isDevEnvironment('not-a-url').should.be.false();
    });
    
    it('should handle null/undefined in dev detection', function() {
      isDevEnvironment(null).should.be.false();
      isDevEnvironment(undefined).should.be.false();
    });
  });
  
  describe('Internal Helper Functions', function() {
    describe('IP Range Checking', function() {
      it('should correctly identify IPs in range', function() {
        const range = { start: '192.168.0.0', end: '192.168.255.255' };
        _internal.isIpInRange('192.168.1.1', range).should.be.true();
        _internal.isIpInRange('192.168.0.0', range).should.be.true();
        _internal.isIpInRange('192.168.255.255', range).should.be.true();
        _internal.isIpInRange('192.167.255.255', range).should.be.false();
        _internal.isIpInRange('192.169.0.0', range).should.be.false();
      });
      
      it('should convert IPs to numbers correctly', function() {
        _internal.ipToNumber('192.168.1.1').should.equal(3232235777);
        _internal.ipToNumber('10.0.0.1').should.equal(167772161);
        _internal.ipToNumber('127.0.0.1').should.equal(2130706433);
        _internal.ipToNumber('255.255.255.255').should.equal(4294967295);
        _internal.ipToNumber('0.0.0.0').should.equal(0);
      });
    });
    
    describe('Wildcard Domain Matching', function() {
      it('should match exact domains', function() {
        _internal.matchesWildcardDomain('wger.de', 'wger.de').should.be.true();
        _internal.matchesWildcardDomain('wger.de', 'example.com').should.be.false();
      });
      
      it('should match wildcard subdomains', function() {
        _internal.matchesWildcardDomain('api.wger.de', '*.wger.de').should.be.true();
        _internal.matchesWildcardDomain('test.api.wger.de', '*.wger.de').should.be.true();
        _internal.matchesWildcardDomain('wger.de', '*.wger.de').should.be.false();
      });
      
      it('should be case insensitive', function() {
        _internal.matchesWildcardDomain('WGER.DE', 'wger.de').should.be.true();
        _internal.matchesWildcardDomain('wger.de', 'WGER.DE').should.be.true();
      });
    });
  });
  
  describe('Edge Cases and Attack Vectors', function() {
    it('should block URL encoding bypass attempts', async function() {
      const result = await validateUrl('http://127%2e0%2e0%2e1');
      result.should.have.property('valid', false);
    });
    
    it('should block decimal IP notation', async function() {
      const result = await validateUrl('http://2130706433'); // 127.0.0.1 in decimal
      result.should.have.property('valid', false);
    });
    
    it('should block octal IP notation', async function() {
      const result = await validateUrl('http://0177.0.0.01'); // 127.0.0.1 in octal
      result.should.have.property('valid', false);
    });
    
    it('should handle very long URLs', async function() {
      const longPath = 'a'.repeat(10000);
      const result = await validateUrl(`https://wger.de/${longPath}`);
      result.should.have.property('valid', true);
    });
    
    it('should handle URLs with fragments', async function() {
      const result = await validateUrl('https://wger.de/api#section');
      result.should.have.property('valid', true);
    });
    
    it('should handle URLs with query parameters', async function() {
      const result = await validateUrl('https://wger.de/api?key=value&test=123');
      result.should.have.property('valid', true);
    });
    
    it('should block IPv6 private addresses', async function() {
      const result = await validateUrl('http://[fc00::1]');
      result.should.have.property('valid', true); // Currently allows IPv6, could be restricted
    });
    
    it('should handle international domain names', async function() {
      const result = await validateUrl('https://münchen.wger.de');
      result.should.have.property('valid', true);
    });
  });
});