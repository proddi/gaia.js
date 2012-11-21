/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 * @widget: template
 */

(function() {
    var templates = {};

    decl.addTemplate = function(id, template) {
        templates[id] = template;
    };

    decl.getTemplate = function(id) {
        return templates[id];
    };
})();

decl.widget("template", function(node) {
    var name = node.getAttribute("template");
    node.removeAttribute("template");
    console.log("Registering template", name);
    decl.addTemplate(name, node);
    node.parentNode && node.parentNode.removeChild(node);
}, decl.INIT);
