/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: text
 *   Just resolves data, not binding.
 */

decl.widget("text", function(node) {
    var attrib = node.getAttribute("text");
    node.removeAttribute("text");
    node.innerText = decl.solve(window, attrib);
}, decl.DATA);
