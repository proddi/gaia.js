var CalculatorController = function(node) {
    var scope = this
      , operation = function(val) { return val; }
      ;

    scope.display = "";

    var value = "";

    scope.type = function(c) {
        if ("." === c && scope.display.indexOf(".") >= 0) return;
        scope.display += c;
    };

    scope.add = function() {
        operation = function(prevValue, value) {
            return prevValue + value;
        }.bind(undefined, operation(parseFloat(scope.display)));
        scope.display = "";
    };

    scope.sub = function() {
        operation = function(prevValue, value) {
            return prevValue - value;
        }.bind(undefined, operation(parseFloat(scope.display)));
        scope.display = "";
    };

    scope.mul = function() {
        operation = function(prevValue, value) {
            return prevValue * value;
        }.bind(undefined, operation(parseFloat(scope.display)));
        scope.display = "";
    };

    scope.div = function() {
        operation = function(prevValue, value) {
            return prevValue / value;
        }.bind(undefined, operation(parseFloat(scope.display)));
        scope.display = "";
    };

    scope.calc = function() {
        scope.display = "" + operation(parseFloat(scope.display));
        operation = function(val) { return val; }
    }
}