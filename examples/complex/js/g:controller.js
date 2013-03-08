/**
 * Feature/Mixin support
 * @name module:g/directive.g:feature
 * @see directive/g:feature
 */
gaia.directive("g:controller", function(node, next) {
    if (node.hasAttribute("g:controller")) {
        var expr = gaia.parse(node.getAttribute("g:controller"));
        node.removeAttribute("g:controller");
        var name = node.getAttribute("name");
        node.removeAttribute("name");
        console.log("~ [controller]", expr.$source, "as", name);
        next(function(n, next) {
            var scope = this;
            try {
                var controller = expr(scope);

                console.log("~ [g:controller]", "apply controller:", expr.$source);

                if ("string" === typeof controller) {
                    controller = eval.call({}, "var $$ZzzyyDfe = (function() { var $$werfwrwr = " + gaia.load(controller) + "; return $$werfwrwr;})(); $$ZzzyyDfe;");
                    console.log("~ [g:controller]", "loaded");
                }

                if (controller) {
                    /*if (!complex.useParentScope) */scope = gaia.scope(scope);
                    controller.call(scope, n);
                    if (name) this[name] = scope;
                } else {
                    console.warn("~ [g:controller]", expr.$source, "not available");
                }
            } catch (e) {
                console.error("! [g:controller]", e);
            }
            next(scope);
        });
    } else {
        next();
    }
}, "g:include"); // insert complex after include
