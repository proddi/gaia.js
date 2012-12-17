var ExecutedExpression = function(expression) {
    this.expression = expression;
}

var Expression = function(s) {
    this.s = s;

    var fun = this.parseExpression(true)
     || this.parseEOL()
      ;

    if (this.s) {
        var syntax = this.s;
        fun = function() {
            return new SyntaxError("Unexpected token " + '"' + syntax + '" in "' + s + '"');
        };
    }

    var expr = this;
    var f = function(data, update) {
        var f = function() {
            var oldData = gaia.$$data;
            gaia.$$data = data;
            var value = fun.apply(this, arguments);
            gaia.$$data = oldData;
            return value;
        }
        if (!update) return f.call({}, data);
        var scope = new ExecutedExpression(expr);
        gaia.$$update = function() {
            update(f.call({}, data));
        }
        scope.exec = function() {
            return f.call({}, data);
        };
        update(f.call(scope, data));
        delete gaia.$$update;
        return scope;
    };
    f.$set = function(data, value) {
        return fun.$set.call(undefined, data, value);
    };
    f.$source = s;
    return f;
};

Expression.prototype.isChar = function(c) {
    if (c === this.s.charAt(0)) {
        this.s = this.s.substr(1);
        return true;
    }
}

Expression.prototype.parseExpression = function(trimming) {
    if (trimming) {
        this.s = this.s.trim();
    }

    var fun = (
            this.parseIdentifier()
         || this.parseNumber()
         || this.parseString()
         || this.parseArray()
//         || this.parseFilter()
        );

    var filter = this.parseFilter();
    return filter && function(data) {
        return filter.call(this, fun.call(this, data));
    } || fun;
}

Expression.prototype.parseDotOperator = function() {
    if (this.isChar(".")) {
        return this.parseExpression();
    }
};

Expression.prototype.parseNumber = function() {
    var match = /^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var value = parseFloat(match[0]);
//        console.log("~ parseNumber:", value, this.s);
        return function() {
            return value;
        }
    }
};

Expression.prototype.parseString = function() {
    var match = /^"(.*?)"/.exec(this.s); // needs to be improved
    if (match) {
        this.s = this.s.substr(match[0].length);
        var value = match[1];
        return function() {
            return value;
        }
    }
    var match = /^'(.*?)'/.exec(this.s); // needs to be improved
    if (match) {
        this.s = this.s.substr(match[0].length);
        var value = match[1];
        return function() {
            return value;
        }
    }
};

Expression.prototype.parseArray = function() {
    if (this.isChar("[")) {
        var elements = [];
        do {
            elements.push(this.parseExpression(true) || function() {});
        } while (this.isChar(","));
        if (!this.isChar("]")) throw new SyntaxError("array isn't closed: " + this.s);
        return function() {
            return elements.map(function(el) {return el.call(gaia.$$data, gaia.$$data);});
        }
    }
};

/**
 * Parses an identifier.
 */
Expression.prototype.parseIdentifier = function() {
    var match = /^([A-Z-a-z_][\w]*)/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var identifier = match[1];
        var x = this.parseMember()
          , value;
        var f = function(data) {
            var updateFun = gaia.$$update;
            if (updateFun) {
                data = decl._prepareArray(data);
                decl.watch(data, identifier, function() {
                    if (x) console.log("~ member changed, rebind needed");
                    updateFun();
                });
//                console.log("~ register update listener:", data + "." + identifier);
            }
            if (!data) return;
            value = data[identifier];
            return x ? x.call(this, value) : value;
        }
        f.$set = function(data, value) {
            if (!data) {
                console.warn("~ Expression.$set - ignoring setting", identifier, "on", data);
                return;
            }
            return x ? x.$set && x.$set.call(this, data[identifier], value) : (data[identifier] = value);
        };
        return f;
    }
};

Expression.prototype.parseMember = function() {
    return (
        this.isChar(".") && (
            this.parseIdentifier()
        )
     || this.parseFunction()
     || this.parseMemberArray()
    );
};

Expression.prototype.parseFunction = function() {
    if (this.isChar("(")) {
        var params = [];
        if (!this.isChar(")")) {
            do {
                params.push(this.parseExpression(true) || function() {});
            } while (this.isChar(","));
            if (!this.isChar(")")) throw new SyntaxError("function parameters not closed: " + this.s);
        }
        var x = this.parseMember()
          , value;
        return function(data) {
            value = data.apply(data, params.map(function(param, i) {return param.call(gaia.$$data, gaia.$$data);}));
            return x ? x.call(this, value) : value;
        }
    }
};

Expression.prototype.parseMemberArray = function() {
    if (this.isChar("[")) {
        var keyFun = this.parseExpression();
        if (!this.isChar("]")) throw new SyntaxError("array isn't closed: " + this.s);
        var x = this.parseMember()
          , value;
        return function(data) {
            value = data[keyFun.call(this, this.data)];
            return x ? x.call(this, value) : value;
        }
    }
};

Expression.prototype.parseFilter = function() {
    var match = /^ *\| *([A-Z-a-z_][\w]*)/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var filter = this.filters[match[1]];
        if (!filter) throw new ReferenceError("Unknown filter " + match[1]);
        var params = [undefined];
        // additional params?
        if (this.isChar("(")) {
            do {
                params.push(this.parseExpression(true) || function() {});
            } while (this.isChar(","));
            if (!this.isChar(")")) throw new SyntaxError("filter parameters not closed: " + this.s);
        }

        var x = this.parseFilter()
          , value;
//        return filter && function(data) {
//            return filter.call(this, fun.call(this, data));
//        } || fun;


//        console.log("~ parseFilter:", filter, params, '"' + this.s + '"');
        var f = function(data) {
            var that = this;
            params[0] = data;
            value = filter.apply(this, params.map(function(param, i) {return i ? param.call(that, that.data) : param;}));
            return x ? x.call(this, value) : value;
        }
        f.$set = function() {
            throw new ReferenceError("Invalid left-hand side in assignment with filter");
        };
        return f;
    }
};

Expression.prototype.parseEOL = function() {
    var line = this.s;
    this.s = "";
    return function(data) {
        console.error("Syntax error near " + '"' + line + '"');
        throw new SyntaxError("Syntax error near " + '"' + line + '"');
    };
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
