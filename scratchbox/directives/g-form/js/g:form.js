gaia.directive("g:form", function(node, next) {
    if (node.hasAttribute("g:form")) {
        console.log("~ [g:form]", node);
        var name = node.name;
        var submitExpr = gaia.parse(node.getAttribute("g:form-submit") || "");

        next(function(n, next) {
            var scope = this;

            if (name) {
                scope[name] = scope;
            }

            n.onsubmit = function() {
                submitExpr.call(scope, scope);

                return false;
            };
            next(scope);
        });
    } else {
        next();
    }
}, "g:include");