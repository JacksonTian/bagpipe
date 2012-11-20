module.exports = process.env.BAGPIPE_COV ? require('./lib-cov/bagpipe') : require('./lib/bagpipe');
