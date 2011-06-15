/* 
 * @widget: bind
 *   Resolves data and binds to objects.
 */

decl.widget("bind", function(node, scope) {
    var attrib = node.getAttribute("bind");
    node.removeAttribute("bind");

    var bind = solveBind(scope, attrib);
    // bind only if its an object. no binding on single atoms or expressions (yet)
    if (bind[0]) {
        decl.watch(bind[0], bind[1], function(value) {
            node.innerText = value;
        });
    }

    node.innerText = bind[2];
}, decl.DATA);
