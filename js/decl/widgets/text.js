/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */

decl.widget("text", function(node) {
    var attrib = node.getAttribute("text");
	node.innerText = solve2(window, attrib);
	node.removeAttribute("text");
});
