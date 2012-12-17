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
    console.warn("~ gaia.js added decl/expressions.js, but it's unstable. Need to improve it!");

    var script = document.createElement('script');
    script.src = gaiaNode.src.replace(/\/gaia.js/, "/decl/core.js");
    script.type = "text/javascript";
    gaiaNode.parentNode.appendChild(script);
    console.warn("~ gaia.js added decl/core.js, but it's unstable. Need to improve it!");

    gaia.parse = function(expr) {
        return new Expression(expr);
    };

    gaia.parseText = function(text) {
        var rx = /{{(.*?)}}/g
          , pieces = text.split(rx).map(function(piece, i) { return i%2 ? new Expression(piece) : piece })
          ;
        text = pieces.slice();

        return function(data, update) {
            pieces.forEach(function(piece, i) {
                if (piece instanceof Function) piece(data, function(value) {
                    text[i] = value;
                    update && update(text.join(""));
                });
                return text.join("");
            });
            return text.join("");
        }
    };

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

    gaia.compile = function() {
    };

})();
