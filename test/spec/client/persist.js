'use strict';

var utils = require('../../../scripts/utils'),
  MemAdapter = require('../../../scripts/orm/nosql/adapters/mem'),
  Client = require('../../../scripts/client/adapter'),
  DB = require('../../../scripts/client/db');

describe('client', function () {

  var store = null,
    client = null,
    db = null,
    tasks = null,
    task = null,
    propsReady = null;

  beforeEach(function () {
    store = new MemAdapter();
    client = new Client(store);
    propsReady = utils.once(client, 'load');
    db = client.db({
      db: 'mydb'
    });
    return db.col('tasks').then(function (collection) {
      tasks = collection;
      task = tasks.doc();
    });
  });

  it('it should restore from store', function () {

    var client2 = null,
      db2 = null,
      tasks2 = null;

    var nowStr = (new Date()).getTime();

    // Fake dat to ensure that states are reloaded. The data is dummy data and is not logically
    // sound.
    var dat = {
      data: {
        $id: '1',
        thing: 'sing',
        priority: 'high'
      },
      changes: [{
        id: '1',
        col: 'tasks',
        name: 'thing',
        val: '"sing"',
        up: nowStr,
        re: nowStr
      }, {
        id: '2',
        col: 'tasks',
        name: 'priority',
        val: '"high"',
        up: nowStr,
        re: nowStr
      }],
      latest: {
        thing: {
          val: 'sing',
          up: nowStr,
          seq: 2,
          re: nowStr
        }
      },
      destroyedAt: nowStr,
      updatedAt: nowStr,
      recordedAt: nowStr,
      $id: '1' // this will be inserted when dat is stored in the payload of the docStore
    };

    task._dat = utils.clone(dat);
    task.id(task._dat.data.$id);

    return propsReady.then(function () {
      // Populate since
      return db._props.set({
        since: nowStr,
        version: DB.VERSION
      });
    }).then(function () {
      return task.save();
    }).then(function () {
      // Simulate a reload from store, e.g. when an app restarts, by reloading the store
      client2 = new Client(store);
      db2 = client2.db({
        db: 'mydb'
      });

      // Wait until all the docs have been loaded from the store
      return utils.once(client2, 'load');
    }).then(function () {
      // Verify restoration of since
      var props = db2._props.get();
      props.should.eql({
        $id: 'props',
        since: nowStr,
        version: DB.VERSION
      });
    }).then(function () {
      return db2.col('tasks');
    }).then(function (collection) {
      tasks2 = collection;
    }).then(function () {
      return tasks2.find(null, true); // include destroyed docs
    }).then(function (docs) {
      return docs.each(function (doc) {
        doc._dat.should.eql(dat);
      });
    });
  });

  it('should handle race conditions', function () {
    // Make sure there are no race conditions with loading, e.g.
    //   planner = client.db('planner');
    //   tasks = web.col('tasks');
    //   write = tasks.doc({ thing: 'write' });
    // What if write is already in the store and loads after we have the handles above?

    var client2 = null,
      db2 = null,
      tasks2 = null,
      task2 = null;

    var setUpClient2 = function () {
      client2 = new Client(store);
      db2 = client2.db({
        db: 'mydb'
      });
      return db2.col('tasks').then(function (collection) {
        tasks2 = collection;
      });
    };

    // Populate underlying store
    return task.set({
      thing: 'sing'
    }).then(function () {
      return setUpClient2();
    }).then(function () {
      // Simulate initializing of store after client was setup
      client2._initStore();
      return utils.once(client2, 'load');
    }).then(function () {
      // We need to wait to get the task as the doc isn't registered until save() is called.
      // Alternatively, we could call task2.save() above in setUpClient2().
      return tasks2.get(task.id());
    }).then(function (doc) {
      task2 = doc;
      // Ensure that task was still loaded from store
      task2.get().should.eql({
        $id: task.id(),
        thing: 'sing'
      });
    });

  });

});