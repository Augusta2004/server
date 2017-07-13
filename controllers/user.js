const User = require('mongoose').model('User');
const Role = require('mongoose').model('Role');
const encryption = require('./../config/encryption');

module.exports = {
    registerGet: (req, res) => {
        res.render('user/register', { title: 'Register' });
    },
    registerPost: (req, res) => {
        let registerArgs = req.body;
        let roles = [];

        User.findOne({ email: registerArgs.email }).then(user => {
            let errorMsg = '';
            let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            if (user) {
                errorMsg = 'User with the same username exists!';
            } else if (registerArgs.password !== registerArgs.repeatedPassword) {
                errorMsg = 'Passwords do not match!';
            } else if (!re.test(registerArgs.email)) {
                errorMsg = 'Email is not valid';
            }

            if (errorMsg) {
                registerArgs.error = errorMsg;
                res.render('user/register', registerArgs);
            } else {
                let salt = encryption.generateSalt();
                let passwordHash = encryption.hashPassword(registerArgs.password, salt);

                let userObject = {
                    mail: registerArgs.email,
                    password: passwordHash,
                    username: registerArgs.username,
                    salt: salt,
                    banned: false,
                    sendMail: false,
                };

                Role.findOne({ name: 'User' }).then(role => {
                    roles.push(role.id);
                    userObject.roles = roles;
                    User.create(userObject).then((user, err) => {
                        if (err) {
                            registerArgs.error = err.message;
                            res.render('user/register', registerArgs);
                        }
                        else {
                            req.logIn(user, (err) => {
                                if (err) {
                                    registerArgs.error = err.message;
                                    res.render('user/register', registerArgs);
                                    return;
                                }
                                res.redirect('/');
                            });
                        }
                    });
                });
            }
        });
    },
    loginGet: (req, res) => {
        res.render('user/login', { title: 'Login' });
    },
    loginPost: (req, res) => {
        let loginArgs = req.body;
        User.findOne({ mail: loginArgs.email }).then(user => {
            if (!user || !user.authenticate(loginArgs.password)) {
                let errorMsg = 'Either username or password is invalid!';
                loginArgs.error = errorMsg;
                res.render('user/login', loginArgs);
                return;
            } else if (user.banned) {
                let errorMsg = 'User is banned!';
                loginArgs.error = errorMsg;
                res.render('user/login', loginArgs);
                return;
            }


            req.logIn(user, (err) => {
                if (err) {
                    console.log(err);
                    res.redirect('/user/login', { error: err.message });
                    return;
                }

                res.redirect('/');
            })
        })
    },
    logout: (req, res) => {
        req.logOut();
        res.redirect('/');
    },
    profile: (req, res) => {
        let userId = req.params.id;
        User.findOne({ _id: userId }).then(user => {
            res.render('user/profile', { title: user.username, user: user });
        });

    },
};
