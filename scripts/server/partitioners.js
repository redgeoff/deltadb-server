'use strict';

// TODO: separate polling code into different model?

var Promise = require('bluebird'),
  Partitioner = require('../partitioner/sql'),
  log = require('../utils/log'),
  utils = require('../utils'),
  clientUtils = require('../client/utils'),
  SocketClosedError = require('../orm/sql/common/socket-closed-error');

var Partitioners = function () {
  this._partitioners = {};
};

Partitioners.POLL_SLEEP_MS = 1000;

// Partitioners.prototype._checkConnection = function (part, socket, since) {
// console.log('Partitioners.prototype._checkConnection1');
//   var self = this;
// console.log('Partitioners.prototype._checkConnection2');
//   return part._sql.alive().then(function () {
// console.log('Partitioners.prototype._checkConnection2a');
//     return part;
//   }).catch(function (err) {
// console.log('Partitioners.prototype._checkConnection3, err=', err);
//     if (err instanceof SocketClosedError) {
// console.log('Partitioners.prototype._checkConnection4, err=', err);
//       return part._sql.connect();
//       // return self._unregisterPartitioner(part._dbName).then(function () {
//       //   return self.register(part._dbName, socket, since);
//       // });
//     }
//   });
// };

// Partitioners.prototype._checkConnection = function (part) {
// console.log('Partitioners.prototype._checkConnection1');
//   return part._sql.ping().catch(function (err) {
// console.log('Partitioners.prototype._checkConnection2');
//     // If we receive a SocketClosedError the connection will automatically be flagged as closed
//     if (!(err instanceof SocketClosedError)) {
// console.log('Partitioners.prototype._checkConnection3');
//       throw err;
//     }
// console.log('Partitioners.prototype._checkConnection4');
//   });
// };

Partitioners.prototype._checkConnectionAndReregister = function (part, socket, since) {
console.log('Partitioners.prototype._checkConnectionAndReregister1');
  var self = this;
  return part._sql.ping().then(function () {
console.log('Partitioners.prototype._checkConnectionAndReregister1a');
    return part;
  }).catch(function (err) {
console.log('Partitioners.prototype._checkConnectionAndReregister2');
    if (err instanceof SocketClosedError) {
console.log('Partitioners.prototype._checkConnectionAndReregister3');
      return self._unregisterPartitioner(part._dbName).then(function () {
console.log('Partitioners.prototype._checkConnectionAndReregister4');
        return self.register(part._dbName, socket, since);
      });
    } else {
console.log('Partitioners.prototype._checkConnectionAndReregister5');
      throw err;
    }
  });
};

// TODO: split up
Partitioners.prototype.register = function (dbName, socket, since) {
console.log('Partitioners.prototype.register1');
  var self = this;
  if (self._partitioners[dbName]) { // exists?
console.log('Partitioners.prototype.register2');
    self._partitioners[dbName].conns[socket.conn.id] = {
      socket: socket,
      since: since
    };
//    return self._partitioners[dbName].ready;
    return self._partitioners[dbName].ready.then(function () {
      return self._checkConnectionAndReregister(self._partitioners[dbName].part, socket, since);
    });
  } else {
console.log('Partitioners.prototype.register3');

    // First conn for this partitioner
    var part = new Partitioner(dbName),
      conns = {};

//     part.on('disconnect', function () {
// console.log('@@@@@@@@@@@@@@@@@@@DISCONNECT dbName=', dbName);
//       // Remote party closed socket so remove partitioner
//       self._unregisterPartitioner(dbName).catch(function (err) {
// console.log('disconnect err=', err);
// process.exit(1);
//       });
//     });

    conns[socket.conn.id] = {
      socket: socket,
      since: since
    };

    var container = {
      part: part,
      conns: conns,
      poll: true,
      since: null
    };

    // Save promise so that any registrations for the same partitioner that happen back-to-back can
    // wait until the partitioner is ready
    container.ready = part.connect().then(function () {

      // Has a competing registration already set the dbName?
      if (self._partitioners[dbName]) {
        // Add connection
        self._partitioners[dbName].conns[socket.conn.id] = conns[socket.conn.id];
      } else {
        self._partitioners[dbName] = container;
        self._poll(part);
      }

      return part;
    }).then(function () {
      return self._checkConnectionAndReregister(part, socket, since);
    });

    return container.ready;
  }
};

Partitioners.prototype._unregisterPartitioner = function (dbName) {
  // This needs to be kept here and not nested in another fn so that the process of removing the
  // socket and stopping the polling is atomic
  this._partitioners[dbName].poll = false; // stop polling

  var part = this._partitioners[dbName].part;

  // Delete before closing as the close is a promise and we don't want another cycle to use a
  // partitioner that is being closed.
  delete this._partitioners[dbName];

  return part.closeDatabase().then(function () {
    log.info('closed ' + dbName);
  });
};

