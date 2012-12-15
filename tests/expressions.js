test("Expression test - atomic", function() {
    // test dataset
    var data = {
            num: 42
          , str: "foo"
          , strEmpty: ""
          , arr: ["bar", 23]
          , user: {
                name: "John"
              , age: 23
              , tags: ["cool", "imaginary"]
              , displayName: function(age) { return ["John Connor", age].join() }
            }
          , fun: function(val) { return val || "Buhh"; }
          , fun2: function(val) { return function() { return val || "Buhh"; } }
        }
      , e;

    // Number
    equal(gaia.parse("42")(), 42, "42");
    equal(gaia.parse("23.42")(), 23.42, "23.42");
    equal(gaia.parse("23.42e+12")(), 23.42e+12, "23.42e+12");

    // String
    equal(gaia.parse("'foo'")(), "foo", "'foo'");
    equal(gaia.parse('"foo"')(), "foo", '"foo"');
    equal(gaia.parse('""')(), "", '""');

    // Array
    deepEqual(gaia.parse("[42, 'bar']")(), [42, "bar"], "[42, 'bar']");

    // Accessing Member
    equal(gaia.parse("num")(data), 42, "data. num (accessing member/number)");

    e = new Expression("str");
    equal(e(data), "foo", "data. " + e.$source);
    equal(gaia.parse("strEmpty")(data), "", 'strEmpty');

    e = new Expression("user");
    equal(e(data), data.user, "data. " + e.$source);

    equal(gaia.parse("fun")(data), data.fun, "data.fun");
    equal(gaia.parse("fun()")(data), data.fun(), "data.fun()");
    equal(gaia.parse("fun(42)")(data), data.fun(42), "data.fun(42)");
    equal(gaia.parse("fun2(42)()")(data), data.fun2(42)(), "data.fun2(42)()");

    equal(gaia.parse("arr[0]")(data), data.arr[0], "data.arr[0]");

    equal(gaia.parse("biz")(data), undefined, "data.biz.f.x.c");

    // Member - not exists
    equal(gaia.parse("user.foo")(data), undefined, "data. (member not exists)");

    // complex
    equal(gaia.parse("fun(user.displayName(42))")(data), data.fun(data.user.displayName(42)), "data. fun(data. user.displayName(42)) (complex, recursive)");

    // Complex
    equal(gaia.parse("fun(user.tags)[1]")(data), "imaginary", "data. fun(user.tags)[1]");

});

test("Expression test - text", function() {
    // test dataset
    var data = {
            num: 42
          , str: "foo"
          , strEmpty: ""
          , arr: ["bar", 23]
          , user: {
                name: "John"
              , age: 23
              , tags: ["cool", "imaginary"]
            }
        };

    equal(gaia.parseText("The answer is {{42}}!")(), "The answer is 42!", "The answer is {{42}}!");
//    equal(gaia.parseText("The answer is {{str}}!")(data), "The answer is 42!", "The answer is {{42}}!");

    equal(gaia.parseText("My name is {{user.name}}.")(data), "My name is John.", "My name is {{user.name}}.");
    equal(gaia.parseText("I'm {{user.age}} year's old {{user.name}}.")(data), "I'm 23 year's old John.", "I'm {{user.age}} year's old {{user.name}}.");

});
test("Expression test - setter", function() {
    // test dataset
    var data = {
            num: 42
          , str: "foo"
          , arr: ["bar", 23]
          , user: {
                name: "John"
              , age: 23
              , tags: ["cool", "imaginary"]
            }
        }
      , e;

    // Number
    e = new Expression("user.age");
    equal(e(data), 23, "data.user.age - precondition");
    e.$set(data, 42)
    equal(data.user.age, 42, "data.user.age is 42 (via JS)");
    equal(e(data), 42, "[data.]user.age is 42 (via expression)");

    /*/ Invalid
    e = new Expression("user.foo.age");
    equal(e(data), undefined, "[data] " + e.$source);
    e.$set(data, 21)
    equal(data.user.foo.age, undefined, "data.data.foo.age");
    */

    // Filter - invalid
//    e = new Expression("user.name | upper");
//    throws(e.$set(data, "Doe"), ReferenceError, "Write an expression with filter throws exception.");

    // arrays
//    e = gaia.parse("[user.name]");
//    e.$set(data, "Jason");
//    ReferenceError expected
});

test("Expression test - bindings", function() {
    var data = {
            user: {
                name: "John"
              , age: 23
              , tags: ["cool", "imaginary"]
            }
        }
      , e
      , sequence = [];

    // simple
    e = gaia.parse("user.name");
    sequence.push("init");
    e(data, function(value) {
        sequence.push("value:" + value);
    })
    sequence.push("$set");
    e.$set(data, "Jason");
    sequence.push("$set.done");
    equal(sequence.join("|"), "init|value:John|$set|value:Jason|$set.done", "checking linking sequence");

    // array param
    data.user.name = "John";
    var seq2 = [];
    e = gaia.parse("[user.name]");
    seq2.push("init");
    e(data, function(value) {
        seq2.push("value:" + value);
    })
    seq2.push("set");
    data.user.name = "Jason";
    seq2.push("set.done");
    equal(seq2.join("|"), "init|value:John|set|value:Jason|set.done", "checking linking sequence");

});

test("Expression test - filters", function() {
    var data = {
            json: {
                n: 42,
                s: "John",
                a: [23, 42]
            }
        };

    // | lower
    equal(gaia.parse("'John' | lower")(), "john", "<string> | lower");
    deepEqual(gaia.parse("['John', 'Doe', 42] | lower")(), ["john", "doe", 42], "{array} | lower");

    // | upper
    equal(gaia.parse("'John' | upper")(), "JOHN", "<string> | upper");
    deepEqual(gaia.parse("['John', 'Doe', 42] | upper")(), ["JOHN", "DOE", 42], "{array} | upper");

    // | join
    deepEqual(gaia.parse("[42, 'bar'] | join")(), "42,bar", "<array> | join");
    deepEqual(gaia.parse("[42, 'bar'] | join('/+')")(), "42/+bar", "{array} | join('/+')");

    // | json
    equal(gaia.parse("json | json")(data), JSON.stringify(data.json), "{object} | json");

    // Chaining
    deepEqual(gaia.parse("[42, 'bar', 'biz'] | join | upper")(), "42,BAR,BIZ", "{array} | join | upper");

});

