/**
 * Feature/Mixin support
 * @name module:g/directive.g:feature
 * @see directive/g:feature
 */
gaia.directive("g:view", function(node, next) {
    if (node.hasAttribute("g:view")) {
        var name = node.getAttribute("g:name");
        node.removeAttribute("g:name");
        console.log("~ [g:view]", "as", name);
        next(function(n, next) {
            var scope = this
            var resource;
            var view = scope[name] = new(function View() {});
            view.load = function(url) {
                console.log("~ [g:view]", name, "load:", url);
                if (resource) {
                    resource.detatch();
                    resource();
                    resource = undefined;
                }
                view.url = url;
                view.busy = true;
                view.error = undefined;
                while (n.firstChild) n.removeChild(n.firstChild);
                gaia.__getComponent(url, function(err, binder) {
                    console.log(url, err, n);
                    if (err) {
//                        n.innerHTML = "Unable to load <code>" + url + "</code>";
                        view.error = err;
                    } else {
                        resource = binder(scope).appendTo(n);
                    }
                    view.busy = undefined;
                });
            };
            view.error = undefined;

            next(scope);
        });
    } else {
        next();
    }
}, "g:include"); // insert complex after include
