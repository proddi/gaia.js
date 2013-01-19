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
test("compile - api", function() {
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

test("compile - DOM creation", function() {
    var target
       ;

    // creation from string
    target = document.createElement("div");
    gaia.compile('<span class="foo">bar</span>')().appendTo(target);
    equal(target.innerHTML, '<span class="foo">bar</span>', "DOMFragment creation from string");

    // creation from DOMNode
    target = document.createElement("div");
    var fragment = document.createElement("div");
    fragment.innerHTML = '<span class="bar">foo</span>';
    gaia.compile(fragment)().appendTo(target);
    equal(target.innerHTML, '<div><span class="bar">foo</span></div>', "DOMFragment creation from DOMNode");

    // creation with inline expression
    target = document.createElement("div");
    gaia.compile('<p>Hello {{ foo }}!</p>')({ foo: "bar" }).appendTo(target);
    equal(target.innerHTML, '<p>Hello bar!</p>', "DOMFragment creation with inline expression");

    // multiple DOMFragment creation
    target = document.createElement("div");
    var template = gaia.compile('<p>Hello {{ name }}!</p>');
    template.clone()({ name: "Foo" }).appendTo(target);
    template.clone()({ name: "Bar" }).appendTo(target);
    template.clone()({ name: "Foo" }).appendTo(target);
    equal(target.innerHTML, '<p>Hello Foo!</p><p>Hello Bar!</p><p>Hello Foo!</p>', "Multiple DOMFragment creation from compiled DOMString with inline expression");
});

test("compile - Scope binding", function() {
    var target
       ,scope
       ;

    target = document.createElement("div");
    scope = { name: "World" };
    gaia.compile('<p>Hello {{ name }}!</p>')(scope).appendTo(target);
    equal(target.innerHTML, '<p>Hello World!</p>', "Initial value");
    scope.name = "Mr.Foo";
    equal(target.innerHTML, '<p>Hello Mr.Foo!</p>', "DOMNode changed according to scope member change.");
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

test("compile - directive/g:ignore", function() {
    var target
       ,scope
       ;

    target = document.createElement("div");
    gaia.compile('<p g:ignore>Hello {{ name }}!</p>')({ name: "World" }).appendTo(target);
    equal(target.innerHTML, '<p g:ignore="">Hello {{ name }}!</p>', "Inline expressions not evaluated");

    target = document.createElement("div");
    scope = { age: 42 };
    gaia.compile('<p g:init="age=23" g:ignore></p>')(scope).appendTo(target);
    equal(scope.age, 42, "g:init is not executed");

    // nested structures
    scope = { age: 42 };
    gaia.compile('<p g:init="age=42+23">'
                    +'<p g:init="age=23" g:ignore>'
                        +'<p g:init="age=0"></p>'
                    +'</p>'
                +'</p>')(scope);
    equal(scope.age, 42+23, "nested g:init is not executed");

});
