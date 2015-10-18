'use strict';

// TODO: better to make log file a command line option than output to stdout?
var log = require('../server/log');
log.console(true);

var Server = require('./server'),
  Process = require('./process'),
  System = require('../system'),
  Partitioner = require('../partitioner/sql'),
  Manager = require('../manager');

var server = new Server(),
  process = new Process();

/**
 * Create the system DB if it doesn't already exist
 */
var ensureSystemDBCreated = function () {
  var partitioner = new Partitioner();
  var manager = new Manager(partitioner);
  var system = new System(manager);
  return partitioner.dbExists(partitioner._dbName).then(function (exists) {
    if (!exists) {
      return system.create().then(function () {
        return partitioner.closeDatabase(); // close DB connection to return resources
      });
    }
  });
};

ensureSystemDBCreated().then(function () {
  process.run();
  server.listen();
});