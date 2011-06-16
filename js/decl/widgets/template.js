/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: template
 */

var templates = {};

decl.widget("template", function(node) {
    var name = node.getAttribute("template");
    templates[name] = node;
    node.parentNode && node.parentNode.removeChild(node);
}, decl.INIT);

decl.widget("use", function(node) {
});
