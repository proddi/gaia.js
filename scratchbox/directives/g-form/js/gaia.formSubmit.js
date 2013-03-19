gaia.formSubmit = function(form, callback) {
    console.log("~ [gaia.submitForm]", form, form.elements, form.method);
    var url = form.action,
        method = form.method,
        data = new FormData(),
        value,
        input;

    for (var i = 0, l = form.elements.length; i < l; i++) {
        input = form.elements[i];
        if (!input.name) continue;
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
        console.log("add:", input.name, value);
        data.append(input.name, value);
    }

    // Ajax-Call
    $.ajax({
        url: url,
        data: data,
        dataType: "json",
        type: form.method || "post",
        processData: false,
        contentType: false,
        success: function(data) {
            callback(undefined, data);
        },
        failure: function(err, err2) {
            console.error(err, err2);
            callback(err2);
        }
    });

};