'use strict';

var utils = require('../../../utils'),
  EventEmitter = require('events').EventEmitter,
  inherits = require('inherits');

var Collection = function () {};

inherits(Collection, EventEmitter);

// Collection.prototype.define = function ( /* doc */ ) {};

// Collection.prototype.at = function ( /* id */ ) {};

// Collection.prototype.find = function ( /* query */ ) {};

Collection.prototype.all = function () {
  return this.find();
};

// Collection.prototype.order = function ( /* criteria */ ) {};

Collection.prototype.destroy = utils.resolveFactory();

module.exports = Collection;