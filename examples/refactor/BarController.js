(function() {
    var $dom = $('<div style="border-left: 2px solid red; margin-left: 50px"><span>Hello {{ title }}, i\'m different!</span><div loader="./FooController.js" name="subfoo" title="SubFOO2" loading-indicator="loading"></div></div>')[0]
      , $linker = gaia.compile($dom)
      ;
    
    var Controller = function(parentScope, node) {
        this.title = node.getAttribute("title") || "Lazy Controller";
        node.removeAttribute("title");
        var that = this;
        console.log("BarController.constructor");
        var clone = $dom.cloneNode(true);
        $linker(clone, that);
        node.appendChild(clone);
//            node.parentNode.insertBefore(clone, node);
//            node.parentNode.removeChild(node);
    }

    Controller.prototype.foo = function() { console.log("proto"); };
    return Controller;
})();

