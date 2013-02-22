/**
 * Feature/Mixin support
 * @name module:g/directive.g:feature
 * @see directive/g:feature
 */
gaia.directive("g:feature", function(node, next) {
    if (node.hasAttribute("g:feature")) {
        var expr = gaia.parse(node.getAttribute("g:feature"));
        node.removeAttribute("g:feature");
        var name = node.getAttribute("name");
        node.removeAttribute("name");
        console.log("~ [feature]", expr.$source, "as", name);
        next(function(n, next) {
            var scope = this
                , feature = expr(this)
                ;
            console.log("~ including feature:", expr.$source);
            if (feature) {
                /*if (!feature.useParentScope) */scope = gaia.scope(scope);
                feature.call(scope, n);
                if (name) this[name] = scope;
            } else {
                console.warn("~ [feature]", expr.$source, "not available");
            }
            next(scope);
        });
    } else {
        next();
    }
}, "g:include"); // insert feature after include
