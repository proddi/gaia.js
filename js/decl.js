var decl = {};

function loadData() {
	return dbs;
};

(function() {

    decl.INIT  = 1;
    decl.STRUC = 2;
    decl.DATA  = 3;

    var widgets = {};

    /**
     * Register a widget.
     * 
     * @param {String} ns Namespace/Attribute name
     * @param {Object} widget
     * @param {Number} prio Level of processing
     */
    decl.widget = function(ns, widget, prio) {
        prio = prio || 0;
        widget.ns = ns;
        console.log("register widget", "->", ns, prio);
        (widgets[prio] = widgets[prio] || {})[ns] = widget;
    };

    decl.widgets = function(prio) {
        var res = [];
        if (prio instanceof Array) {
            var p;
            while ((p = prio.shift())) {
                for (var key in widgets[p] || {}) res.push(widgets[p][key]);
            }
        } else {
            for (var key in widgets[prio] || {}) res.push(widgets[prio][key]);
        }
        return res;
    };

    /**
     * Watch changes of an property. It patches the object if its needed.
     * 
     * @param {Object} o
     * @param {String} prop
     * @param {Function} callback
     */
    decl.watch = function(o, prop, callback) {
		var getter = o.__lookupGetter__(prop),
			setter = o.__lookupSetter__(prop);
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
			};
			setter.unwatch = function() {
				throw new Error("Not implemented");
			};
			getter = function() {
				return value;
			};
			o.__defineGetter__(prop, getter);
			o.__defineSetter__(prop, setter);
			// cleanup, loose bindings on object remove
			(o.__looseBinds = o.__looseBinds || []).push(function() {
                callbacks.splice(0, callbacks.length);
			});
		}
		setter.watch(callback);
	};

	/**
	 * Prepare a dom fragment with widget functions
	 * 
	 * @param {DOMNode} fragment The fragment that needs to be prepared.
	 * @param {Object} scope
	 * @param {Boolean} init Run INIT widgets
	 */
	decl.prepare = function(fragment, scope, init) {
	    var hasParent = !!fragment.parentNode;
	    var parent;
	    if (hasParent) {
	        parent = fragment.parentNode;
	    } else {
	        parent = document.createElement("div");
	        parent.appendChild(fragment);
	    }

        var widgets
          , widget
          , node
          , i
          , queryString
          ;
        // proceed init (decl.INIT)
        if ((widgets = decl.widgets(decl.INIT))) {
            queryString = widgets.map(function(w) { return "[" + w.ns + "]"; }).join(",");
            var nodes = parent.querySelectorAll(queryString);
            for (i = 0, node; node = nodes[i]; i++) {
                for (var j = 0, widget; (widget = widgets[j]); j++) {
                    if (node.hasAttribute(widget.ns)) {
                        widget(node, scope);
                    }
                }
            }
        }

        // proceed structure (decl.STRUC)
        var left = 100;
        if ((widgets = decl.widgets(decl.STRUC))) {
            queryString = widgets.map(function(w) { return "[" + w.ns + "]"; }).join(",");
            while ((node = parent.querySelector(queryString))) {
                for (i = 0; (widget = widgets[i]); i++) {
                    if (node.hasAttribute(widget.ns)) {
                        widget(node, scope);
                    }
                }
                left--;
                if (!left) break;
            }
        }

        // proceed data (decl.DATA)
        if ((widgets = decl.widgets(decl.DATA))) {
            queryString = widgets.map(function(w) { return "[" + w.ns + "]"; }).join(",");
            var nodes = parent.querySelectorAll(queryString);
            for (i = 0, node; node = nodes[i]; i++) {
                for (var j = 0, widget; (widget = widgets[j]); j++) {
                    if (node.hasAttribute(widget.ns)) {
                        widget(node, scope);
                    }
                }
            }
        }

	    if (!hasParent) {
	        parent.removeChild(fragment);
	    }
	};

	/**
	 * Solves an expression. Can be a single atom, a object or an expression to evaluate.
	 * Its not binding!
	 * 
	 * @param {Object} scope
	 * @param {String} expr
	 * @returns {String} Resolved expression.
	 */
	decl.solve = function(scope, expr) {
	    if ("$" === expr.charAt(0)) {
	        return eval(expr.substr(1));
	    }
	    var path = expr.split(".");
	    if (1 === path.length) {
	        return scope[expr];
	    }
	    for ( var i = 1, l = path.length, name; (name = path.shift()) && i < l; i++) {
	        if (undefined === (scope = scope[name])) {
	            return;
	        }
	    }
	    return scope[name];
	};

	/**
	 * Solves expression for binds. It returns object and property for watching.
	 * 
	 * @param {Object} scope
	 * @param {String} expr
	 * @returns {Array} [scope, prop, value]
	 */
	decl.solveBind = function(scope, expr) {
	    if ("$" === expr.charAt(0)) {
	        return [undefined, expr, eval(expr.substr(1))]; // exec
	    }
	    var path = expr.split(".");
	    if (1 === path.length) {
	        return [undefined, expr, scope[expr]]; // atom
	    }
	    for ( var i = 1, l = path.length, name; (name = path.shift()) && i < l; i++) {
	        if (undefined === (scope = scope[name])) {
	            return;
	        }
	    }
	    return [scope, name, scope[name]]; // object
	};

	/**
	 * Creates a scope including prototype.
	 *
	 * @param {Object} proto
	 * @returns {Object} Scope with proto as prototype.
	 */
    decl.scope = function(proto) {
        function Scope() {}
        Scope.prototype = proto;
        return new Scope();
    };

	/**
	 * Prepare array with some listeners.
	 * 
	 * @param {Array} a The array needs to be prepared.
	 */
    decl._prepareArray = function(a) {
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
        };
        return a;
    };

    domLoaded(function() {
		// 1st stage
//        var scope = {};
		var nodes = document.querySelectorAll("[decl]");
		for (var i = 0, node; (node = nodes[i]); i++) {
//            decl.compile.call(scope, node);
            decl.prepare(document.body, decl.scope(window), true)
		}
    });

    function domLoaded(callback) {
        /* Internet Explorer */
        /*@cc_on
        @if (@_win32 || @_win64)
            document.write('<script id="ieScriptLoad" defer src="//:"><\/script>');
            document.getElementById('ieScriptLoad').onreadystatechange = function() {
                if (this.readyState == 'complete') {
                    callback();
                }
            };
        @end @*/
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

})();
