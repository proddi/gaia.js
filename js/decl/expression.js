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
    return function(data, update) {
        if (!update) return fun.call({}, data);
        var scope = new ExecutedExpression(expr);
        scope.data = data;
        scope.update = function() {
            update(fun.call({}, data));
        };
        scope.exec = function() {
            return fun.call({}, data);
        };
        update(fun.call(scope, data));
        return scope;
    };
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
            return function(value) {
                return nextFun.call(this, fun.call(this, value));
            }
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
                return elements.map(function(el) { return el.call(that, that.data); });
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
        return function(data) {
            return data[member];
        }
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
            return data[fun].apply(this, params.map(function(param, i) { return param.call(that, that.data); }));
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
        return function(data) {
            var that = this;
            params[0] = data;
            return filter.apply(this, params.map(function(param, i) { return i ? param.call(that, that.data) : param; }));
        }
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
        return value.toUpperCase();
    },
    lower: function(value) {
        return value.toLowerCase();
    },
    arg: function(value, arg) {
//        console.log("~ [arg]", value, arguments);
        return value.replace(/\$/, arg);
    },
    json: function(data) {
        return JSON.stringify(data);
    },
    date: function(value) {
        var format = {
            fullDate: "EEEE, MMMM d,y"
        }[value] || value;
        return Date(value).toString();
    }
};

