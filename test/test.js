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
    bagpipe.disabled.should.be.equal(false);
  });

  it('constructor disabled', function () {
    var bagpipe = new Bagpipe(10, true);
    bagpipe.limit.should.be.equal(10);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    bagpipe.disabled.should.be.equal(true);
  });

  it('constructor limit less than 1', function (done) {
    var bagpipe = new Bagpipe(0);
    bagpipe.push(async, [100], function () {
      bagpipe.active.should.be.equal(0);
      done();
    });
    bagpipe.active.should.be.equal(0);
  });

  it('constructor disabled is true', function (done) {
    var bagpipe = new Bagpipe(10, true);
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

  it('push, async with this', function (done) {
    var bagpipe = new Bagpipe(5);
    bagpipe.limit.should.be.equal(5);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    var context = {value: 10};
    context.async = function (callback) {
      this.value--;
      var that = this;
      process.nextTick(function() {
        callback(that.value);
      });
    };

    bagpipe.push(context.async, [], function () {
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

  it('push, disabled, active should not be above limit', function (done) {
    var limit = 5;
    var bagpipe = new Bagpipe(limit, true);
    bagpipe.limit.should.be.equal(limit);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    var counter = 10;
    for (var i = 0; i < counter; i++) {
      bagpipe.push(async, [100 + Math.round(Math.random() * 10)], function () {
        bagpipe.active.should.be.equal(0);
        counter--;
        if (counter === 0) {
          done();
        }
      });
      bagpipe.active.should.be.equal(0);
    }
  });
});
