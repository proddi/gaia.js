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

Expression.prototype.filters.twitterfy = function(s) {
    return s
        .replace(/((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi,'<a href="$1" target="_blank">$1<\/a>')
        .replace(/@([a-zA-Z0-9_]+)/gi,'<a href="http://twitter.com/$1" target="_blank">@$1<\/a>')
        .replace(/#([a-zA-Z0-9_]+)/gi,'<a href="http://search.twitter.com/search?q=%23$1" target="_blank">#$1<\/a>');
};
