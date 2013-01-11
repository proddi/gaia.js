var Flickr = function(parent, node) {
    var that = this;
    console.log("~ Flickr.created()", parent, node);
    this._noRefresh = true;
    this.images = [];
    this.limit = parseInt(node.getAttribute("limit")) || 5;
    if (node.hasAttribute("tags")) {
        gaia.parseText(node.getAttribute("tags"))(parent, function(value) {
            that.tags = value;
            that.refresh();
        });
    } else {
        this.tags = "";
    }
    this.title = "";
    this.status = "";
    delete this._noRefresh;
    this.refresh();
};
Flickr.prototype.refresh = function() {
    if (this._noRefresh) return;
    var that = this
//      , url = 'http://search.twitter.com/search.json?q=' + encodeURIComponent(this.query) + '&rpp=' + this.limit + '&includ_e_entities=true&res_ult_type=mixed'
      ;
    this.images = [];
    this.status = "loading";
    this._xhr && this._xhr.abort();
    this._xhr = $.getJSON("http://api.flickr.com/services/feeds/photos_public.gne?jsoncallback=?", {
            tags: that.tags,
            tagmode: "any",
            format: "json"
        }, function(result) {
            console.log(result);
            that._xhr = undefined;
            that.images = result.items;
            that.title = result.title;
            that.status = "success";
        });
};

