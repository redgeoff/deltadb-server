'use strict';

var utils = require('../../../utils'),
  EventEmitter = require('events').EventEmitter,
  inherits = require('inherits');
// Doc = require('./doc');

var Collection = function (name, db) {
  this._name = name;
  this._db = db;
};

inherits(Collection, EventEmitter);

// Collection.prototype.doc = function (data) {
//   return new Doc(data, this);
// };

// Collection.prototype.get = function ( /* id */ ) {};

// Collection.prototype.find = function ( /* query */ ) {};

Collection.prototype.all = function () {
  return this.find();
};

// Collection.prototype.order = function ( /* criteria */ ) {};

Collection.prototype.destroy = utils.resolveFactory();

Collection.prototype._register = utils.resolveFactory();

Collection.prototype._unregister = utils.resolveFactory();

module.exports = Collection;