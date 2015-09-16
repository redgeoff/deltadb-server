'use strict';

var Adapter = require('../spec/orm/nosql/adapter');

describe('adapters', function () {

  var ORM = require('../../scripts/orm/nosql/adapters/indexeddb');

  var adapter = new Adapter(new ORM());

  adapter.test();

  // TODO: want to test all applicable adapters in browser, but only execute certain tests for
  // certain browsers
  var idbAdapter = new Adapter(new ORM());
  idbAdapter.test();

});