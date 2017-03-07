'use strict';

const Bagpipe = require('./lib/bagpipe');

Bagpipe.limitify = function (asyncCall, bagpipe) {
  return function (...args) {
    bagpipe.push(asyncCall, ...args);
  };
};

module.exports = Bagpipe;
