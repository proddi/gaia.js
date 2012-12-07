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

    // include expressions.js
    var scriptNodes = document.getElementsByTagName('script')
      , gaiaNode = scriptNodes[scriptNodes.length - 1];

    var script = document.createElement('script');
    script.src = gaiaNode.src.replace(/\/gaia.js/, "/decl/expression.js");
    script.type = "text/javascript";
    gaiaNode.parentNode.appendChild(script);

    console.warn("~ gaia.js added decl/expressions.js, but it's unstable. Fix needed!");

    gaia.parse = function(expr) {
        return new Expression(expr);
    }

	/**
	 * Creates a scope including prototype.
	 *
	 * @param {Object} proto
	 * @returns {Object} Scope with proto as prototype.
	 */
    gaia.scope = function(proto) {
        function Scope() {}
        Scope.prototype = proto;
        return new Scope();
    };

})();
