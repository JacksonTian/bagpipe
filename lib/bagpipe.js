/**
 * 构造器，传入限流值，设置异步调用最大并发数
 * Examples:
 * ```
 * var bagpipe = new Bagpipe(100);
 * bagpipe.push(fs.readFile, ['path', 'utf-8'], function (err, data) {
 *   // TODO
 * });
 * ```
 * @param {Number} limit 并发数限制值
 * @param {Boolean} disabled 是否禁用并发限制，多用于测试
 */
var Bagpipe = function (limit, disabled) {
  this.limit = limit;
  this.active = 0;
  this.queue = [];
  this.disabled = !!disabled;
};

/**
 * 推入方法，参数和回调
 * @param {Function} method 异步方法
 * @param {Array} args 除开回调的参数，如果该异步方法只有一个回调函数作为参数，那么此时，请输入[]
 * @param {Function} callback 异步方法的回调函数
 */
Bagpipe.prototype.push = function (method, args, callback) {
  if (this.disabled || this.limit < 1) {
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

  var upper = Math.min(this.limit * 2, 100);
  if (this.queue.length > upper) {
    console.warn('Queue length is too long, be careful memory leak.');
  }

  return this;
};

/*!
 * 继续执行队列中的后续动作
 */
Bagpipe.prototype.next = function () {
  var that = this;
  if (that.active < that.limit && that.queue.length) {
    var req = that.queue.shift();
    that.run(req.method, req.args, req.callback);
  }
};

/*!
 * 执行队列中的方法
 */
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

