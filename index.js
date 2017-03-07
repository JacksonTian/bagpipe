'use strict';

const Bagpipe = require('./lib/bagpipe');

Bagpipe.limitify = function (asyncCall, options) {
  var bagpipe = new Bagpipe(options);

  return function (...args) {
    bagpipe.push(asyncCall, ...args);
  };
};

module.exports = Bagpipe;
