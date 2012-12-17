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
    console.log("~ Twitter.refresh()", this.limit);
    var that = this;
//    this._xhr && this._xhr.cancel();
    this._xhr = $.getJSON('http://search.twitter.com/search.json?q=' + this.query + '&rpp=' + this.limit + '&includ_e_entities=true&res_ult_type=mixed&callback=?', function(result) {
        console.log(that._xhr, that._xhr = undefined);
        that.tweets = result.results;
    });
};

