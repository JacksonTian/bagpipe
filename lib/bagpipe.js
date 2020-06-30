'use strict';

const EventEmitter = require('events');

function hasOwnProperty(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

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
 * - `full`, 当活动异步达到限制值时，后续异步调用将被暂存于队列中。此时触发`full`事件，事件传递队列长度值。
 * - `outdated`, 超时后的异步调用异常返回。
 * Options:
 * - `disabled`, 禁用限流，测试时用
 * - `refuse`, 拒绝模式，排队超过限制值时，新来的调用将会得到`TooMuchAsyncCallError`异常
 * - `timeout`, 设置异步调用的时间上限，保证异步调用能够恒定的结束，不至于花费太长时间
 * - `clearQueueWhenError`,当某个任务失败后，清空队列，被阻塞的任务将不再执行（不包括已经触发的任务）
 * @param {Number} limit 并发数限制值
 * @param {Object} options Options
 */
class Bagpipe extends EventEmitter {
  constructor(limit, options = {}) {
    super();

    this.limit = limit;
    this.active = 0;
    this.queue = [];
    this.options = {
      disabled: false,
      refuse: false,
      ratio: 1,
      timeout: null,
      clearQueueWhenError: false,
    };

    if (typeof options === 'boolean') {
      options = {
        disabled: options
      };
    }

    for (var key in this.options) {
      if (hasOwnProperty(options, key)) {
        this.options[key] = options[key];
      }
    }

    // queue length
    this.queueLength = Math.round(this.limit * (this.options.ratio || 1));
  }

  /**
   * 推入方法，参数。最后一个参数为回调函数
   * @param {Function} method 异步方法
   * @param {Mix} args 参数列表，最后一个参数为回调函数。
   */
  push(method, ...args) {
    if (typeof args[args.length - 1] !== 'function') {
      args.push(function () {});
    }

    var callback = args[args.length - 1];

    if (this.options.disabled || this.limit < 1) {
      method(...args);
      return this;
    }

    // 队列长度也超过限制值时
    if (this.queue.length < this.queueLength || !this.options.refuse) {
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
  }

  /*!
   * 继续执行队列中的后续动作
   */
  next() {
    // 到限制，或者没有排队
    if (this.active >= this.limit || !this.queue.length) {
      return;
    }

    const {method, args} = this.queue.shift();

    this.active++;

    const callback = args[args.length - 1];
    var timer = null;
    var called = false;

    // inject logic
    args[args.length - 1] = (err, ...rest) => {
      // anyway, clear the timer
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      if (err && this.options.clearQueueWhenError) {
        this.queue = [];
      }

      // if no timeout, execute real callback
      if (!called) {
        this._next();
        callback(err, ...rest);
      } else {
        // pass the outdated error
        if (err) {
          this.emit('outdated', err);
        }
      }
    };

    var timeout = this.options.timeout;
    if (timeout) {
      timer = setTimeout(() => {
        // set called as true
        called = true;
        if (this.options.clearQueueWhenError) {
          this.queue = [];
        }
        this._next();
        // pass the exception
        var err = new Error(timeout + 'ms timeout');
        err.name = 'BagpipeTimeoutError';
        err.data = {
          name: method.name,
          method: method.toString(),
          args: args.slice(0, -1)
        };
        callback(err);
      }, timeout);
    }

    method(...args);
  }

  _next() {
    this.active--;
    this.next();
  }
}

module.exports = Bagpipe;
