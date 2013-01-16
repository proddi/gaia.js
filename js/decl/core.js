(function() {
    var modules = [];

    // prevents SCRIPT traverse
    modules.push(function(node, next) {
        if ("SCRIPT" === node.nodeName) {
            return;
        }
        next();
    });

    /**
     * Expression specified in g:init will be exectuted on initialization time. No bindings will be applied.
     * @module
     * @example <div g:init="a=1">...</div>
     * @see directive/g:init
     */
    modules.push(function(node, next) {
        var init = node.hasAttribute("g:init") && gaia.parse(node.getAttribute("g:init"));
        if (init) {
            next(function(node, next) {
                init && init(this);
                next(this);
            });
        } else {
            next();
        }
    });

    /**
     * loader
     * @module
     * @see directive/g:loader
     */
    modules.push(function(node, next) {
        if (node.hasAttribute("loader")) {
            var expr = gaia.parseText(node.getAttribute("loader"))
              , propName = node.getAttribute("name")
              , indicator = node.getAttribute("loading-indicator")
              , indicatorNode
              ;
            node.removeAttribute("loader");
            node.removeAttribute("name");

            next(function(n, next) {
                var scope = this;
                var loaded;
                Lazy.get(expr(this), function(err, Controller) {
                    loaded = true;
                    if ("function" === typeof Controller) {
                        var cntl = new Controller(scope, n);
                        console.log("~ [loader] controller created", cntl);
                        if (propName) scope[propName] = cntl;
                    } else {
                        console.error("~ [loader] is not a function", Controller);
                    }
                    if (indicatorNode) n.removeChild(indicatorNode);
                    next(scope);
                });
                // add loading indicator if needed
                if (indicator && !loaded) {
                    var linker = templates[indicator](function(template, linker) {
                        indicatorNode = template;
                        n.appendChild(template);
                        linker.call(scope, template, function() {});
                    });
                }
            });
        } else {
            next();
        }
    });

    // use - template
    modules.push(function(node, next) {
        if (node.hasAttribute("use")) {
            var name = node.getAttribute("use")
              , member = node.getAttribute("name")
              , values = {}
              ;
            node.removeAttribute("use");
            node.removeAttribute("name");
            var linker = templates[name](node, true);

            for (var i = 0, attrib; (attrib = node.attributes[i]); i++) {
                console.log("~~ ", attrib.name, "=", attrib.value);
                values[attrib.name] = gaia.parse(attrib.value);
            }

            return function(n/*, next*/) {
                var scope = gaia.scope(this); // clone scope
                this[member] = scope;

                for (var key in values) {
                    values[key](scope, function(key, value) {
                        scope[key] = value;
                    }.bind(this, key));
                }

                linker.call(scope, n, function() {});
    //            next(); // linker
            };
        } else {
            next(); // compiler
        }
    });

    /**
     * repeat
     * @module
     * @see directive/g:repeat
     */
    modules.push(function(node, next) {
        if (node.hasAttribute("repeat")) {
            var match = node.getAttribute("repeat").match(/^(\w*) in (.*)$/);
    //        console.log("~ [repeat]", match);

            if (!match || match.length !== 3) {
                throw new Error("repeat needs 'x in y'");
            }

            // replace node to have a reference node in linking process.
            node.parentNode.insertBefore(document.createElement('span'), node);
            node.parentNode.removeChild(node);
            node.removeAttribute("repeat");

            var iteratorExpr = new Expression(match[1])
              , collectionExpr = new Expression(match[2])
              , compiled = compile(node)
              ;

            return function(n, next) {
                var scope = this;

                // extract and remove parentNode
                var parentNode = n.parentNode
                  , instances = []
                  , instance
                  ;
                parentNode.removeChild(n);

                collectionExpr(scope, function(collection) {
                    collection = decl._prepareArray(collection);
//                    console.log("~ collection eval:", collectionExpr.$source, "=", collection);

                    // remove old instances
                    while ((unbinder = instances.shift())) {
//                        parentNode.removeChild(instance);
                        unbinder();
                        unbinder.detatch();
                    }

                    // create new instances
                    for (var i = 0, l = collection.length; i < l; i++) {
                        var cloneScope = gaia.scope(scope);
                        iteratorExpr.$set(cloneScope, collection[i]);
                        var unbinder = compiled.clone()(cloneScope).appendTo(parentNode);
                        instances.push(unbinder);
                    }

                    collection.$on("add", function(item) {
                        var cloneScope = gaia.scope(scope);
                        iteratorExpr.$set(cloneScope, item);
                        var unbinder = compiled.clone()(cloneScope).appendTo(parentNode);
                        instances.push(unbinder);
                    });

                    collection.$on("remove", function(item, idx) {
                        // TODO: for lazy remove (finishing transitions) unbind template and remove node in setTimeout
                        var node = parentNode.children[idx];
                        parentNode.removeChild(node);
                        // TODO: remove from instances
                    });
                });
                next(scope); // linking
            };
        } else {
            next(); // compiling
        }
    });

    /**
     * Scope support
     * @module
     * @see directive/g:scope
     */
    modules.push(function(node, next) {
        if (node.hasAttribute("scope")) {
            var expr = new Expression(node.getAttribute("scope"));
            node.removeAttribute("scope");
            var prop = node.getAttribute("name");
            node.removeAttribute("name");
            console.log("~ [scope] as " + prop, expr.$source);
            next(function(n, next) {
                var scope = expr(this);
                if (!scope) console.warn('~ [scope] building failed because it\'s undefined (as result of "' + expr.$source + '")');
                if ("function" === typeof scope) {
                    scope = new scope(this, n);
                    console.log("Creating scope from function", scope);
                }
                if (prop) this[prop] = scope;
                next(scope);
            });
        } else {
            next();
        }
    });

    // model-attribute on <input> tags
    modules.push(function(node, next) {
        if (1 === node.nodeType && "INPUT" === node.nodeName && node.hasAttribute("model")) {
            var expr = new Expression(node.getAttribute("model"));
            node.removeAttribute("model");
            console.log("~ FIND INPUT", node, expr.$source);
            next(function(n, next) {
                var ign
                  , scope = this
                  , handle
                  ;
                expr(scope, function(val) {
                    if (ign) {
                        ign = false;
                        return;
                    }
                    n.value = val;
                });
                function update() {
                    ign = true;
                    expr.$set(scope, n.value || "");
                };
                n.addEventListener("keyup", function(ev) {
                    handle && clearTimeout(handle);
                    handle = setTimeout(update, 500); // magic number
                });
                next(scope);
            });
        }
        next();
    });

    /**
     * Show/hide module providing support for g:show and g:hide attributes.
     * @module
     * @example <div g:show="isLoading">Loading...</div>
     * @see http://stackoverflow.com/questions/272360/does-opacity0-have-exactly-the-same-effect-as-visibilityhidden
     * @see directive/g:show
     */
    modules.push(function(node, next) {
        var show = node.hasAttribute("g:show") && gaia.parse(node.getAttribute("g:show"));
        if (show) {
            next(function(node, next) {
                show && show(this, function(value) {
                    node.style.display = value ? "" : "none";
                });
                next(this);
            });
        } else {
            next();
        }
    });

    /**
     * Common attribute module to provide expression support for inline text and for following attributes: src, href,
     * styles, className
     * @module
     * @example <a href="{{ image_url }}"><img src="images/{{ image_id }}"></a>
     * @see directive/g:src
     * @see directive/g:href
     * @see directive/g:styles
     * @see directive/g:class
     */
    modules.push(function(node, next) {
        var text = !node.children.length && node.innerText && gaia.parseText(node.innerText, false)
          , src = node.src && gaia.parseText(node.getAttribute("src"), false)
          , href = node.href && gaia.parseText(node.getAttribute("href"), false)
          , styles = node.getAttribute("styles") && gaia.parseText(node.getAttribute("styles"), false)
          , className = node.className && gaia.parseText(node.className, false)
          ;

        if (text || src|| href || styles || className) {
            src && node.removeAttribute("src"); // prevent error logs
            next(function(node, next) {
                text && text(this, function(value) {
                    node.innerHTML = value;
                });
                src && src(this, function(value) {
                    node.setAttribute("src", value);
                });
                href && href(this, function(value) {
                    node.href = value;
                });
                styles && styles(this, function(value) {
                    node.style.cssText = value;
                });
                className && className(this, function(value) {
                    node.className = value;
                });
                next(this);
            });
        } else {
            next();
        }
    });

    // traverser -------------------------------------------------------------------------------------------------------
    /**
     * Traverser for compiling dom structure.
     *
     * @param {DOMNode} node
     * @returns {Function} Linker function
     */
    function traverser(node) {
        var nodes = []
          , l
          , links = []
          ;
        for (var i = node.children.length >>> 0; i--;) nodes[i] = node.children[i];
        for (i = 0; (node = nodes[i]); i++ ) {
            if ((l = __compile(node))) {
                links.push([i, l]);
            }
        }
        return links.length && function(node, next) {
            for (var i=0, link; (link = links[i++]);) {
                link[1].call(this, node.children[link[0]], function() {});
            }
            next(this);
        };
    }

    /**
     * Compiles a dom structure into a link function
     *
	 * @param {DOMNode} node A dom node
	 * @returns {Function} Linker function executed on given node.
     */
    function __compile(node) {
        var i = 0
          , module
          , fun
          , links = []
          ;

        function f() {
            if ((module = modules[i++])) {
                fun = module(node, function(fun) {
                    if (fun) links.push(fun);
                    f();
                });
                if (fun) links.push(fun);
            } else {
                fun = traverser(node);
                if (fun) links.push(fun);
            }
        }
        f();

        return links.length && function(node, next) {
            var i = 0
              , link
              ;
            function f(scope) {
                if ((link = links[i++])) {
                    link.call(scope, node, f);
                }
            }
            f(this);
            next(this);
        } || function() {};
    }

    var templates = {
    };

    /**
     * Parses templates.
     *
     * @param {DOMNode} node A dom node.
     */
    function parseTemplates(node) {
        var nodes = []
          , n = node.querySelectorAll("[template]");
        for (var i = n.length >>> 0; i--;) nodes[i] = n[i];
        nodes.forEach(function(node) {
            var name = node.getAttribute("template");
            node.removeAttribute("template");
            node.parentNode.removeChild(node);
            var linker = __compile(node);
            templates[name] = function(cloner) {
                cloner(node.cloneNode(true), linker);
//                if (replaceNode) {
//                    placeholder.appendChild(clone);
//                } else {
//                    placeholder.parentNode.insertBefore(clone, placeholder);
//                    placeholder.parentNode.removeChild(placeholder);
//                }
//                return linker;
            };
            console.log("~ found template:", name, node);
        });
    }

    /**
     * Public compile function for compiling a dom structure into a linking function.
     *
     * @param {DOMNode|String} node A dom node
     * @returns {Function} A linking function.
     * @returns {Function.clone} Clones the compiled DOM fragment and returns a linking function.
     *
     * common workflows:
     * compile(DOM)(scope)                                      // for existing nodes
     * compile(DOM|string)(scope).append(parentNode)            // for fragments
     * compile(DOM|string).clone()(scope).append(parentNode)    // for fragment clones
     */
    function compile(node) {

        console.time('compile');
        var templates = parseTemplates(node);
        var compiled = __compile(node);
        console.timeEnd('compile');

        // link function
        var f = function(scope) {
//            console.time('linking');
            scope = scope || window;
            var node = this;
            /* var unbinder = */compiled.call(scope, node, function() {});
            var unbinder = function() {
                console.warn("Unbinder isn't implemented :(");
                return;
            };
            unbinder.appendTo = function(target) {
                target.appendChild(node);
                return unbinder;
            };
            unbinder.detatch = function() {
                node.parentNode && node.parentNode.removeChild(node);
                return unbinder;
            };
            unbinder.node = node;
//            console.timeEnd('linking');
            return unbinder;
        };

        var f2 = f.bind(node);
        f2.clone = function() {
            return f.bind(node.cloneNode(true));
        };

        return f2;
    }

    gaia.compile = function(data) {
        if ("object" === typeof data) return compile(data);
        if ("string" === typeof data) {
            var wrap = document.createElement("div");
            wrap.innerHTML = data;
            return compile(wrap);
        }
        throw Error("Unknown data:", data);
    }

})();
