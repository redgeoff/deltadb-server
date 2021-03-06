'use strict';

var Promise = require('bluebird'),
  inherits = require('inherits'),
  AbstractDoc = require('../../doc');

var Doc = function (doc, collection) {
  AbstractDoc.apply(this, arguments); // apply parent constructor
  this._collection = collection;
};

inherits(Doc, AbstractDoc);

Doc.prototype._insert = function () {
  // var insert = Promise.promisify(this._collection._collection.insert); // not working
  // return insert(this._data);
  var self = this;
  return new Promise(function (resolve, reject) {
    self._collection._collection.insert(self._data, function (err, docs) {
      if (err) {
        reject(err);
      } else {
        self.id(docs[0]._id);
        resolve();
      }
    });
  });
};

Doc.prototype._update = function () {
  var self = this;
  return new Promise(function (resolve, reject) {

    var updates = self.get(self.dirty());

    self._collection._collection.update({
        _id: self.id()
      }, {
        $set: updates
      },
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });

  });
};

Doc.prototype._save = function () {
  var self = this,
    promise = self.id() ? self._update() : self._insert();
  return promise.then(function () {
    self.clean();
  });
};

Doc.prototype._destroy = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    self._collection._collection.destroy({
      _id: self.id()
    }, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = Doc;