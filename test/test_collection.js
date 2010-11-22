module.exports.run = function(next) {
  
  var assert = require('assert');
  require(__dirname + '/../lib/alfred/collection.js').open(__dirname + '/../tmp/collection_test.alf', function(err, collection) {
    if (err) {
      throw err;
    }
    
    var createRandomString = function(string_length) {
      var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
      var randomstring = '';
      for (var i=0; i<string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum,rnum+1);
      }
      return randomstring;
    };

    var createRandomObject = function() {
      return {
        a: createRandomString(10),
        b: createRandomString(100),
        c: createRandomString(100)
      };
    };

    var records = [];

    collection.clear(function(err) {
      if (err) {
        throw err;
      }
      for (var i = 0; i < 1000; i ++) {
        var record = createRandomObject();
        records.push(record);
        collection.write(record, function(err) {
          if (err) {
            throw err
          }
        });
      }

      // wait for flush
      setTimeout(function() {
        var index = 0;
        collection.read(function(error, record) {        
          assert.equal(error, null);
          if(record === null) {
            // reached the end
            assert.equal(records.length, index);
            collection.end();
            next();
          } else {
            assert.deepEqual(record, records[index], "Object at index " + index + ' differs.');
            index ++;
          }
        });
      }, 2000);

    });
    
  });
  

}
