'use strict';

var EventEmitter = require('events').EventEmitter,
  inherits = require('inherits'),
  utils = require('../../../utils');
// DB = require('./db');

var Adapter = function () {};

inherits(Adapter, EventEmitter);

Adapter.prototype._load = utils.resolveFactory();

// // opts: db
// Adapter.prototype.db = function (opts) {
//   var db = new DB(opts.db, this);
//   this.emit('db:create', db); // TODO: should this be here?
//   return db;
// };

module.exports = Adapter;