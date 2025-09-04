const should = require('should');
const OperationRegistry = require('../utils/operation-registry');
const sinon = require('sinon');

describe('OperationRegistry', function () {
  let registry;

  beforeEach(function () {
    registry = new OperationRegistry();
  });

  describe('register', function () {
    it('should register a function handler', function () {
      const handler = sinon.stub();
      registry.register('testOp', handler);
      
      registry.has('testOp').should.be.true();
    });

    it('should throw error for non-function handler', function () {
      should(function () {
        registry.register('testOp', 'not a function');
      }).throw('Handler for operation \'testOp\' must be a function');
    });
  });

  describe('registerAll', function () {
    it('should register multiple operations at once', function () {
      const operations = {
        op1: sinon.stub(),
        op2: sinon.stub(),
        op3: sinon.stub()
      };

      registry.registerAll(operations);

      registry.has('op1').should.be.true();
      registry.has('op2').should.be.true();
      registry.has('op3').should.be.true();
    });
  });

  describe('execute', function () {
    it('should execute registered operation', async function () {
      const handler = sinon.stub().resolves({ data: 'test result' });
      const client = { get: sinon.stub() };
      const payload = { test: 'data' };

      registry.register('testOp', handler);
      
      const result = await registry.execute('testOp', client, payload);
      
      result.should.deepEqual({ data: 'test result' });
      sinon.assert.calledOnce(handler);
      sinon.assert.calledWith(handler, client, payload);
    });

    it('should throw error for unregistered operation', async function () {
      const client = { get: sinon.stub() };
      const payload = {};

      try {
        await registry.execute('unknownOp', client, payload);
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('Invalid operation: unknownOp');
      }
    });
  });

  describe('has', function () {
    it('should return true for registered operations', function () {
      registry.register('existingOp', sinon.stub());
      registry.has('existingOp').should.be.true();
    });

    it('should return false for unregistered operations', function () {
      registry.has('nonExistingOp').should.be.false();
    });
  });

  describe('getOperationNames', function () {
    it('should return all registered operation names', function () {
      const operations = {
        op1: sinon.stub(),
        op2: sinon.stub(),
        op3: sinon.stub()
      };

      registry.registerAll(operations);
      
      const names = registry.getOperationNames();
      names.should.be.an.Array();
      names.should.have.length(3);
      names.should.containDeep(['op1', 'op2', 'op3']);
    });

    it('should return empty array when no operations registered', function () {
      const names = registry.getOperationNames();
      names.should.be.an.Array();
      names.should.have.length(0);
    });
  });
});