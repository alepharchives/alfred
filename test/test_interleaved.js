module.exports.run = function(next) {
  
  var assert = require('assert'),
      sys    = require('sys') || require('util'),
      fs     = require('fs'),
      random = require('../tools/random_generator');
  
  var WRITE_READ_COUNT = 10000;
  
  var file_path = __dirname + '/../tmp/flush_interleaved_test.alf';
      
  require(__dirname + '/../lib/alfred/cached_key_map.js').open(file_path, function(err, key_map) {

    if (err) {
      throw err;
    }

    var map = {};

    key_map.clear(function(err) {
      if (err) {
        throw err;
      }
      
      var read_count = 0;
      
      var timeout = setTimeout(function() {
        assert.ok(false, 'timeout');
      }, 60000);
      
      for(var i=0; i < WRITE_READ_COUNT; i++) {
        (function(i) {
          var obj = random.createRandomObject();
          var key = random.createRandomString(16);
          key_map.put(key, obj, function(err) {
            if (err) {
              throw err;
            }
            key_map.get(key, function(err, value) {
              assert.deepEqual(value, obj);
              read_count ++;
              if (read_count == WRITE_READ_COUNT) {
                // ended
                
                // test functional index interleaving
                
                var transform_function = function(record) {
                  return record.a + record.b;
                };
                key_map.addIndex('a', transform_function, function(err) {
                  if (err) {
                    throw err;
                  }
                  var matches = 0;
                  for(var i=0; i < WRITE_READ_COUNT; i++) {
                    (function(i) {
                      var obj2 = random.createRandomObject();
                      var key2 = random.createRandomString(16);
                      key_map.put(key2, obj2, function(err) {
                        if (err) {
                          throw err;
                        }
                        key_map.filter('a', function(record) {
                          //console.log(record);
                          return record == obj2.a + obj2.b;
                        }, function(err, key, value) {
                          if (err) {
                            throw err;
                          }
                          assert.equal(key, key2);
                          assert.deepEqual(value, obj2);
                          matches ++;
                          if (matches == WRITE_READ_COUNT) {
                            clearTimeout(timeout);
                            next();
                          }
                        }, true);
                      });
                    })(i);
                  }
                });
              }
            });
          });
        })(i);
      }
    });
  });
};