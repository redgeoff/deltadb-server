'use strict';

var Promise = require('bluebird'),
  inherits = require('inherits'),
  utils = require('../../utils'),
  AbstractDoc = require('../../doc');

var Doc = function (doc, collection) {
  AbstractDoc.apply(this, arguments); // apply parent constructor
  this._collection = collection;
  this._idName = collection._db._idName;
};

inherits(Doc, AbstractDoc);

Doc.prototype._put = function (doc) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var tx = self._collection._db._db.transaction(self._collection._storeName, 'readwrite'),
      store = tx.objStore(self._collection._storeName);

    var request = store.put(doc);

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function () {
      reject(request.error);
    };

    // TODO: do we also need tx.oncomplete and tx.onerror and if so can we use them instead of
    // request.onsuccess and request.onerror??
  });
};

Doc.prototype._insert = function () {
  this.id(utils.uuid());
  // TODO: should we clear the id if there is an error?
  return this._put(this._data);
};

Doc.prototype._update = function () {
  return this._put(this._data);
};

Doc.prototype._save = function () {
  var self = this,
    promise = self.id() ? self._update() : self._insert();
  return promise.then(function () {
    self.clean();
  });
};

// IndexedDB doesn't support a partial update so we have to get the record, merge and then save
Doc.prototype._merge = function () {
  var self = this;
  return self._collection.get(self.id()).then(function (doc) {
    var updates = self.get(self.dirty());
    updates = utils.merge(doc._data, updates);
    return self._put(updates);
  });
};

// TODO: need to implement "merge" vs "save" in mongo adapter

Doc.prototype.merge = function () {
  var self = this,
    promise = self.id() ? self._merge() : self._insert();
  return promise.then(function () {
    self.clean();
  });
};

Doc.prototype._destroy = function () {
  var self = this;
  return new Promise(function (resolve, reject) {
    var tx = self._collection._db._db.transaction(self._collection._storeName, 'readwrite'),
      store = tx.objStore(self._collection._storeName);

    var request = store.delete(self.id());

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function () {
      reject(request.error);
    };
  });
};

module.exports = Doc;