var ExecutedExpression = function(expression, fun) {
    this.expression = expression;
}

var Expression = function(s) {
    this.s = s;
    this.len = s.length;

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
        if (!update) return fun.call({}, data);
        var scope = new ExecutedExpression(expr);
        scope.data = data;
        gaia.$$update = function() {
            update(fun.call({}, data));
        }
        scope.exec = function() {
            return fun.call({}, data);
        };
        update(fun.call(scope, data));
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

Expression.prototype.isPos = function(pos) {
    return (this.len - pos) === this.s.length;
}

Expression.prototype.parseExpression = function(trimming) {
    if (trimming) {
        this.s = this.s.trim();
        this.lenBack = this.len;
        this.len = this.s.length;
    }

//    console.log("~ parseExpression:", '"' + this.s + '"', trimming);
    var fun = (
            this.parseFunction()
         || this.parseMember()
         || this.parseNumber()
         || this.parseString()
         || this.parseDotOperator()
         || this.parseArray()
         || this.parseFilter()
        );

//    console.log("~ parseExpression.end:", '"' + this.s + '"');
    if (fun && this.s) {
//    console.log("~ parseExpression.end2:", '"' + this.s + '"');
        var nextFun = this.parseExpression();
        if (nextFun) {
            if (trimming) this.len = this.lenBack;
            var f = function(value) {
                return nextFun.call(this, fun.call(this, value));
            }
            f.$set = nextFun.$set ? function(scope, value) {
//                console.log("!", nextFun.$set, fun, arguments);
                return nextFun.$set.call(this, fun.call(this, scope), value);
            } : function() {
                throw new ReferenceError("Invalid left-hand side in assignment near:", this.s);
            };
            return f;
        }
    }

    if (trimming) this.len = this.lenBack;
    return fun;
}

Expression.prototype.parseDotOperator = function() {
    if (this.isChar(".")) {
        return this.parseExpression();
    }
};

Expression.prototype.parseNumber = function() {
    var match = /^([\d]+)/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var value = parseFloat(match[1]);
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
//        console.log("~ parseString:", '"' + value + '"', this.s);
        return function() {
            return value;
        }
    }
    var match = /^'(.*?)'/.exec(this.s); // needs to be improved
    if (match) {
        this.s = this.s.substr(match[0].length);
        var value = match[1];
//        console.log("~ parseString:", "'" + value + "'", this.s);
        return function() {
            return value;
        }
    }
};

Expression.prototype.parseArray = function() {
    if (this.isChar("[")) {
        if (this.isPos(1)) { // declaring an array
            var elements = [];
            do {
                elements.push(this.parseExpression(true) || function() {});
            } while (this.isChar(","));
            if (!this.isChar("]")) throw "array isn't closed: " + this.s;
            return function() {
                var that = this;
                return elements.map(function(el) {return el.call(that, that.data);});
            }
        } else { // selector
            var keyFun = this.parseExpression();
            if (!this.isChar("]")) throw "array isn't closed: " + this.s;
            return function(data) {
                return data[keyFun.call(this, this.data)];
            }
        }
    }
};

Expression.prototype.parseMember = function() {
    var match = /^([A-Z-a-z_][\w]*)/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var member = match[1];
//        console.log("~ parseMember:", member, '"' + this.s + '"');
        var f = function(data) {
            if (gaia.$$update) {
                data = decl._prepareArray(data);
                decl.watch(data, member, gaia.$$update);
                console.log("~ register update listener:", data + "." + member);
            }
            var val = data && data[member];
            return undefined !== val ? val : undefined;
        }
        f.$set = function(data, value) {
            return data ? (data[member] = value) : undefined;
        };
        return f;
    }
};

Expression.prototype.parseFunction = function() {
    var match = /^([A-Z-a-z_][\w]*)\(/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var fun = match[1],
            params = [];
        if (!this.isChar(")")) {
            do {
                params.push(this.parseExpression(true) || function() {});
            } while (this.isChar(","));
            if (!this.isChar(")")) throw "function parameters not closed: " + this.s;
        }

//        console.log("~ parseFunction:", fun, params, this.s);
        return function(data) {
            var that = this;
//            console.log("~ fun.exec", this, fun, data, params);
            return data[fun].apply(data, params.map(function(param, i) {return param.call(that, that.data);}));
        }
    }
};

Expression.prototype.parseFilter = function() {
    var match = /^ *\| *([A-Z-a-z_][\w]*)/.exec(this.s);
    if (match) {
        this.s = this.s.substr(match[0].length);
        var filter = this.filters[match[1]];
        if (!filter) throw SyntaxError("Unknown filter " + match[1]);
        var params = [undefined];
        // additional params?
        if (this.isChar("(")) {
            do {
                params.push(this.parseExpression(true) || function() {});
            } while (this.isChar(","));
            if (!this.isChar(")")) throw SyntaxError("filter parameters not closed: " + this.s);
        }

//        console.log("~ parseFilter:", filter, params, '"' + this.s + '"');
        var f = function(data) {
            var that = this;
            params[0] = data;
            return filter.apply(this, params.map(function(param, i) {return i ? param.call(that, that.data) : param;}));
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
        return SyntaxError("Syntax error near " + '"' + line + '"');
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
