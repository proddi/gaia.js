var TwitterController = function(node) {
    var scope = this
      , xhr
      , noRefresh = true
      ;
    console.log("~ Controller.Twitter.created()", scope, node);

    scope.refresh = function() {
        if (noRefresh) return;
        var url = 'http://search.twitter.com/search.json?q=' + encodeURIComponent(this.query) + '&rpp=' + this.limit + '&includ_e_entities=true&res_ult_type=mixed'
            ;

        scope.loading = true;
        scope.error = false;

        xhr && xhr.abort();
        xhr = $.getJSON(url + '&callback=?')
            .success(function(data) {
                scope.tweets = data.results;
            })
            .error(function(err, err) {
                console.error("~ TwitterController.load:error", arguments);
                scope.error = err
                scope.tweets = [];
            })
            .always(function() {
                xhr = undefined;
                scope.loading = false;
            })
            ;
    }

    scope.tweets = [];
    scope.limit = parseInt(node.getAttribute("limit")) || 5;
    if (node.hasAttribute("query")) {
        gaia.parseText(node.getAttribute("query"))(scope, function(value) {
            scope.query = value;
            scope.refresh();
        });
    } else {
        scope.query = "";
    }

    noRefresh = false;
    scope.refresh();
};
