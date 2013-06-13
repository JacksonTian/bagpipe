var util = require("util");
var events = require("events");

/**
 * 构造器，传入限流值，设置异步调用最大并发数
 * Examples:
 * ```
 * var bagpipe = new Bagpipe(100);
 * bagpipe.push(fs.readFile, 'path', 'utf-8', function (err, data) {
 *   // TODO
 * });
 * ```
 * Events:
 * - `full`, 当活动异步达到限制值时，后续异步调用将被暂存于队列中。当队列的长度大于限制值的2倍或100的时候时候，触发`full`事件。事件传递队列长度值。
 * @param {Number} limit 并发数限制值
 * @param {Boolean} disabled 是否禁用并发限制，多用于测试
 */
var Bagpipe = function (limit, options) {
  events.EventEmitter.call(this);
  this.limit = limit;
  this.active = 0;
  this.queue = [];
  this.options = {
    disabled: false,
    refuse: false
  };
  if (typeof options === 'boolean') {
    options = {
      disabled: options
    };
  }
  options = options || {};
  this.timeout = options.timeout || null;
  for (var key in this.options) {
    if (options.hasOwnProperty(key)) {
      this.options[key] = options[key];
    }
  }
};
util.inherits(Bagpipe, events.EventEmitter);

/**
 * 推入方法，参数。最后一个参数为回调函数
 * @param {Function} method 异步方法
 * @param {Mix} args 参数列表，最后一个参数为回调函数。
 */
Bagpipe.prototype.push = function (method) {
  var args = [].slice.call(arguments, 1);
  var callback = args[args.length - 1];
  if (typeof callback !== 'function') {
    args.push(function () {});
  }
  if (this.options.disabled || this.limit < 1) {
    method.apply(null, args);
    return this;
  }

  // 队列长度也超过限制值时
  if (this.queue.length < this.limit || !this.options.refuse) {
    this.queue.push({
      method: method,
      args: args
    });
  } else {
    var err = new Error('Too much async call in queue');
    err.name = 'TooMuchAsyncCallError';
    callback(err);
  }

  if (this.queue.length > 1) {
    this.emit('full', this.queue.length);
  }

  this.next();
  return this;
};

/*!
 * 继续执行队列中的后续动作
 */
Bagpipe.prototype.next = function () {
  var that = this;
  if (that.active < that.limit && that.queue.length) {
    var req = that.queue.shift();
    that.run(req.method, req.args);
  }
};

/*!
 * 执行队列中的方法
 */
Bagpipe.prototype.run = function (method, args) {
  var that = this;
  var timer = null;
  var _next = function () {
    that.active--;
    if (that.active < that.limit) {
      that.next();
    }
  };
  that.active++;
  var callback = args[args.length - 1];
  // 注入回调函数
  args[args.length - 1] = function () {
    if (!that.timeout) {
      _next();
      callback.apply(null, arguments);
    } else if (timer) { // that.timeout && timer
      clearTimeout(timer);
      timer = null;
      _next();
      callback.apply(null, arguments);
    }
  };

  if (that.timeout) {
    timer = setTimeout(function () {
      timer = null;
      _next();
      var err = new Error(that.timeout + 'ms timeout');
      err.name = 'BagpipeTimeoutError';
      callback.apply(null, [err]);
    }, that.timeout);
  }
  method.apply(null, args);
};

module.exports = Bagpipe;

