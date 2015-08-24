'use strict';

// TODO: should events be moved to nosql/common layer?

var inherits = require('inherits'),
  MemAdapter = require('../orm/nosql/adapters/mem/adapter'),
  DB = require('./db'),
  utils = require('../utils');

var Adapter = function (store) {
  MemAdapter.apply(this, arguments); // apply parent constructor
  this._store = store;
};

// We inherit from MemAdapter so that we can have singular references in memory to items like Docs.
// This in turn allows us to emit and listen for events across different modules. The downside is
// that we end up with data duplicated in both local mem and the store.

inherits(Adapter, MemAdapter);

Adapter.prototype._emit = function () { // event, arg1, ... argN
  this.emit.apply(this, utils.toArgsArray(arguments));
};

Adapter.prototype.uuid = function () {
  return utils.uuid();
};

// opts: db
Adapter.prototype.db = function (opts) {
  var dbStore = this._store.db(opts);
  var db = new DB(opts.db, this, dbStore);
  this.emit('db:create', db);
  return db;
};

module.exports = Adapter;