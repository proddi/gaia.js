gaia.directive("g:submit", function(node, next) {
    if (node.hasAttribute("g:submit")) {
        console.log("~ [g:submit]", node);
        var successExpr = gaia.parse(node.getAttribute("g:submit-success") || "");

        next(function(n, next) {
            var scope = this;
            n.onsubmit = function() {
                var inputs = n.querySelectorAll("input");
                console.log("submit intercepted", this, inputs);

                // Post-Daten vorbereiten
                var data = new FormData();

                for (var i= 0, value, input; (input = inputs[i++]);) {
                    switch (input.type) {
                        case "file":
                            value = input.files[0];
                            break;
                        case "checkbox":
                            value = input.checked ? "true" : "";
                            break;
                        default:
                            value = input.value;
                    }
                    input.xxxx = "Fooo";
                    data.append(input.name, value);
                }

                // Ajax-Call
                $.ajax({
                    url: "data/upload.php",
                    data: data,
                    dataType: "json",
                    type: "POST",
                    processData: false,
                    contentType: false,
                    success: function(data) {
                        console.log("SUCCESS", data);
                        console.log("expr(scope) -->", successExpr(scope), successExpr.$source, successExpr.$compiled);
                        successExpr(scope).call(this, data);
                    },
                    failure: function(err, err2) {
                        console.error(err, err2);
                    }
                });

                return false;
            }
            next(scope);
        });
    } else {
        next();
    }
}, "g:include");