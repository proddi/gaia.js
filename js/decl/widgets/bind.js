/* 
 * @widget: bind
 *   Resolves data and binds to objects.
 */

decl.widget("bind", function(node, scope) {
    var attrib = node.getAttribute("bind");
    node.removeAttribute("bind");

    var bind = decl.solveBind(scope, attrib);
    if (!bind) {
        console.warn("~ [bind]: ignoring undefined bind target:", attrib, "on scope", scope, node.innerHTML);
        return;
    }
    // bind only if its an object. no binding on single atoms or expressions (yet)
    if (!bind[0]) {
        console.warn("~ [bind]: ignoring bind to primitive value:", attrib, ". Object needed!", node.innerHTML);
        return;
    }

    decl.watch(bind[0], bind[1], function(value) {
        node.innerText = value;
    });
    node.innerText = bind[2];

}, decl.DATA);
