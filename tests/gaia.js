module("GAIA", {
    setup: function() {
        var div = document.createElement("div");
        div.id = "gaia_test";
        document.body.appendChild(div);
    },
    teardown: function() {
        var div = document.querySelector("#gaia_test");
        div.parentNode.removeChild(div);
    }
});

/**
 * compile(DOM) -> (scope)                                              // for existing nodes
 * compile(DOM|string) -> (scope) -> append(parentNode)                 // for fragments
 * compile(DOM|string) -> clone() -> (scope) -> append(parentNode)      // for fragment clones
 */
test("compile - simple", function() {
    var target = document.querySelector("#gaia_test");

    // compile
    var binder = gaia.compile('<div>Foo</div>');
    equal(typeof binder, "function", "gaia.compile(<string>) returns a function");
    equal(typeof binder.clone, "function", "gaia.compile(<string>).clone() is a function");

    // cloning
    var cloneBinder = binder.clone();
    notStrictEqual(cloneBinder, binder, "cloned binder is not the original binder");

    var unbinder = binder();
    equal(typeof unbinder, "function", "unbinder is a function");
    equal(typeof unbinder.appendTo, "function", "unbinder.appendTo is a function");
    equal(typeof unbinder.detatch, "function", "unbinder.detatch is a function");
    equal(unbinder.node.nodeType, 1, "unbinder.node is a DOMNode");

    var cloneUnbinder = cloneBinder();
    notStrictEqual(cloneUnbinder, unbinder, "cloned unbinder is not the original unbinder");
    equal(typeof cloneUnbinder, "function", "cloned unbinder is a function");
    equal(typeof cloneUnbinder.appendTo, "function", "cloned unbinder.appendTo is a function");
    equal(typeof cloneUnbinder.detatch, "function", "cloned unbinder.detatch is a function");
    equal(cloneUnbinder.node.nodeType, 1, "cloned unbinder.node is a DOMNode");

    // dom appending for normal and cloned
    equal(target.children.length, 0, "no DOM fragment added yet");
    unbinder.appendTo(target);
    equal(target.children.length, 1, "one DOM fragment added");
    equal(unbinder.node.parentNode, target, "one DOM fragment added");
    cloneUnbinder.appendTo(target);
    equal(target.children.length, 2, "two DOM fragments added");
    unbinder.detatch();
    cloneUnbinder.detatch();
    equal(target.children.length, 0, "no DOM fragment attached anymore");
});

test("compile - directive/g:init", function() {
    var scope = {};
    gaia.compile('<div g:init="foo=123456789"/>')(scope);
    equal(scope.foo, 123456789, "g:init sets member on scope");

    gaia.compile('<div g:init="bar=foo"><p g:init="biz=[1,2,3]"></p></div>')(scope);
    equal(scope.bar, 123456789, "g:init sets reference member on scope");
    deepEqual(scope.biz, [1,2,3], "g:init sets nested member on scope");

    gaia.compile('<div g:init="foo=1;bar={a:2}"/>')(scope);
    equal(scope.foo, 1, "multiple init - first statement");
    deepEqual(scope.bar, {a:2}, "multiple init - second statement");
});
