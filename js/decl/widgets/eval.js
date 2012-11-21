/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: eval
 *   Evaluate an expression. Scope will be the node context.
 */

decl.widget("eval", function(node) {
    var expr = node.getAttribute("eval");
    node.removeAttribute("eval");
    console.log("~ [eval]", "(function() { return " + expr + "; }).call(node);");
//    eval("(function() { return " + expr + "; }).call(node);");
}, decl.DATA);
