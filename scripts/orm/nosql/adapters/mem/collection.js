'use strict';

var Promise = require('bluebird'),
  inherits = require('inherits'),
  CommonCollection = require('../../common/collection'),
  FilterCursor = require('../../common/cursor/filter'),
  SortCursor = require('../../common/cursor/sort'),
  where = require('../../common/where'),
  order = require('../../common/order'),
  Cursor = require('./cursor'),
  Doc = require('./doc');

var Collection = function (name, db) {
  this._name = name;
  this._db = db;
  this._docs = {};
};

inherits(Collection, CommonCollection);

Collection.prototype.doc = function (data) {
  return new Doc(data, this);
};

Collection.prototype.get = function (id) {
  return Promise.resolve(this._docs[id]);
};

Collection.prototype.find = function (query) {
  var self = this;
  return new Promise(function (resolve) {
    var cursor = new Cursor(self._docs, self),
      filter = query && query.where ? where.filter(query.where) : null,
      filterCursor = new FilterCursor(cursor, filter);
    if (query && query.order) {
      var sort = order.sort(query.order);
      resolve(new SortCursor(filterCursor, sort));
    } else {
      resolve(filterCursor);
    }
  });
};

Collection.prototype._register = function (doc) {
  this._docs[doc.id()] = doc;
  return Promise.resolve();
};

Collection.prototype._unregister = function (doc) {
  delete this._docs[doc.id()];
  return Promise.resolve();
};

module.exports = Collection;