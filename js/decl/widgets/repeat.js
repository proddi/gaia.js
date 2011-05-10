/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: repeat
 */

decl.widget("repeat", function(node) {
    var attrib = node.getAttribute("repeat");
    var match = attrib.match(/^(\w*) in (.*)$/);
//    console.log("widget->repeat()", attrib, match);
	if (!match || match.length !==3) throw new Error("repeat needs 'x in y'");
	var data    = match[1],
	    dataSet = solve2(window, match[2]);

    dataSet = decl._prepareArray(dataSet);

    var parent = node.parentNode;
    parent.removeChild(node);
    node.removeAttribute("repeat");

    // extract definition
    // clone and apply definition
    for (var i=0, l=dataSet.length; i<l; i++) {
	    var clone = node.cloneNode(true);
	    window[data] = dataSet[i];
        decl.prepare(clone, 1);
        decl.prepare(clone, 0);
	    parent.appendChild(clone);
	}

    dataSet.$on("add", function(item) {
	    var clone = node.cloneNode(true);
	    window[data] = item;
        decl.prepare(clone, 1);
        decl.prepare(clone, 0);
	    parent.appendChild(clone);
    });

    dataSet.$on("remove", function(item, idx) {
        var node = parent.children[idx];
        parent.removeChild(node);
    });

}, 1);

		// expr can be scope[expr], {expr}
		function solve2(scope, expr) {
            return "$" === expr.charAt(0) ? eval(expr.substr(1)) : scope[expr];
		}
