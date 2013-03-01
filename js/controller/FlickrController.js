var FlickrController = function(node) {
    var scope = this
      , xhr
      , noRefresh = true
      ;

    console.log("~ FlickrController.created()", scope, node);

    scope.refresh = function() {
        if (noRefresh) return;
        console.log("~ FlickrController.reload:", scope.query);

        scope.loading = true;
        scope.error = false;

        xhr && xhr.abort();
        xhr = $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?", {
                tags: scope.query,
                tagmode: "any",
                format: "json"
            })
            .success(function(data) {
                scope.images = data.items;
                scope.title = data.title;
            })
            .error(function(err, err) {
                console.error("~ FlickrController.load:error", arguments);
                scope.images = [];
                scope.title = "error: " + err;
            })
            .always(function() {
                xhr = undefined;
                scope.loading = false;
            })
        ;
    }

    scope.images = [];
    scope.limit = parseInt(node.getAttribute("limit")) || 5;
    if (node.hasAttribute("query")) {
        gaia.parseText(node.getAttribute("query"))(scope, function(value) {
            scope.query = value;
            scope.refresh();
        });
    } else {
        scope.query = "";
    }
    scope.title = "";

    noRefresh = false;
    scope.refresh();
};
