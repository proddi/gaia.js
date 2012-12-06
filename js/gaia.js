var gaia = {};

(function() {

    var filters = {};

    gaia.filters = {
        add: function(name, fun) {
            filters[name] = fun;
        }
      , get: function(name) {
          return filters[name];
      }
    };

    var functions = {};

    gaia.functions = {
        add: function(name, fun) {
            functions[name] = fun;
            console.log("~ registered " + name + " function");
        }
      , get: function(name) {
          return functions[name];
      }
    };

})();
