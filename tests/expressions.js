test("Expression test - atomic", function() {
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
    equal(gaia.parse("42")(), 42, "42");

    // String
    equal(gaia.parse("'foo'")(), "foo", "'foo'");
    equal(gaia.parse('"foo"')(), "foo", '"foo"');

    // Array
    deepEqual(gaia.parse("[42, 'bar']")(), [42, "bar"], "[42, 'bar']");

    // Accessing Member
    e = new Expression("num");
    equal(e(data), 42, "data. " + e.$source);

    e = new Expression("str");
    equal(e(data), "foo", "data. " + e.$source);

    e = new Expression("user");
    equal(e(data), data.user, "data. " + e.$source);

    // Member - not exists
    e = new Expression("user.foo.bar.biz");
    equal(e(data), undefined, "data. " + e.$source);

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

});

test("Expression test - filters", function() {
    var data = {
            json: {
                n: 42,
                s: "John",
                a: [23, 42]
            }
        }
      , e;

    // | lower
    equal(gaia.parse("'John' | lower")(), "john", "<string> | lower");
    deepEqual(gaia.parse("['John', 'Doe', 42] | lower")(), ["john", "doe", 42], "<array> | lower");

    // | upper
    equal(gaia.parse("'John' | upper")(), "JOHN", "<string> | upper");
    deepEqual(gaia.parse("['John', 'Doe', 42] | upper")(), ["JOHN", "DOE", 42], "<array> | upper");

    // | join
    deepEqual(gaia.parse("[42, 'bar'] | join")(), "42,bar", "<array> | join");
    deepEqual(gaia.parse("[42, 'bar'] | join('/+')")(), "42/+bar", "<array> | join('/+')");

    // | json
    equal(gaia.parse("json | json")(data), JSON.stringify(data.json), "<object> | json");

    // Chaining
    deepEqual(gaia.parse("[42, 'bar', 'biz'] | join | upper")(), "42,BAR,BIZ", "<array> | join | upper");

});

