/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: text
 *   Just resolves data, not binding.
 */

decl.widget("text", function(node, scope) {
    var attrib = node.getAttribute("text");
    node.removeAttribute("text");
    node.innerText = decl.solve(scope, attrib);
}, decl.DATA);
