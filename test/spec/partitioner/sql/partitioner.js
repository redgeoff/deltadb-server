'use strict';

var testUtils = require('../../../utils'),
  Partitioner = require('../../../../scripts/partitioner/sql');

describe('partitioner', function () {

  testUtils.setUp(this);

  var part = null;

  beforeEach(function () {
    part = new Partitioner('testdb');
    return part.connect();
  });

  afterEach(function () {
    return part.closeDatabase();
  });

  it('should create and destroy another db', function () {
    return part.createAnotherDatabase('testdb2').then(function () {
      return part.destroyAnotherDatabase('testdb2');
    });
  });

  it('should throw error if trying to connect to missing db', function () {
    var otherPart = new Partitioner('testdb2');
    return testUtils.shouldThrow(function () {
      return otherPart.connect();
    });
  });

});