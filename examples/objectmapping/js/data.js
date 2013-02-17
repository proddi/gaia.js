var data = [];

data.push({
    type: "o1",
    texture: "http://futurepath.org/wp-content/uploads/2012/11/planet-earth-300x295.jpg",
    foo: "bar"
});

data.push({
    type: "o2",
    texture: "http://www.donnersteine.de/Met_Bilder/Shop_Ebay/Ebay%20Shop%202012/Tissint%20Martian%20Mass/Mars.jpg",
    bar: "foo"
});


var Obj = function(map, data) {
    console.log("--> Obj created for", data);
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var texture = new Image();
    texture.onload = function() {
        context.drawImage(texture, 0, 0);
    }
    texture.src = data.texture;



    map.add(canvas);
}


var Foo = function(parent, node) {
    this._node = node;
    console.log("-->", parent, node);
    var expr = gaia.parse(node.getAttribute("x:objects") || "{}");
    var collection = gaia.array(expr(this));

    // create new instances
    for (var i = 0, l = collection.length; i < l; i++) {
        var o = new Obj(this, collection[i]);
    }

    // dynamic
    collection.$on("add", function(item) {

    }).$on("remove", function(item, idx) {

    });
}

Foo.prototype = {
    add: function(node) {
        this._node.appendChild(node);
    }
  , remove: function(node) {
        this._node.removeChild(node);
    }
}