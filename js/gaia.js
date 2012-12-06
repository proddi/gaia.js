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

    console.warn("TODO: dynamic apply expression script");
    // include expressions.js
    var scriptNodes = document.getElementsByTagName('script')
      , gaiaNode = scriptNodes[scriptNodes.length - 1];

    console.log("~ gaia script node is", gaiaNode);
    var script = document.createElement('script');
    script.src = gaiaNode.src.replace(/\/gaia.js/, "/decl/expression.js");
    script.type = "text/javascript";
    gaiaNode.parentNode.appendChild(script);

    gaia.parse = function(expr) {
        return new Expression(expr);
    }
})();
