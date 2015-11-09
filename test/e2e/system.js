'use strict';

var DeltaDB = require('../../scripts/client/delta-db'),
  config = require('../../config'),
  utils = require('../../scripts/utils'),
  clientUtils = require('../../scripts/client/utils'),
  Doc = require('../../scripts/client/doc');

/**
 * The goal of this test is to make sure that we filter system DB deltas so that a client receives
 * only system deltas it generates and doesn't receive all system deltas. E.G. if client A creates
 * 'mydb', we don't want client B to receive this notification as we could have many DBs and don't
 * want each client to download all the DB names.
 */
describe('system', function () {

  // A lot of time is needed as we destroy and create the dbs several times. Unfortunately, it
  // appears that mocha doesn't support embedding this in a before() or beforeEach().
  this.timeout(20000);

  var db = null,
    dbsCreated = [],
    dbsUpdated = [],
    dbsDestroyed = [],
    pol = null,
    policiesCreated = [],
    policiesUpdated = [],
    usersCreated = [],
    usersUpdated = [],
    roleUsersCreated = [],
    roleUsersUpdated = [];

  var createDB = function (dbName) {
    db = new DeltaDB(dbName, config.URL);
    var tasks = db.col('tasks');
    var task = tasks.doc({
      thing: 'write'
    });
    task.save();

    // Waiting for the following event ensures that the DB has already been created
    return utils.once(task, 'doc:record');
  };

  var destroyDB = function () {
    return db.destroy().then(function () {
      return DeltaDB._systemDB().destroy(true, false);
    }).then(function () {
      // TODO: remove this after we have a system db per db
      // Set to null to force creation of a new system DB
      DeltaDB._clearSystemDB();

      return null; // prevent runaway promise warnings
    });
  };

  var policy = function (attrName) {

    // We use an attr policy as we already have a default policy defined for our col
    pol = {
      col: {
        create: '$all',
        read: '$all',
        update: '$all',
        destroy: '$all'
      },
      attrs: {}
    };

    // Vary the attrName so that we don't define a policy that is already defined
    pol.attrs[attrName] = {
      create: '$all',
      read: '$all',
      update: '$all',
      destroy: '$all'
    };

    return DeltaDB._systemDB().policy('$db', pol).then(function (doc) {
      return utils.once(doc, 'doc:record');
    });
  };

  var createUser = function (uuid, username) {
    return DeltaDB._systemDB().createUser(uuid, username, 'secret', 'enabled').then(function (
      doc) {
      return utils.once(doc, 'doc:record');
    });
  };

  var updateUser = function (uuid, username) {
    return DeltaDB._systemDB().updateUser(uuid, username, 'secret', 'disabled').then(function (
      doc) {
      return utils.once(doc, 'attr:record');
    });
  };

  var addRole = function (userUUID, roleName) {
    return DeltaDB._systemDB().addRole(userUUID, roleName);
  };

  var removeRole = function (userUUID, roleName) {
    return DeltaDB._systemDB().removeRole(userUUID, roleName);
  };

  beforeEach(function () {
    return createDB('mydb').then(function () {
      return policy('thing');
    }).then(function () {
      return createUser('first-user-uuid', 'first-user');
    }).then(function () {
      return updateUser('first-user-uuid', 'first-user');
    }).then(function () {
      return addRole('first-user-uuid', 'first-role');
    }).then(function () {
      return removeRole('first-user-uuid', 'first-role');
    }).then(function () {
      return destroyDB();
    });
  });

  it('should filter system deltas', function () {
    var systemDB = DeltaDB._systemDB();

    systemDB.on('doc:create', function (doc) {

      var data = doc.get();

      var dbName = data[clientUtils.DB_ATTR_NAME];
      if (dbName && typeof dbName === 'string') { // db created?
        dbsCreated.push(dbName);
      }

      var policy = data[Doc._policyName];
      if (policy) { // db created?
        policiesCreated.push(policy);
      }

      var user = data[Doc._userName];
      if (user) { // user created?
        usersCreated.push(user);
      }

      var roleUser = data[Doc._roleName];
      if (roleUser) { // user added to role?
        roleUsersCreated.push(roleUser);
      }

    });

    systemDB.on('doc:update', function (doc) {

      var data = doc.get();

      var dbName = data[clientUtils.DB_ATTR_NAME];
      if (dbName && typeof dbName === 'string') { // db created?
        dbsUpdated.push(dbName);
      }

      var policy = data[Doc._policyName];
      if (policy) { // db created?
        policiesUpdated.push(policy);
      }

      var user = data[Doc._userName];
      if (user) { // user created?
        usersUpdated.push(user);
      }

      var roleUser = data[Doc._roleName];
      if (roleUser) { // user added to role?
        roleUsersUpdated.push(roleUser);
      }

    });

    systemDB.on('doc:destroy', function (doc) {
      var data = doc.get();

      var dbName = data[clientUtils.DB_ATTR_NAME];

      if (dbName && typeof dbName === 'string') { // db destroyed?
        dbsDestroyed.push(dbName);
      }

    });

    return createDB('myotherdb').then(function () {
      return policy('priority');
    }).then(function () {
      return createUser('second-user-uuid', 'second-user');
    }).then(function () {
      return updateUser('second-user-uuid', 'second-user');
    }).then(function () {
      return addRole('second-user-uuid', 'second-role');
    }).then(function () {
      return removeRole('second-user-uuid', 'second-role');
    }).then(function () {
      return destroyDB();
    }).then(function () {

      // Make sure we only received the 2nd db
      dbsCreated.should.eql(['myotherdb']);
      dbsUpdated.should.eql(['myotherdb']);
      dbsDestroyed.should.eql(['myotherdb']);

      // Make sure we only received the 2nd policy
      policiesCreated[0].should.eql(pol);
      policiesUpdated[0].should.eql(pol);

      // Make sure we only received the 2nd user
      usersCreated[0].username.should.eql('second-user');
      usersUpdated[0].username.should.eql('second-user');

      // Make sure we only receive the 2nd role-users
      roleUsersCreated.length.should.eql(3);
      roleUsersCreated[0].action.should.eql('add'); // originating id-less "add" doc
      roleUsersCreated[0].userUUID.should.eql('second-user-uuid');
      roleUsersCreated[1].action.should.eql('add'); // recorded "add" doc
      roleUsersCreated[1].userUUID.should.eql('second-user-uuid');
      roleUsersCreated[2].action.should.eql('remove'); // originating id-less "remove" doc
      roleUsersCreated[2].userUUID.should.eql('second-user-uuid');

      roleUsersUpdated.length.should.eql(4);
      roleUsersUpdated[0].action.should.eql('add'); // originating id-less "add" doc
      roleUsersUpdated[0].userUUID.should.eql('second-user-uuid');
      roleUsersUpdated[1].action.should.eql('add'); // recorded "add" doc
      roleUsersUpdated[1].userUUID.should.eql('second-user-uuid');
      roleUsersUpdated[2].action.should.eql('remove'); // originating id-less "remove" doc
      roleUsersUpdated[2].userUUID.should.eql('second-user-uuid');
      roleUsersUpdated[3].action.should.eql('remove'); // recorded "remove" doc
      roleUsersUpdated[3].userUUID.should.eql('second-user-uuid');

      return null; // prevent runaway promise errors
    });
  });

});