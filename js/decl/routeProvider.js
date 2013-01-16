/**
 *
 *
 *
 */
 
(function() {

    var RouteProvider = function() {
        window.onpopstate = this.stateChange.bind(this);
        var baseNode = document.querySelector("base");
        this.baseUrl = baseNode && baseNode.getAttribute("href") || "/";
        this.path = this.baseUrl;
    };

    RouteProvider.prototype.stateChange = function(ev) {
        console.log("~ RouteProvider.stateChange", ev);
        this.path = ev.state && ev.state.$url || '/';
    };

    RouteProvider.prototype.push = function(params, title, url) {
        params = params || {};
        params.$title = title;
        params.$url = url;
        console.log("~ RouteProvider.push", params, title, url);
        history.pushState(params || {}, params.$title, params.$url);
        this.path = "/" + url;
    };

//    RouteProvider.prototype.pop = function() {
//        history.back();
//    };

    gaia.routeProvider = new RouteProvider();

})();
