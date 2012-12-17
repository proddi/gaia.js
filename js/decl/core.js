

(function() {
    var modules = [];

    // prevents SCRIPT traverse
    modules.push(function(node, next) {
        if ("SCRIPT" === node.nodeName) {
            return;
        }
        next();
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
            var linker = templates[name](node);

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

    // proceed repeat
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
              , linker = compile(node)
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
                    console.log("~ collection eval:", collectionExpr.$source, "=", collection);

                    // remove old instances
                    while ((instance = instances.shift())) {
                        parentNode.removeChild(instance);
                    }

                    // create new instances
                    for (var i = 0, l = collection.length; i < l; i++) {
                        var clone = node.cloneNode(true);
                        var cloneScope = gaia.scope(scope);
                        iteratorExpr.$set(cloneScope, collection[i]);
                        linker(clone, cloneScope);
                        parentNode.appendChild(clone);
                        instances.push(clone);
                    }

                    collection.$on("add", function(item) {
                        var clone = node.cloneNode(true);
                        var cloneScope = gaia.scope(scope);
                        iteratorExpr.$set(cloneScope, item);
                        linker(clone, cloneScope);
                        parentNode.appendChild(clone);
                        instances.push(clone);
                    });

                    collection.$on("remove", function(item, idx) {
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

    // Scope feature
    modules.push(function(node, next) {
        if (node.hasAttribute("scope")) {
            var expr = new Expression(node.getAttribute("scope"));
            node.removeAttribute("scope");
            console.log("~ [scope]", expr.$source);
            next(function(n, next) {
                var scope = expr(this);
                if ("function" === typeof scope) {
                    scope = new scope(this);
                    console.log("Creating scope from function", scope);
                }
                console.log("~ scope.linking", scope);
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
                  ;
                expr(scope, function(val) {
                    if (ign) {
                        ign = false;
                        return;
                    }
                    n.value = val;
                });
                n.addEventListener("keyup", function(ev) {
                    ign = true;
                    expr.$set(scope, n.value || "");
                });
                next(scope);
            });
        }
        next();
    });

    /*
    // fill #test nodes
    modules.push(function(node, next) {
        next();
        if (1 === node.nodeType && "SPAN" === node.nodeName) {
            return function(node) {
                node.innerText = "*" + node.innerText + "*";
            };
        }
    });
    */
    // proceed {{ expressions }}
    modules.push(function(node, next) {
        function decode(str) {
             return str && unescape(str.replace(/\+/g, " "));
        }
        if (0 === node.children.length) {
            var rx = /{{(.*?)}}/g
              , text = node.innerText
              , isText = undefined !== text && rx.test(text)
              , textPieces = undefined !== text && text.split(rx).map(function(piece, i) { return i%2 ? new Expression(piece) : piece })
              , href = node.href && decode(node.href)
              , isHref = undefined !== href && rx.test(href)
              , style = node.style.cssText && decode(node.style.cssText)
              , proceedStyle = undefined !== style && rx.test(style)
              ;

            if (isText || isHref || proceedStyle) {
                return function(node, next) {
                    var scope = this;
                    if (isText) {
                        var text = textPieces.slice();
                        textPieces.forEach(function(piece, i) {
                            if (piece instanceof Function) piece(scope, function(value) {
    //                            console.log("~ update", value, i);
                                text[i] = value;
                                node.innerHTML = text.join("");
                            });
                        });
    //                    node.innerHTML = textPieces.map(function(piece) { return piece instanceof Function ? piece(scope) : piece }).join("");
    //                    node.innerHTML = text.replace(rx, function(all, match) {
    //                        return "<i>" + decl.solve(scope, match.trim()) + "</i>";
    //                    });
                    }
                    if (isHref) {
                        node.href = href.replace(rx, function(all, match) {
                            return decl.solve(scope, match.trim());
                        });
                    }
                    if (proceedStyle) {
                        node.style.cssText = style.replace(rx, function(all, match) {
                            return decl.solve(scope, match.trim());
                        });
                    }
                    next(scope);
                };
            }
        } else {
            next();
        }
    });

    // traverser -------------------------------------------------------------------------------------------------------
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
            var i = 0
              , link
              ;
            function f(scope) {
                if ((link = links[i++])) {
                    link[1].call(scope, node.children[link[0]], f);
                }
            }
            f(this);
            next(this);
        };
    };

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
        };
    }

    var templates = {};

    function parseTemplates(node) {
        var nodes = []
          , n = node.querySelectorAll("[template]");
        for (var i = n.length >>> 0; i--;) nodes[i] = n[i];
        nodes.forEach(function(node) {
            var name = node.getAttribute("template");
            node.removeAttribute("template");
            node.parentNode.removeChild(node);
            var linker = __compile(node);
            templates[name] = function(placeholder) {
                var clone = node.cloneNode(true);
                placeholder.parentNode.insertBefore(clone, placeholder);
                placeholder.parentNode.removeChild(placeholder);
                return linker;
            };
            console.log("~ found template:", name, node);
        });
    }

    function compile(node) {

        console.time('compile');

        var templates = parseTemplates(node);
        var linker = __compile(node);

        console.timeEnd('compile');

        // link function
        return function(node, scope) {
            scope = scope || window;
            linker.call(scope, node, function() {});
        };
    };

    gaia.compile = compile;

})();
