var Twitter = function(parent, node) {
    var that = this;
    console.log("~ Twitter.created()", parent, node);
    this._noRefresh = true;
    this.tweets = [];
    this.limit = parseInt(node.getAttribute("limit")) || 5;
    if (node.hasAttribute("query")) {
        gaia.parseText(node.getAttribute("query"))(parent, function(value) {
            that.query = value;
            that.refresh();
        });
    } else {
        this.query = "";
    }
    delete this._noRefresh;
    this.refresh();
};
Twitter.prototype.refresh = function() {
    if (this._noRefresh) return;
    var that = this
      , url = 'http://search.twitter.com/search.json?q=' + encodeURIComponent(this.query) + '&rpp=' + this.limit + '&includ_e_entities=true&res_ult_type=mixed'
      ;
    this._xhr && this._xhr.abort();
    this._xhr = $.getJSON(url + '&callback=?', function(result) {
        that._xhr = undefined;
        if (that.error = result.error) {
            console.error(that.error);
            that.tweets = [];
        } else {
            console.log(result);
            that.tweets = result.results;
        }
        that.loading = false;
    });
    this.loading = true;
    that.error = false;
};