Partitioners.prototype.unregister = function (dbName, socket) {
  // Remove the connection

  // Guard against race conditions
  if (!this._partitioners[dbName]) {
    return Promise.resolve();
  }

  delete this._partitioners[dbName].conns[socket.conn.id];

  // Delete partitioner if no more connections for this partition
  if (utils.empty(this._partitioners[dbName].conns)) {
    return this._unregisterPartitioner(dbName);
  } else {
    return Promise.resolve();
  }
};

Partitioners.prototype._shouldPoll = function (partitioner) {
  return this._partitioners[partitioner._dbName] && this._partitioners[partitioner._dbName].poll;
};

Partitioners.prototype._notifyAllPartitionerConnections = function (partitioner, newSince) {
  var self = this;

  // Loop through all associated conns and notify that sync is needed
  utils.each(self._partitioners[partitioner._dbName].conns, function (conn) {
    self.findAndEmitChanges(partitioner._dbName, conn.socket);
  });

  self._partitioners[partitioner._dbName].since = newSince; // update since
};

// TODO: how does server determine when to look for changes? In future, would be nice if this code
// could be alerted via an event when there is a new change. For now, we'll just implement a polling
// mechanism. Is something better really needed?
Partitioners.prototype._doPoll = function (partitioner) {
  var self = this,
    newSince = new Date(); // save timestamp before to prevent race condition

  // Check for changes
console.log('checking for changes after ', self._partitioners[partitioner._dbName].since);
  return self._hasChanges(partitioner, self._partitioners[partitioner._dbName].since)
    .then(function (has) {
      if (has) {
        return self._notifyAllPartitionerConnections(partitioner, newSince);
      }
    }).catch(function (err) {
//      log.error('doPoll error=' + err);
console.log('Partitioners.prototype._doPoll1, dbName=', partitioner._dbName, 'err=', err);
      // Ignore SocketClosedError error as socket may have been closed when destroying db
      if (!(err instanceof SocketClosedError)) {
console.log('Partitioners.prototype._doPoll2, err=', err);
        throw err;
      }
console.log('Partitioners.prototype._doPoll3, err=', err);
    });
};

Partitioners.prototype._hasChanges = function (partitioner, since) {
  // TODO: refactor partitioner so that you can just check for changes instead of actually getting
  // the changes?
  var all = partitioner._dbName === clientUtils.SYSTEM_DB_NAME; // TODO: make configurable?
  return partitioner.changes(since, null, 1, null, all).then(function (changes) {
    return changes.length > 0;
  });
};

Partitioners.prototype._poll = function (partitioner) {
  var self = this;
  if (self._shouldPoll(partitioner)) {
    self._doPoll(partitioner).then(function () {
      setTimeout(function () {
        self._poll(partitioner);
      }, Partitioners.POLL_SLEEP_MS);
    });
  }
};

Partitioners.prototype._emitChanges = function (socket, changes, since) {
  var msg = {
    changes: changes,
    since: since
  };
  log.info('sending (to ' + socket.conn.id + ') ' + JSON.stringify(msg));
  socket.emit('changes', msg);
};

// TODO: remove dbName parameter as can derive dbName from socket
Partitioners.prototype._queueChanges = function (dbName, socket, msg) {
  log.info('received (from ' + socket.conn.id + ') ' + JSON.stringify(msg));

  var self = this,
    part = self._partitioners[dbName].part;

  // TODO: this needs to be a variable, e.g. false if there is only one DB server and true if there
  // is more than 1
  var quorum = true;
  return part.queue(msg.changes, quorum);
};

// TODO: remove dbName parameter as can derive dbName from socket
Partitioners.prototype.findAndEmitChanges = function (dbName, socket) {
  var self = this,
    part = self._partitioners[dbName].part,
    since = self._partitioners[dbName].conns[socket.conn.id].since,
    newSince = new Date();

  self._partitioners[dbName].conns[socket.conn.id].since = newSince;

  // TODO: need to support pagination. Need to cap the results with the offset param, but then
  // need to report to client that there is more data and to do another sync, but don't need
  // client to resend changes. On the other side, how do we handle pagination from client?
  var all = dbName === clientUtils.SYSTEM_DB_NAME; // TODO: make configurable?
  return part.changes(since, null, null, null, all).then(function (changes) {
    if (changes.length > 0) { // Are there local changes?
      self._emitChanges(socket, changes, newSince);
    }
  }).catch(function (err) {
console.log('Partitioners.prototype.findAndEmitChanges, dbName=', dbName, 'err=', err);
    // Ignore SocketClosedError as it could have been caused when a db was destroyed
    if (!(err instanceof SocketClosedError)) {
      throw err;
    }
  });
};

module.exports = Partitioners;
