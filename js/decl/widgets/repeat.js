/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: repeat
 */

decl.widget("repeat", function(node) {
    var scope = window;
    var attrib = node.getAttribute("repeat");
    var template = node.getAttribute("use");
    node.removeAttribute("repeat");
    var match = attrib.match(/^(\w*) in (.*)$/);
    // console.log("widget->repeat()", attrib, match);
    if (!match || match.length !== 3) {
        throw new Error("repeat needs 'x in y'");
    }

    var data = match[1], dataSet = decl.solve(window, match[2]);

    dataSet = decl._prepareArray(dataSet);

    var parent = node.parentNode;
    parent.removeChild(node);

    // extract definition
    // clone and apply definition
    for ( var i = 0, l = dataSet.length; i < l; i++) {
        scope[data] = dataSet[i];
        var clone = node.cloneNode(true);
        decl.prepare(clone, scope, decl.DATA);
        parent.appendChild(clone);
    }

    dataSet.$on("add", function(item) {
        console.log('dataSet.$on("add", ...', item, data);
        scope[data] = item;
        var clone = node.cloneNode(true);
        decl.prepare(clone, scope, decl.DATA);
        parent.appendChild(clone);
    });

    dataSet.$on("remove", function(item, idx) {
        console.log('dataSet.$on("remove", ...', item, idx);
        var node = parent.children[idx];
        parent.removeChild(node);
    });

}, decl.STRUC);
