/** A unbinder function is leasing all bindings by calling.
 * @class GaiaFragment
 */
/** A unbinder function is leasing all bindings by calling.
 * @method GaiaFragment#clone
 * @example var fragment = gaia.compile("<div>foo</div>");
 * cloned = fragment.clone();
 */
/** A unbinder function is leasing all bindings by calling.
 * @method GaiaFragment#link
 * @param {Object} scope Scope The Fragment will linked aganst the specified scope.
 * @returns {Unbinder} The unbinder for that link
 * @example
 * gaia.compile("&lt;div&gt;foo&lt;/div&gt;").link(scope);
 */
/** A unbinder function is leasing all bindings by calling.
 * @method GaiaFragment#append
 * @example <div g:show="isLoading">Loading...</div>
 * compile(DOM|string).link(scope).append(parentNode)            // for fragments
 * compile(DOM|string).clone().link(scope).append(parentNode)    // for fragment clones
 */

/** A module. Its name is module:g.
 * @module g/directive
 */

(function() {

    var directives = {
        indicies: []
      , handlers: []
    };

    gaia.directive = function(id, directive, dependency) {
        var i;
        if (dependency) {
            if (!(i = directives.indicies.indexOf(dependency) + 1)) console.warn("~ directive", id, "requires", dependency," but isn't exist.");
        }
        i = i || directives.indicies.length;

        directives.indicies.splice(i, 0, id);
        directives.handlers.splice(i, 0, directive);
    }

    var __components = {
    };

    function __registerComponent(id, binder) {
        console.log("--> register component", id);
        __components[id] = [binder];
    }

    function __getComponent(id, callback) {
        var component;
        if ((component = __components[id]) && component[0]) {
            callback(component[1], component[0]);
        } else {
            if (component) {
                console.log("--> used cached component, just add handler", component);
                component[2].push(callback);
            } else {
                console.log("--> new component from url");
                __components[id] = component = [undefined, undefined, [callback]];
                gaia.load(id.replace(":", "_"), function(err, data) {
                    var comp = component;
                    data = gaia.compile(data);
                    comp[0] = function() {
                        return data.clone().apply(undefined, arguments);
                    }
                    // call all pending callbacks
                    comp[2].forEach(function(callback) {
                        console.log("foo");
                        callback(comp[1], comp[0]);
                    });
                    comp[2] = undefined;
                });
            }
/*



            console.log("--> request for component (not found)", id);
            var callbacks = [callback];
            __components[id] = function() {
                callbacks.push(callback);
            }
            gaia.load(id.replace(":", "_"), function(err, data) {
                if (!err) {
                    data = gaia.compile(data);
                    __components[id] = function(scope) {
                        console.log("--> used cahced component");
                        return data.clone()(scope);
                    }
                } else {
                    __components[id] = function() {
                        return Error("Foo");
                    }
                    __components[id].$error = err;
                }
                callbacks.forEach(function(callback) {
                    console.log("foo");
                    debugger;
                    callback(__components[id].$error, __components[id]);
                });
            });
            console.log(1);
*/
        }
    }

//    function __isComponent(id) {
//        return !!__components[id];
//    }

    /**
     * prevents SCRIPT traverse
     * @name module:g/directive.g:ignore
     */
    gaia.directive("g:ignore", function(node, next) {
        if ("SCRIPT" === node.nodeName
            || node.hasAttribute("g:ignore")) {
            return;
        }
        next();
    });

    /**
     * Expression specified in g:init will be exectuted on initialization time. No bindings will be applied.
     * @name module:g/directive.g:init
     * @example <div g:init="a=1">...</div>
     */
    gaia.directive("g:init", function(node, next) {
        var init = node.hasAttribute("g:init") && gaia.parse(node.getAttribute("g:init"));
        if (init) {
            next(function(n, next) {
                init.call(n, this);
                next(this);
            });
        } else {
            next();
        }
    });

    /**
     * g:repeat / repeat
     * @name module:g/directive.g:repeat
     * @see directive/g:repeat
     */
    gaia.directive("g:repeat", function(node, next) {
        if (node.hasAttribute("g:repeat") || node.hasAttribute("repeat")) {
            var match = (node.getAttribute("g:repeat") || node.getAttribute("repeat")).match(/^(\w*) in (.*)$/);
    //        console.log("~ [repeat]", match);

            if (!match || match.length !== 3) {
                throw new Error("g:repeat needs 'x in y'");
            }

            // replace node to have a reference node in linking process.
            node.parentNode.insertBefore(document.createElement('span'), node);
            node.parentNode.removeChild(node);
            node.removeAttribute("g:repeat");
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
                  ;
                parentNode.removeChild(n);

                collectionExpr(scope, function(collection) {
                    collection = gaia.array(collection);

                    // remove old instances
                    while ((unbinder = instances.shift())) {
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
                    }).$on("remove", function(item, idx) {
                        // TODO: for lazy remove (finishing transitions) unbind template and remove node in setTimeout
                        var node = parentNode.children[idx];
                        parentNode.removeChild(node);
                        // TODO: remove from instances ---> unbinder(); unbinder.detatch();
                    });
                });
                next(scope); // linking
            };
        } else {
            next(); // compiling
        }
    });

    /**
     * include
     * @name module:g/directive.g:include
     * @see directive/g:include
     */
    gaia.directive("g:include", function(node, next) {
        if (node.hasAttribute("g:include")) {
            var exprInclude = gaia.parseText(node.getAttribute("g:include"))
               ,values = {};
            for (var i = 0, attrib; (attrib = node.attributes[i]); i++) {
                console.log("~~ ", attrib.name, "=", attrib.value);
                values[attrib.name] = gaia.parse(attrib.value);
            }
            next(function(n, next) {
                var include;
                var scope = this;
                exprInclude(scope, function(value) {
                    if (!value) {
                        n.innerHTML = "";
                    } else {
                        if (include) {
                            include.detatch();
                            include();
                            include = undefined;
                        }
                        __getComponent(value, function(err, binder) {
                            include = binder(scope).appendTo(n);
                            console.log(n);
                        });
                    }
                });

                for (var key in values) {
                    values[key](scope, function(key, value) {
                        scope[key] = value;
                    }.bind(this, key));
                }

//                next(this); // linking
            });
        } else {
            next(); // compiling
        }
    });

    /**
     * loader
     * @name module:g/directive.g:loader
     * @see directive/g:loader
     */
    gaia.directive("g:loader", function(node, next) {
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
    gaia.directive("g:use", function(node, next) {
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
     * Scope support
     * @name module:g/directive.g:scope
     * @see directive/g:scope
     */
    gaia.directive("g:scope", function(node, next) {
        if (node.hasAttribute("g:scope") || node.hasAttribute("scope")) {
            var expr = gaia.parse(node.getAttribute("g:scope") || node.getAttribute("scope"));
            node.removeAttribute("g:scope");
            node.removeAttribute("scope");
            var name = node.getAttribute("name");
            node.removeAttribute("name");
            console.log("~ [scope] as " + name, expr.$source);
            next(function(n, next) {
                var scope = expr(this);
                if (!scope) console.warn('~ [scope] building failed because it\'s undefined (as result of "' + expr.$source + '")');
                if ("function" === typeof scope) {
                    console.log("Creating scope from function", scope);
                    scope = new scope(this, n);
                }
                if (name) this[name] = scope;
                next(scope);
            });
        } else {
            next();
        }
    });

    // model-attribute on <input> tags
    gaia.directive("input.model", function(node, next) {
        if (1 === node.nodeType && "INPUT" === node.nodeName && (node.hasAttribute("g:model") || node.hasAttribute("model"))) {
            var expr = new Expression(node.getAttribute("g:model") || node.getAttribute("model"));
            node.removeAttribute("g:model");
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
                    if (undefined === val) val = "";
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
     * @name module:g/directive.g:show
     * @example <div g:show="isLoading">Loading...</div>
     * @see http://stackoverflow.com/questions/272360/does-opacity0-have-exactly-the-same-effect-as-visibilityhidden
     * @see directive/g:show
     */
    gaia.directive("g:show", function(node, next) {
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
    gaia.directive("g:common-attributes", function(node, next) {
        var text = !node.children.length && node.innerText && gaia.parseText(node.innerText, false)
          , src = node.src && gaia.parseText(node.getAttribute("src"), false)
          , href = node.href && gaia.parseText(node.getAttribute("href"), false)
          , styles = node.getAttribute("styles") && gaia.parseText(node.getAttribute("styles"), false)
          , className = node.className && gaia.parseText(node.className, false)
          ;

        if (text || src|| href || styles || className) {
            src && node.removeAttribute("src"); // prevent error logs
            next(function(n, next) {
                text && text(this, function(value) {
                    n.innerHTML = value;
                });
                src && src(this, function(value) {
                    n.setAttribute("src", value);
                });
                href && href(this, function(value) {
                    n.href = value;
                });
                styles && styles(this, function(value) {
                    n.style.cssText = value;
                });
                className && className(this, function(value) {
                    n.className = value;
                });
                next(this);
            });
        } else {
            next();
        }
    });

    /**
     * Common attribute module to provide mouse/keyboard event support for following attributes: g:onclick
     * @event module:g/directive.g:onclick
     * @example <a g:onclick="alert('Clicked!!')"><img src="images/{{ image_id }}"></a>
     * @see directive/g:onclick
     */
    gaia.directive("g:onclick", function(node, next) {
        var click = node.hasAttribute("g:onclick") && gaia.parse(node.getAttribute("g:onclick"))
          ;

        if (click) {
            next(function(n, next) {
                var scope = this;
                if (click) {
                    n.addEventListener("click", function(ev) {
                        click(scope);
                    });
                }
                next(this);
            });
        } else {
            next();
        }
    });

    /**
     * WRONG: Expression specified in g:init will be exectuted on initialization time. No bindings will be applied.
     * @module
     * @example <div g:init="a=1">...</div>
     * @see directive/g:init
     */
    gaia.directive("g:href-routing", function(node, next) {
        var href = 1 === node.nodeType && "A" === node.nodeName && node.getAttribute("href")
           ,watch = href && (/\{\{.*\}\}/.test(href) || !/^\w+:\//g.test(href))
           ;

        if (watch) {
            next(function(n, next) {
                n.addEventListener("click", function(ev) {
                    var href = n.getAttribute("href");
                    if (href && !/^\w+:\//g.test(href)) {
                        ev.preventDefault();
                        gaia.routeProvider.push({}, href, href);
                    }
                }, false);
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
            if ((module = directives.handlers[i++])) {
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
        var n = node.querySelectorAll("[g-component]")
           ,n2 = node.querySelectorAll("[template]")
           ;
        for (var nodes = [], i = n.length >>> 0; i--;) nodes[i] = n[i];
        nodes.forEach(function(node) {
            var id = node.getAttribute("g-component");
            node.removeAttribute("g-component");
            node.parentNode.removeChild(node);
            var compiled = __compile(node);
            console.log("~ component:", id, node);
            __registerComponent(id, function(scope) {
                var cloneNode = node.cloneNode(true)
                console.log("--> component.creator:", id);
                /* var unbinder = */compiled.call(scope, cloneNode, function() {
                });
                var unbinder = function() {
                    console.warn("Unbinder isn't implemented :(");
                    return;
                };
                unbinder.appendTo = function(target) {
                    target.appendChild(cloneNode);
                    return unbinder;
                };
                unbinder.detatch = function() {
                    cloneNode.parentNode && cloneNode.parentNode.removeChild(cloneNode);
                    return unbinder;
                };
                return unbinder;
            });
        });
        // old templates
        for (var nodes = [], i = n2.length >>> 0; i--;) nodes[i] = n2[i];
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

//        console.time('compile');
        var templates = parseTemplates(node);
        var compiled = __compile(node);
//        console.timeEnd('compile');

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

    /**
     * Compiles a html snipped into a GaiaFragment.
     * @method module:gaia.compile
     * @param {DOMNode|String} data
     * @return {GaiaFragment}
     */
    gaia.compile = function(data) {
        if ("object" === typeof data) return compile(data);
        if ("string" === typeof data) {
            var wrap = document.createElement("div");
            wrap.innerHTML = data;
            return compile(wrap.childNodes[0]);
        }
        throw Error("Unknown data:", data);
    }

})();
