/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: repeat
 */

decl.widget("repeat", function(node) {
    var scope = window;
    var attrib = node.getAttribute("repeat");
    node.removeAttribute("repeat");
    var match = attrib.match(/^(\w*) in (.*)$/);
    // console.log("widget->repeat()", attrib, match);
    if (!match || match.length !== 3) {
        throw new Error("repeat needs 'x in y'");
    }
    var data = match[1], dataSet = solve2(window, match[2]);

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

}, 1);

// expr can be scope[expr], {expr}
function solve2(scope, expr) {
    if ("$" === expr.charAt(0)) {
        return eval(expr.substr(1));
    }
    var path = expr.split(".");
    if (1 === path.length) {
        return scope[expr];
    }
    for ( var i = 1, l = path.length, name; (name = path.shift()) && i < l; i++) {
        if (undefined === (scope = scope[name])) {
            return;
        }
    }
    return scope[name];
}

// solving for binds
function solveBind(scope, expr) {
    if ("$" === expr.charAt(0)) {
        return [undefined, expr, eval(expr.substr(1))]; // exec
    }
    var path = expr.split(".");
    if (1 === path.length) {
        return [undefined, expr, scope[expr]]; // atom
    }
    for ( var i = 1, l = path.length, name; (name = path.shift()) && i < l; i++) {
        if (undefined === (scope = scope[name])) {
            return;
        }
    }
    return [scope, name, scope[name]]; // object
}
