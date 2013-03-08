/** A unbinder function is leasing all bindings by calling.
 * @method Unbinder
 */

/** A module. Its name is module:gaia.
 * @module gaia
 */
var gaia = {
    version: "0.1-prealpha"
};

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
    /**
     * An event. Its name is module:foo/bar.event:MyEvent.
     * @event module:gaia.event:MyEvent
     */
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
     * @method module:gaia.load
     * @param {String} url The url of the resource.
     * @param {Function} callback The callback(err, data). If no callback specified, the function behaves synchronous.
     * @returns {String} Loaded content as string.
     *
     * @throws {String}
     * @requires {jQuery}
     */
    gaia.load = function(url, callback) {
        if (callback) {
            return (__xhrs[url] = __xhrs[url] || $.get(url + "?random=" + Math.random()))
            .done(callback.bind(undefined, undefined))
            .fail(callback.bind(undefined, true))
            ;
        }
        var req = new XMLHttpRequest();
        req.open("GET", url, false); // Note synchronous get
        req.send(null);
        if (req.status && req.status != 200) {
            throw req.statusText;
        }
        return req.responseText;
    }
    var __xhrs = {}; // cache for load

    // include expressions.js, core.js
    var scriptNodes = document.getElementsByTagName('script')
      , gaiaNode = scriptNodes[scriptNodes.length - 1]
      ;
    gaia.rootUrl = gaiaNode.src.substr(0, gaiaNode.src.length - 7);

    /**
     * Syncronously loads and executes a script specified by url.
     * @method module:gaia.require
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

    /**
     * Compiles a free string into an expression e.g. "The lazy {{ animal }} jumps over the {{ color }} dog".
     *
     * @param {String} The expression to be parsed
     * @returns {Function} The linking function for that expression.
     */
    gaia.parseText = function(text, notFoundValue) {
        var rx = /{{(.*?)}}/g
          , pieces = text.split(rx).map(function(piece, i) { return i%2 ? new Expression(piece) : piece })
          ;
        text = pieces.slice();

//console.log("--->", text, pieces.join(""), text.length < 2, arguments.length > 1, notFoundValue);
        return text.length > 1 && function(data, update) {
            pieces.forEach(function(piece, i) {
                if (piece instanceof Function) piece(data, function(value) {
                    text[i] = value;
                    update && update(text.join(""));
                });
                return text.join(""); // ?????
            });
            return text.join("");
        } || arguments.length < 2 && function(scope, update) { update && update(text.join("")); return text.join(""); } || notFoundValue;
    };

	/**
	 * Creates a scope including prototype.
	 *
     * @method module:gaia.scope
	 * @param {Object} proto
	 * @returns {Object} Scope with proto as prototype.
	 */
    gaia.scope = function(proto) {
        function Scope() {}
        Scope.prototype = proto;
        return new Scope();
    };

    /**
     * Watch changes of an property. It patches the object if its needed.
     * @method module:gaia.watch
     * @param {Object} o
     * @param {String} prop
     * @param {Function} callback
     * @returns {Unbinder} callback
     */
    gaia.watch = function(o, prop, callback) {
		var getter = o.__lookupGetter__(prop)
		  , setter = o.__lookupSetter__(prop)
		  ;
		if (!setter || !getter) {
			var callbacks = [];
			var value = o[prop];
			setter = function(val) {
				if (value !== val) {
					value = val;
					for (var i=0, l=callbacks.length; i<l; i++)
						callbacks[i](val);
				}
			};
			setter.watch = function(callback) {
				callbacks.push(callback);
				return function() {
			        var i = callbacks.indexOf(callback);
			        if (i>=0) callbacks.splice(i, 1);
			    }
			};
			getter = function() {
				return value;
			};
			o.__defineGetter__(prop, getter);
			o.__defineSetter__(prop, setter);
// cleanup, loose bindings on object remove
//            (o.__looseBinds = o.__looseBinds || []).push(function() {
//                callbacks.splice(0, callbacks.length);
//            });
		}
		return setter.watch(callback);
	};

	/**
	 * Prepare array with some listeners.
	 *
     * @method module:gaia.array
	 * @param {Array} a The array needs to be prepared.
     * @returns {Array} The prepared array ready to be watched.
	 */
    gaia.array = function(a) {
        if (a.$add) return a;

        var callbacks = {};
        a.$add = function(item) {
            this.push(item);
            for (var i=0, l=callbacks.add.length; i<l; i++) {
                callbacks.add[i](item);
            }
        };
        a.$remove = function(item) {
            var idx = this.indexOf(item);
            if (idx<0) return;
            if (item.__looseBinds) {
                for (var i = 0, l = item.__looseBinds.length; i<l; i++) item.__looseBinds[i]();
            }
            for (var i=0, l=callbacks.remove.length; i<l; i++) {
                callbacks.remove[i](item, idx);
            }
            this.splice(idx, 1);
        };
        a.$update = function(item) {
        };
        a.$on = function(event, callback) {
            (callbacks[event] = callbacks[event] || []).push(callback);
            return this;
        };
        return a;
    };

    function domLoaded(callback) {
        /* Mozilla, Chrome, Opera */
        if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', callback, false);
        } else
        /* Safari, iCab, Konqueror */
        if (/KHTML|WebKit|iCab/i.test(navigator.userAgent)) {
            var DOMLoadTimer = setInterval(function() {
                if (/loaded|complete/i.test(document.readyState)) {
                    callback();
                    clearInterval(DOMLoadTimer);
                }
            }, 10);
        } else
        /* Other web browsers */
        window.onload = callback;
    };

    gaia.require("gaia/core.js");
    gaia.require("gaia/expression.js");

    domLoaded(function() {
		var nodes = document.querySelectorAll("[gaia]");
		for (var i = 0, node; (node = nodes[i]); i++) {
            console.log("~ compile", node);
            gaia.compile(node)(gaia.$scope = new EventEmitter());
		}
    });

    var EventEmitter = function() {
        this._events = {};
    }
    EventEmitter.prototype = {
        $on: function(event, handler) {
            this._events[event] = this._events[event] || [];
            this._events[event].push(handler);
        }
      , $emit: function(event, data) {
            var events = this._events[event] || [];
            events.forEach(function(handler) {
                handler(data);
            });
        }
    }
})();
