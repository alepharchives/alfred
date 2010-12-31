var assert = require('assert')
  , fs     = require('fs');

var DB_PATH = __dirname + '/../../tmp/db';

var USERS = {
    1: {name: 'Pedro', age: 35, sex: 'm'}
  , 2: {name: 'John', age: 32, sex: 'm'}
  , 3: {name: 'Bruno', age: 28, sex: 'm'}
  , 4: {name: 'Sandra', age: 35, sex: 'f'}
  , 5: {name: 'Patricia', age: 42, sex: 'f'}
  , 6: {name: 'Joana', age: 29, sex: 'f'}
  , 7: {name: 'Susana', age: 30, sex: 'f'}
};

var USER_COUNT = 7;

module.exports.setup = function() {
  fs.readdirSync(DB_PATH).forEach(function(dir) {
    fs.unlinkSync(DB_PATH + '/' + dir);
  });
};

module.exports.run = function(next) {
  var alfred = require('../../lib/alfred');
  
  var timeout = setTimeout(function() {
    throw new Error('timeout');
  }, 5000);
  
  alfred.open(DB_PATH, function(err, db) {
    if (err) { throw err; }
    db.ensure_key_map_attached('users', null, function(err) {
      if (err) { throw err; }
      
      var age_transform_function = function(user) {
        return user.age;
      };

      var sex_transform_function = function(user) {
        return user.sex;
      };
      
      db.users.ensureIndex('sex', {ordered: true}, sex_transform_function, function(err) {
        db.users.ensureIndex('age', {ordered: true}, age_transform_function, function(err) {
          if (err) { throw err; }
        
          var users_in = 0;
          for (var id in USERS) {
            if (USERS.hasOwnProperty(id)) {
              (function(id) {
                var user = USERS[id];
                db.users.put(id, user, function(err) {
                  if (err) { throw err; }
                  users_in ++;
                  if (users_in == USER_COUNT) {
                    // all users done
                  
                    var users_found = 0;
                    var last_age = 0;
                  
                    db.users.find({'age' : {$gt: 29, $lt: 42, $lte: 35}, 'sex': {$eq: 'f'}}).order('age asc') (function(err, key, value) {
                      if (err) { throw err; }
                      assert.deepEqual(value, USERS[key]);
                      assert.ok(value.age > 29 && value.age <= 35, 'age is not equal to > 29 and < 35 for found user with key ' + key);
                      assert.ok(last_age <= value.age, 'ages are not ordered ascendingly');
                      last_age = value.age;
                      users_found ++;
                      assert.ok(users_found <= 2, 'already found ' + users_found + ' users');
                      if (users_found == 2) {
                        clearTimeout(timeout);
                        db.close(function(err) {
                          if (err) { throw err; }
                          next();
                        })
                      }
                    });
                  }
                });
              })(id);
            }
          }
        });
      });
    })
  });
};