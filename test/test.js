var should = require('should');
var Bagpipe = require('../lib/bagpipe.js');

describe('bagpipe', function () {
  var async = function (ms, callback) {
    setTimeout(callback, ms);
  };

  it('constructor', function () {
    var bagpipe = new Bagpipe(10);
    bagpipe.limit.should.be.equal(10);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
  });

  it('constructor limit less than 1', function (done) {
    var bagpipe = new Bagpipe(0);
    bagpipe.push(async, [100], function () {
      bagpipe.active.should.be.equal(0);
      done();
    });
    bagpipe.active.should.be.equal(0);
  });

  it('push', function (done) {
    var bagpipe = new Bagpipe(5);
    bagpipe.limit.should.be.equal(5);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    bagpipe.push(async, [100], function () {
      bagpipe.active.should.be.equal(0);
      done();
    });
    bagpipe.active.should.be.equal(1);
  });

  it('push, active should not be above limit', function (done) {
    var limit = 5;
    var bagpipe = new Bagpipe(limit);
    bagpipe.limit.should.be.equal(limit);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    var counter = 10;
    for (var i = 0; i < counter; i++) {
      bagpipe.push(async, [100 + Math.round(Math.random() * 10)], function () {
        bagpipe.active.should.not.be.above(limit);
        counter--;
        if (counter === 0) {
          done();
        }
      });
      bagpipe.active.should.not.be.above(limit);
    }
  });
});
