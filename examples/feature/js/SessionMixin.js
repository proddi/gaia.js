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
                    session.statusText = "error during login: " + err;
                } else {
                    session.user = data.user;
                    session.error = undefined;
                    session.statusText = "logged in";
                }
                session.busy = true;
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
    }
}

var Authentication = function() {
};
Authentication.prototype = {
    login: function(user, pass, callback) {
        $.get("data/auth.json", undefined, "json")
            .done(function(data) {
                callback(undefined, data);
            })
            .fail(function(err) {
                callback(err);
            })
        ;
    },
    logout: function(callback) {
        callback();
    }
};
