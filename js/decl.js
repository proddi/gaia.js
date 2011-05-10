var decl = {};

function loadData() {
	return dbs;
};

(function() {

    var widgets = {};

    decl.widget = function(ns, widget, prio) {
        prio = prio || 0;
        console.log("register widget", "->", ns, prio);
        (widgets[prio] = widgets[prio] || {})[ns] = widget;
    };

    /**
     * Watch changes of an property, hot patches if needed
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
		}
		setter.watch(callback);
	};

    decl.prepare = function(rootNode, prio) {
        prio = prio || 0;
        var queryString = "";
        for (var ns in widgets[prio]) {
            queryString += (queryString ? ",[" : "[") + ns + "]";
        }
        var nodes = rootNode.querySelectorAll(queryString);
        for (var i = 0, node; (node = nodes[i]); i++) {
            for (ns in widgets[prio]) {
                if (node.hasAttribute(ns))
                    widgets[prio][ns](node);
            }
		}
    };

    decl._prepareArray = function(a) {
        if (a.add) return a;

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

    function prepareScope(scope) {
        window.s = scope;
        console.log(scope);
    }

    domLoaded(function() {
		// 1st stage
		var nodes = document.querySelectorAll("[decl]");
		for (var i = 0, node; (node = nodes[i]); i++) {
            decl.prepare(node, 1);
            decl.prepare(node, 0);
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
            var DOMLoadTimer = setInterval(function () {
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
