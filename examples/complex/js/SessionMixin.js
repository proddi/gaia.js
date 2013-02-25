// user data model
// need jquery.session.js
// session = {
//     user: {} // custom user object or null if not auhenticated/guest
//     login()
//     logout()
//     busy    // authentication in progress
//     error   // if an error occures
//     statusText // readable status
// }
var SessionMixin = function(auth) {
    return function(node) {
        var scope = this
          , session = scope.session = {
                user: undefined,
                busy: false,
                statusText: "not logged in"
            }
            ;

        scope.login = function(user, pass) {
            session.busy = true;
            session.statusText = "logging in...";
            auth.login(user, pass, function(err, data) {
                console.log(err, data);
                if (err) {
                    session.user = undefined;
                    session.error = err;
                    session.statusText = "login error: " + err;
                } else {
                    session.user = data.user;
                    session.error = undefined;
                    session.statusText = "logged in";
                }
                session.busy = false;
            });
        }
        scope.logout = function() {
            session.busy = true;
            session.statusText = "logging out...";
            auth.logout(function(err, data) {
                session.user = undefined;
                session.busy = false;
                session.statusText = "logged out";
            });
        }

        // probe user status
        auth.probe("some session id", function(err, data) {
            session.busy = true;
            session.statusText = "probing session...";
            console.log(err, data);
            if (err) {
                session.user = undefined;
                session.error = undefined;
                session.statusText = "not logged in";
            } else {
                session.user = data.user;
                session.error = undefined;
                session.statusText = "logged in";
            }
            session.busy = false;
        });
    }
}

var Authentication = function() {
};
Authentication.prototype = {
    login: function(user, pass, callback) {
        if (!user) {
            return callback(new Error("no user entered"));
        }
        setTimeout(function() {
            $.post("data/auth.php", { action:'login', user: user, pass: pass }, function() {}, "json")
                .done(function(data) {
                    console.log("--->*", data);
                    callback(undefined, data);
                })
                .fail(function(err) {
                    console.error("--->!", err);
                    callback(err);
                })
                ;
        }, 500);
    },
    logout: function(callback) {
        $.post("data/auth.php", { action:'logout' }, function() {}, "json")
            .done(function(data) {
                console.log("--->*", data);
                callback(undefined, data);
            })
            .fail(function(err) {
                console.error("--->!", err);
                callback(err);
            })
        ;
        callback();
    },
    probe: function(sessionId, callback) {
        $.post("data/auth.php", {}, function() {}, "json")
            .done(function(data) {
                console.log("===>*", data);
                callback(undefined, data);
            })
            .fail(function(err) {
                console.error("===>!", err);
                callback(err);
            })
        ;
    },
};
