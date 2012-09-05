/**
 * 构造器，传入限流值，设置异步调用最大并发数
 * @param 
 */
var Bagpipe = function (limit) {
  this.limit = limit;
  this.active = 0;
  this.queue = [];
};

Bagpipe.prototype.push = function (method, args, callback) {
  if (this.limit < 1) {
    args.push(callback);
    method.apply(null, args);
    return this;
  }
  this.queue.push({
    method: method,
    args: args,
    callback: callback
  });
  this.next();
  return this;
};

Bagpipe.prototype.next = function () {
  var that = this;
  if (that.active < that.limit && that.queue.length) {
    var req = that.queue.shift();
    that.run(req.method, req.args, req.callback);
  }
};

Bagpipe.prototype.run = function (method, args, callback) {
  var that = this;
  that.active++;
  args.push(function () {
    that.active--;
    if (that.active < that.limit) {
      that.next();
    }
    callback.apply(null, arguments);
  });
  method.apply(null, args);
};

module.exports = Bagpipe;

