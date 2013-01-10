(function() {
    var $dom = $('<pre><code>Hello {{ title }}, i\'m coming from the web!</code></pre>')[0]
      , $linker = gaia.compile($dom)
      ;
    
    var Controller = function(parentScope, node) {
        this.title = node.getAttribute("title") || "Lazy Controller";
        node.removeAttribute("title");
        var that = this;

            console.log("constructor");
            var clone = $dom.cloneNode(true);
            $linker(clone, that);
            node.appendChild(clone);
//            node.parentNode.insertBefore(clone, node);
//            node.parentNode.removeChild(node);
    }

    Controller.prototype.foo = function() { console.log("proto"); };
    return Controller;
})();

