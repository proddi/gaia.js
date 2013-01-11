var gaia = {};

(function() {

    // Expression thingie - move to there?
    var filters = {};
    gaia.filters = {
        add: function(name, fun) {
            filters[name] = fun;
        }
      , get: function(name) {
          return filters[name];
      }
    };

    // Expression thingie - move to there?
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

    /**
     * Loads a resource from a url.
     *
     * @param {String} url The url of the resource.
     * @returns {String} Loaded content as string.
     *
     * @throws {String}
     */
    gaia.load = function(url) {
        var req = new XMLHttpRequest();
        req.open("GET", url, false); // Note synchronous get
        req.send(null);
        if (req.status && req.status != 200) {
            throw req.statusText;
        }
        return req.responseText;
    }

    // include expressions.js, core.js
    var scriptNodes = document.getElementsByTagName('script')
      , gaiaNode = scriptNodes[scriptNodes.length - 1]
      ;
    gaia.rootUrl = gaiaNode.src.substr(0, gaiaNode.src.length - 7);

    /**
     * Syncronously loads and executes a script specified by url.
     *
     * @param {String} url The resource url.
     */
    gaia.require = function(url, scope) {
        if (-1 === url.indexOf(":/")) url = gaia.rootUrl + url;
        eval.call(scope || window, gaia.load(url) + '\n//' + /*@cc_on ' '+ @*/ '@ sourceURL=' + url + '\n');
        console.log("~ gaia.require:", url);
    }

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

    gaia.require("decl/core.js");
    gaia.require("decl/expression.js");

})();
