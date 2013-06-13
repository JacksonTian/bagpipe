var should = require('should');
var pedding = require('pedding');
var Bagpipe = require('../');

describe('bagpipe', function () {
  var async = function (ms, callback) {
    setTimeout(function () {
      callback(null, {});
    }, ms);
  };

  it('constructor', function () {
    var bagpipe = new Bagpipe(10);
    bagpipe.limit.should.be.equal(10);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    bagpipe.options.disabled.should.be.equal(false);
  });

  it('constructor disabled', function () {
    var bagpipe = new Bagpipe(10, true);
    bagpipe.limit.should.be.equal(10);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    bagpipe.options.disabled.should.be.equal(true);
  });

  it('constructor limit less than 1', function (done) {
    var bagpipe = new Bagpipe(0);
    bagpipe.push(async, 10, function () {
      bagpipe.active.should.be.equal(0);
      done();
    });
    bagpipe.active.should.be.equal(0);
  });

  it('constructor limit less than 1 for nextTick', function (done) {
    var bagpipe = new Bagpipe(0);
    bagpipe.push(process.nextTick, function () {
      bagpipe.active.should.be.equal(0);
      done();
    });
    bagpipe.active.should.be.equal(0);
  });

  it('constructor disabled is true', function (done) {
    var bagpipe = new Bagpipe(10, true);
    bagpipe.push(async, 10, function () {
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
    bagpipe.push(async, 10, function () {
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

    bagpipe.push(context.async.bind(context), function () {
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
      bagpipe.push(async, 1 + Math.round(Math.random() * 10), function () {
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
      bagpipe.push(async, 10 + Math.round(Math.random() * 10), function () {
        bagpipe.active.should.be.equal(0);
        counter--;
        if (counter === 0) {
          done();
        }
      });
      bagpipe.active.should.be.equal(0);
    }
  });

  it('full event should fired when above limit', function (done) {
    var limit = 5;
    var bagpipe = new Bagpipe(limit);
    bagpipe.limit.should.be.equal(limit);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    var counter = 0;
    bagpipe.on('full', function (length) {
      length.should.above(1);
      counter++;
    });

    var noop = function () {};
    for (var i = 0; i < 100; i++) {
      bagpipe.push(async, 10, noop);
    }
    counter.should.above(0);
    done();
  });

  it('should support without callback', function (done) {
    var limit = 5;
    var bagpipe = new Bagpipe(limit);
    bagpipe.limit.should.be.equal(limit);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    bagpipe.push(async, 10);
    bagpipe.active.should.be.equal(1);
    done();
  });

  it('should get TooMuchAsyncCallError', function (done) {
    done = pedding(5, done);
    var limit = 2;
    var bagpipe = new Bagpipe(limit, {
      refuse: true
    });
    bagpipe.limit.should.be.equal(limit);
    bagpipe.queue.should.have.length(0);
    bagpipe.active.should.be.equal(0);
    for (var i = 0; i < 4; i++) {
      bagpipe.push(async, 10, function (err) {
        should.not.exist(err);
        done();
      });
    }
    bagpipe.push(async, 10, function (err) {
      should.exist(err);
      done();
    });
    bagpipe.active.should.be.equal(2);
  });

  it('should get BagpipeTimeoutError', function (done) {
    var _async1 = function (ms, callback) {
      setTimeout(function () {
        callback(null, {ms: ms});
      }, 1);
    };
    var _async2 = function (ms, callback) {
      setTimeout(function () {
        callback(null, {ms: ms});
      }, 100);
    };
    var limit = 1;
    var bagpipe = new Bagpipe(limit, {
      refuse: true,
      timeout: 50
    });
    bagpipe.limit.should.be.equal(limit);

    bagpipe.push(_async1, 10, function (err, data) {
      should.not.exist(err);
      should.exist(data);
      data.should.have.property('ms', 10);
    });

    bagpipe.push(_async2, 20, function (err) {
      should.exist(err);
      err.name.should.eql('BagpipeTimeoutError');
      err.message.should.eql('50ms timeout');
      done();
    });
  });
});
