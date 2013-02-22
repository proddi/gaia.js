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
            var scope = this
                , feature = expr(this)
                ;
            console.log("~ including controller:", expr.$source);
            if (feature) {
                /*if (!complex.useParentScope) */scope = gaia.scope(scope);
                feature.call(scope, n);
                if (name) this[name] = scope;
            } else {
                console.warn("~ [controller]", expr.$source, "not available");
            }
            next(scope);
        });
    } else {
        next();
    }
}, "g:include"); // insert complex after include
