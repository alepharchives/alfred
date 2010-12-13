var options_merger = require('../util/options_merger'),
    bplustree         = require('../../../dist/bplustree');

var default_options = {
  bplustree_order: 100
};

var OrderedIndex = function(transform_function, options) {  
  this.transform_function = transform_function;
  this.options = options_merger.merge(default_options, options);
  this.bplustree = bplustree.create({
    order: this.options.bplustree_order
  });
  this.key_to_transformed_map = {};
  this.transformed_map = {};
};

module.exports.open = function(transform_function, options) {
  return new OrderedIndex(transform_function, options);
};

OrderedIndex.prototype.transformFunction = function() {
  return this.transform_function;
};

OrderedIndex.prototype.put = function(key, value, pos, length) {
  
  var transformed_pointer = this.key_to_transformed_map[key];
  
  if (transformed_pointer) {
    transformed_pointer.forEach(function(rec, index) {
      if (rec.k == key) {
        transformed_pointer.splice(index, 1);
      }
    });
  }
  
  if (value) {
    
    var transformed = this.transform_function(value);
    if (transformed) {
      var newRecord = {
        r: transformed,
        k: key,
        p: pos,
        l: length
      };
      if (transformed_pointer = this.transformed_map[transformed]) {
        transformed_pointer.push(newRecord);
      } else {
        this.transformed_map[transformed] = transformed_pointer = [newRecord];
        this.key_to_transformed_map[key] = transformed_pointer;
        
        this.bplustree.set(transformed, transformed_pointer);
      }
    }
  } else {
    delete this.key_to_transformed_map[key];
  }
};

OrderedIndex.prototype.match = function(match, callback) {
  var values = this.transformed_map[match];
  if (values) {
    values.forEach(function(value) {
      callback(value.k, value.p, value.l);
    });
  } else {
    callback(null, null, null);
  }
};

OrderedIndex.prototype.range = function(start, end, callback) {
  this.bplustree.range(start, end, function(transformed, values) {
    values.forEach(function(value) {
      callback(value.k, value.p, value.l);
    });
  });
};

OrderedIndex.prototype.filter = function(filter_function, callback, null_on_not_found){
  var not_found = true;
  var self = this;
  this.bplustree.each(function(key, values) {
    values.forEach(function(value) {
      if (filter_function(value.r)) {
        not_found = false;
        callback(value.k, value.p, value.l);
      };
    })
  });
  if (null_on_not_found && not_found) {
    callback(null);
  }
};

OrderedIndex.prototype.count = function(filter_function, callback) {
  var count = 0;
  for (transformed in this.transformed_map) {
    if (this.transformed_map.hasOwnProperty(transformed)) {
      if (filter_function(transformed)) {
        count += this.transformed_map[transformed].length;
      }
    }
  }
  callback(null, count);
};