'use strict';

var Promise = require('bluebird'),
  inherits = require('inherits'),
  CommonDB = require('../../common/db'),
  Collection = require('./collection'),
  utils = require('../../../../utils');

var DB = function ( /* name, adapter */ ) {
  CommonDB.apply(this, arguments); // apply parent constructor
  this._cols = {};
};

inherits(DB, CommonDB);

DB.prototype.col = function (name) {
  if (this._cols[name]) {
    return this._cols[name];
  } else {
    var col = new Collection(name, this);
    this._cols[name] = col;
    return col;
  }
};

// TODO: should this return a promise like col.all()??
DB.prototype.all = function (callback) {
  utils.each(this._cols, callback);
};

DB.prototype.close = function () {
  return Promise.resolve();
};

DB.prototype.destroy = utils.resolveFactory();

module.exports = DB;