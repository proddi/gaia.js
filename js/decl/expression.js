/*
 *
 *
 */

var tests = [];

var passThrough = function(match) { return match; };
// strings
tests.push([/(".*?")/g, passThrough]);
tests.push([/('.*?')/g, passThrough]);

// key words
tests.push([/\b(?:abstract|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|final|finally|for|function|goto|if|implements|in|instanceof|interface|native|new|null|private|protected|prototype|public|return|static|super|switch|synchronized|throw|throws|this|transient|true|try|typeof|var|volatile|while|with)\b/g,
    passThrough
]);

// numbers
tests.push([/\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
    passThrough
]);

// members
tests.push([/(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
    function(match, s, report) {
        var x = match.split(".");
        if (1 === x.length) {
            // @TODO: report binding
            report.binding(match);
            return "$$scope." + match;
        }
        report.binding.apply(undefined, x);
        return "$$get.call($$scope,"+ x.splice(0, x.length - 1).map(function(e) { return '"' + e + '"'; })+")." + x;
    }
]);

var $$_get = function() {
    var scope = this
      , elements = Array.prototype.slice.call(arguments)
      , element
      ;
    while (element = elements.shift()) {
        scope = scope[element];
        if (undefined === scope) scope = {};
    }
    return scope;
}

var Expression = function(src) {
    var s = src
      , parsed
      , compiled = ""
      , match
      , bindings = {}
      , reporting = {
            binding: function() {
                var scope = bindings
                  , elements = Array.prototype.slice.call(arguments)
                  , element
                  ;
                while (element = elements.shift()) {
                    scope[element] = scope[element] || {};
                    scope = scope[element];
                }
            }
          , 
        }
      ;

    var ii = 99;
    while(s && ii) {
        match = { // @TODO: prepare to match complete line
            index: 1000000
          , parse: function(a) { return a; }
          , "0": ""
        };
        for (var i = 0, m, pattern; (pattern = tests[i++]);) {
            pattern[0].lastIndex = undefined;
            m = pattern[0].exec(s);
            if (m && m.index < match.index) {
                match = m;
                match.parse = pattern[1];
            }
        }
        parsed = match.parse(match[0], s, reporting);
        compiled += s.substr(0, match.index) + parsed;
        s = s.substr(match.index + match[0].length || 99999999);
        
        if (!ii--) throw "Parsing engine is looping like a rollercoster :(";
    }
    var f = function(scope, callback) {
        var $$scope = scope || window
          , $$get = $$_get
          , f = function() {
                try {
                    return eval(compiled);
                } catch(e) {
                    return e;
                }
            }
          ;
        if (!callback) return f();

        f.$unbind = watchTree($$scope, bindings, function() { callback(f()); });
        f.$bindings = bindings;
        callback(f());
        return f;
    };
    f.$set = function(scope, value) {
        var $$scope = scope || window
          , $$get = $$_get // @QUESTION: Should we use a non tolerant getter to prevent setting on undefined?
          , $$value = value;
        try {
            return eval(compiled + " = $$value");
        } catch(e) {
            return e;
        }
    }
    f.$source = src;
    f.$compiled = compiled;
    return f;
};

function countMembers(o) {
    var i = 0;
    for (var key in o) i++;
    return i;
}

function watchTree(scope, tree, callback) {
    var unbinds = [];
    for (var key in tree) unbinds.push((function(key) {
        var cb = countMembers(tree[key]) ? function() {
            unwatchTree && unwatchTree();
            if (scope[key]) {
                unwatchTree = watchTree(scope[key], tree[key], callback);
            }
            callback();
        } : callback;
        var unwatch = decl.watch(scope, key, cb)
          , unwatchTree;
        if (scope[key]) {
            unwatchTree = watchTree(scope[key], tree[key], callback);
        }
        return function() {
            unwatchTree && unwatchTree();
            unwatch();
        }
    })(key));
    return function() {
        for (var i=0, unbind; (unbind = unbinds[i++]);) unbind();
    }
}

Expression.prototype.filters = {
    upper: function(value) {
        if (Object.prototype.toString.call(value) === '[object Array]') {
            return value.map(function(v) { return Expression.prototype.filters.upper(v); });
        }
        if ("string" === typeof value) {
            return value.toUpperCase();
        }
        return value;
    },
    lower: function(value) {
        if (Object.prototype.toString.call(value) === '[object Array]') {
            return value.map(function(v) { return Expression.prototype.filters.lower(v); });
        }
        if ("string" === typeof value) {
            return value.toLowerCase();
        }
        return value;
    },
    arg: function(value, arg) {
//        console.log("~ [arg]", value, arguments);
        return value.replace(/\$/, arg);
    },
    json: function(data) {
        return JSON.stringify(data);
    },
    join: function(data, sep) {
        return data.join(sep);
    },
    count: function(data) {
        return data.length;
    },
    date: function(date, format) {
        var x = ["ap", "AP", "mm", "m", "hh", "h", "ss", "s", "yyyy", "yy", "zzz", "z", "dddd", "ddd", "dd", "d", "MMMM", "MMM", "MM", "M"]
          ;
        var s = {
            fullDate: "EEEE, MMMM d,y"
        }[format] || format || "ddd MMMM d yy - h:m:s ap";
        if (!(date instanceof Date)) date = new Date(date);
        return x.reduce(function(s, token) {return s.replace(token, date[token]());}, s);
    }
};

// Precondition: n.length <= len <= 7
var zeroPad = function(n, len) {return ('000000' + n).slice(-len);}

Date.prototype.d = function() { // the month as number without a leading zero (1-12)
    return this.getDay();
}
Date.prototype.dd = function() { // the month as number with a leading zero (01-12)
    return zeroPad(this.getDay(), 2);
}
Date.prototype.ddd = function() { // the abbreviated localized month name (e.g. 'Jan' to 'Dec')
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][this.getDay()];
}
Date.prototype.dddd = function() { // the long localized month name (e.g. 'January' to 'December')
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][this.getDay()];
}
Date.prototype.M = function() { // the month as number without a leading zero (1-12)
    return this.getMonth();
}
Date.prototype.MM = function() { // the month as number with a leading zero (01-12)
    return zeroPad(this.getMonth(), 2);
}
Date.prototype.MMM = function() { // the abbreviated localized month name (e.g. 'Jan' to 'Dec')
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][this.getMonth()];
}
Date.prototype.MMMM = function() { // the long localized month name (e.g. 'January' to 'December')
    return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][this.getMonth()];
}
Date.prototype.yy = function() { // the year as two digit number (00-99)
    return zeroPad(this.getFullYear() % 100, 2);
}
Date.prototype.yyyy = function() { // the year as four digit number
    return zeroPad(this.getFullYear(), 4);
}
Date.prototype.ap = function() {
    this._isAP = true;
    return this.getHours() < 12 ? "am" : "pm";
}
Date.prototype.AP = function() {
    return this.ap().toUpperCase();
}

Date.prototype.h = function() { // the hour without a leading zero (0 to 23 or 1 to 12 if AM/PM display)
    var h = this.getHours();
    if (this._isAP) {
        if (0 === h) h = 12;
        else if (h > 12) h -= 12;
    }
    return h;
}
Date.prototype.hh = function() { // the hour without a leading zero (0 to 23 or 1 to 12 if AM/PM display)
    return zeroPad(this.h(), 2);
}
Date.prototype.m = function() { // the minute without a leading zero (0 to 59)
    return this.getMinutes();
}
Date.prototype.mm = function() { // the minute with a leading zero (00 to 59)
    return zeroPad(this.getMinutes(), 2);
}
Date.prototype.s = function() { // the second without a leading zero (0 to 59)
    return zeroPad(this.getSeconds(), 2);
}
Date.prototype.ss = function() { // the second with a leading zero (00 to 59)
    return zeroPad(this.getSeconds(), 2);
}
Date.prototype.z = function() { // the milliseconds without leading zeroes (0 to 999)
    return this.getMilliseconds();
}
Date.prototype.zzz = function() { // the milliseconds with leading zeroes (000 to 999)
    return zeroPad(this.getMilliseconds(), 3);
}
