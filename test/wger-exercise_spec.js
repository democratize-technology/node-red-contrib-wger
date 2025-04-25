const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerExerciseNode = require('../nodes/wger-exercise');
const wgerConfigNode = require('../nodes/wger-config');

helper.init(require.resolve('node-red'));

describe('wger-exercise Node', function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it('should be loaded', function (done) {
    const flow = [{ id: 'n1', type: 'wger-exercise', name: 'test exercise node' }];
    helper.load(wgerExerciseNode, flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test exercise node');
      done();
    });
  });

  it('should make a search request', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'wger-exercise',
        name: 'search node',
        operation: 'searchExercises',
        server: 'c1',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
      {
        id: 'c1',
        type: 'wger-config',
        name: 'test config',
        apiUrl: 'https://wger.de',
        authType: 'none',
      },
    ];

    helper.load([wgerExerciseNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        done();
      });

      n1.receive({ payload: { term: 'bench' } });
    });
  });

  it('should handle missing operation', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'wger-exercise',
        server: 'c1',
        wires: [[]],
      },
      {
        id: 'c1',
        type: 'wger-config',
        name: 'test config',
        apiUrl: 'https://wger.de',
        authType: 'none',
      },
    ];

    helper.load([wgerExerciseNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');

      n1.on('call:error', (call) => {
        call.should.have.property('firstArg').which.is.an.Error();
        call.firstArg.message.should.equal('No operation specified');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'wger-exercise',
        operation: 'searchExercises',
        wires: [[]],
      },
    ];

    helper.load(wgerExerciseNode, flow, function () {
      const n1 = helper.getNode('n1');

      // Check that the node status was set to indicate missing config
      n1.on('call:status', (call) => {
        call.should.have.property('firstArg');
        call.firstArg.should.have.property('fill', 'red');
        call.firstArg.should.have.property('shape', 'ring');
        call.firstArg.should.have.property('text', 'Missing server config');
        done();
      });
    });
  });
});
