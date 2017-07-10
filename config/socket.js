const mongoose = require('mongoose');
const User = mongoose.model('User');
const Item = mongoose.model('Item');
const Character_item = mongoose.model('Character_item');

module.exports = (server) => {
    const io = require('socket.io').listen(server);
    let async = require('async');
    let playerSpawnPoints = [];
    let clients = {};

    //let username = "";
    //let user_id = 0;
    //let coins = 0;

    io.on('connection', socket => {

        console.log('a user connected');

        let currentPlayer = {};
        currentPlayer.name = "unknown";
        currentPlayer.roomName = "unknown";

        socket.on('join room', (data) => {
            console.log(data);
            if (io.sockets.adapter.sids[socket.id][currentPlayer.roomName]) {

                if (currentPlayer.roomName.indexOf("Room") !== -1) {
                    for (let i = 0; i < clients[currentPlayer.roomName].length; i++) {
                        if (clients[currentPlayer.roomName][i].name === currentPlayer.name) {
                            clients[currentPlayer.roomName].splice(i, 1);
                        }
                    }

                    let playerUsername = currentPlayer.name.toString();
                    socket.to(currentPlayer.roomName).emit('player change room', {playerUsername});
                }

                socket.leave(currentPlayer.roomName);
            }

            socket.join(data['stringVal']);
            currentPlayer.roomName = data['stringVal'];

            console.log(JSON.stringify(clients));
            console.log(currentPlayer.roomName);
        });

        socket.on('player connect', () => {

            console.log(currentPlayer.name + 'recv: player connected');

            if (clients[currentPlayer.roomName] != undefined) {
                for (let i = 0; i < clients[currentPlayer.roomName].length; i++) {
                    let playerConnected = {
                        id: clients[currentPlayer.roomName][i].id,
                        name: clients[currentPlayer.roomName][i].name,
                        position: clients[currentPlayer.roomName][i].position
                    };

                    //in your current game we need to tell you about the other players

                    socket.emit('other player connected', playerConnected);
                    console.log(currentPlayer.name + ' emit: other player connected:' + JSON.stringify(playerConnected));

                    console.log(clients[currentPlayer.roomName].length);
                    if (i == clients[currentPlayer.roomName].length - 1) {
                        socket.emit('players loaded', {});

                        console.log('other players are loaded 1');
                    }
                }

                if (clients[currentPlayer.roomName].length == 0) {
                    socket.emit('players loaded', {});

                    console.log('other players are loaded 2');
                }
            }
            else {
                socket.emit('players loaded', {});

                console.log('other players are loaded 3');
            }
        });

        socket.on('play', (data) => {

            console.log(currentPlayer.name + 'recv play: ' + JSON.stringify(data));

            if (clients[currentPlayer.roomName] == undefined || clients[currentPlayer.roomName].length === 0) { //if is not defined
                playerSpawnPoints = [];
                data.playerSpawnPoints.forEach((_playerSpawnPoints) => {
                    let playerSpawnPoint = {
                        position: _playerSpawnPoints.position
                    };
                    playerSpawnPoints.push(playerSpawnPoint);
                });
            }

            let randomSpawnPoints = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
            currentPlayer.position = randomSpawnPoints.position;
            currentPlayer.animation = [0, -1];

            if (clients[currentPlayer.roomName] == undefined) {
                clients[currentPlayer.roomName] = new Array();
            }

            clients[currentPlayer.roomName].push(currentPlayer);

            console.log(clients);
            console.log(currentPlayer.name + ' emit: play:' + JSON.stringify(currentPlayer));
            socket.emit('play', currentPlayer);

            socket.to(currentPlayer.roomName).emit('other player connected', currentPlayer);
        });

        socket.on('player move', (data) => {
            //console.log('recv: move: ' + JSON.stringify(data));
            currentPlayer.position = data.position;
            currentPlayer.animation = data.animation;
            currentPlayer.numAnimation = data.numAnimation;
            socket.to(currentPlayer.roomName).emit('player move', currentPlayer);
        });

        socket.on('player stop animation', (data) => {
            currentPlayer.numAnimation = data.intVal;
            socket.to(currentPlayer.roomName).emit('player stop animation', currentPlayer);
            //console.log(data);
        });

        socket.on('player chat', (data) => {
            data.player = currentPlayer.name;

            socket.emit('player chat', data);
            socket.to(currentPlayer.roomName).emit('player chat', data);
        });

        // socket.on('user register', (data) => {

        //     let errors = new Array();
        //     console.log(data);

        //     let checkMail = function () {

        //         User.findOne({mail: data.mail}, function (err, existingEmail) {
        //             console.log("1");

        //             if (existingEmail) {
        //                 errors.push('Email already exists');
        //                 //callback('Email already exists');
        //             }
        //             else
        //             {
        //                 validateMail();
        //             }
        //         })

        //     };

        //     let validateMail = function () {
        //         var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        //             if (!re.test(data.mail)) {
        //                 errors.push('Email not valid!');
        //             }
        //             console.log("test " + re.test(data.mail));
        //     };


        //     let checkUsername = function () {
        //         return new Promise(() => {
        //             User.findOne({username: data.username}, function (err, existingUsername) {
        //                 console.log("2");
        //                 if (existingUsername) {
        //                     errors.push('Username already exists');
        //                     //callback('Username already exists');
        //                 }
        //                 else
        //                 {
        //                     var re = /^([a-zA-Z0-9_-]+)$/;

        //                     if (!re.test(data.username)) {
        //                         errors.push('Username not valid!');
        //                     }
        //                     else if(data.username.length > 12)
        //                     {
        //                         errors.push('Username should be at most 12 characters!');
        //                     }
        //                 }
        //             })
        //         })
        //     };

        //     let checkPassword = function () {
        //         return new Promise(() => {
        //             if(data.password != data.password2)
        //             {
        //                 errors.push('Passwords do not match!');
        //             }
        //         })
        //     };
        //     let registerUser = function () {
        //         console.log("3");
        //         return new Promise(() => {

        //             if (errors.length > 0) {
        //                 console.log(errors);

        //                 let errObj = {
        //                     errors: errors
        //                 };

        //                 socket.emit('user register', errObj);
        //             } else {
        //                 console.log('success');
        //                 console.log(data);
        //                 let lastUserId = Counter.findOne();
        //                 lastUserId.select('user_id');

        //                 lastUserId.exec((err, counter) => {
        //                             //console.log(counter.user_id);

        //                     new User({
        //                         user_id: counter.user_id + 1,
        //                         username: data.username,
        //                         password: data.password,
        //                         mail: data.mail,
        //                         sendMail: data.sendMail,
        //                         date_reg: Math.floor(Date.now() / 1000),
        //                         is_logged: false
        //                     }).save();

        //                     new Character({
        //                         user_id: counter.user_id + 1,
        //                         fish: 500
        //                     }).save();

        //                     counter.user_id++;
        //                     counter.save().then(() => {
        //                         let errObj = {
        //                             errors: errors
        //                         };

        //                         socket.emit('user register', errObj);
        //                     });

        //                 })
        //             }
        //         })
        //     };

        //     function asyncFunction(item, cb) {
        //         setTimeout(() => {
        //             item();
        //             //console.log('done with', cb);
        //             cb();
        //         }, 15);
        //     }

        //     let requests = [checkMail, checkUsername, checkPassword, registerUser].reduce((promiseChain, item) => {
        //         return promiseChain.then(() => new Promise((resolve) => {
        //             asyncFunction(item, resolve);
        //         }));
        //     }, Promise.resolve());

        // });

        socket.on('user login', (data) => {
            let errors = new Array();
            console.log(data);
            User.findOne({username: data.username}, function (err, existingUser) {
                // Load hash from your password DB.
                if (existingUser) {

                    //bcrypt.compare(data.password, existingUser.password, function(err, res) {


                    if (!existingUser || !existingUser.authenticate(data.password)){
                        errors.push('Username or password is wrong!');
                        console.log(errors)
                    }
                    else {
                        if (existingUser.is_logged) {
                            errors.push('You are already logged in!');
                            console.log(errors)
                        }
                        else {
                            if (errors.length == 0) {
                                console.log(existingUser._id);
                                User.findOne({_id: existingUser._id}, function (err, user) {

                                    let conditions = {_id: existingUser._id}
                                        , update = {$set: {is_logged: true, last_logged: Math.floor(Date.now() / 1000)}}
                                        , options = {multi: false};

                                    User.update(conditions, update, options, callback);

                                    function callback(err, numAffected) {

                                        //username = existingUser.username;
                                        //user_id = existingUser.user_id;
                                        //coins = character.coins;
                                        currentPlayer.name = existingUser.username;
                                        currentPlayer.id = existingUser._id;
                                        // currentPlayer.fish = user.character.fish;

                                        //console.log(currentPlayer + "fdklgjdflkgj" + {clients});
                                    }
                                });

                                console.log("Successfull login");
                            }
                        }
                    }

                    let errObj = {
                        errors: errors
                    };

                    socket.emit('user login', errObj);
                    //  });
                }
                else {
                    errors.push('Username does not exist!');
                    let errObj = {
                        errors: errors
                    };
                    socket.emit('user login', errObj);
                }
            });
        });

        socket.on('collect item', (data) => {

            Character_item.findOne({item_id: data.stringVal, user_id: currentPlayer.id}, function (err, hasItem) {
                if (hasItem) {
                    console.log("has item");
                    let itemObj = {
                        id: -1,
                        name: "You already have this item"
                    };

                    socket.emit('collect item', itemObj);
                }
                else {
                    Item.findOne({_id: data.stringVal}, function (err, itemExists) {
                        console.log(data.stringVal);
                        if (itemExists) {
                            new Character_item({
                                user_id: currentPlayer.id,
                                username: currentPlayer.name,
                                item_id: data.stringVal,
                                name: itemExists.name,
                                picture: itemExists.picture,
                                type: itemExists.type,
                                is_on: false
                            }).save().then(() => {
                                let itemObj = {
                                    id: data.stringVal,
                                    name: "You have successful collected " + itemExists.name
                                };

                                socket.emit('collect item', itemObj);
                            })
                        }
                        else {
                            let itemObj = {
                                id: -1,
                                name: "Item does not exist"
                            };

                            socket.emit('collect item', itemObj);
                            console.log("Item does not exist");
                        }
                    });
                }
            });

        });

        socket.on('get player items', () => {
            Character_item.find({user_id: currentPlayer.id}, function (err, items) {

                socket.emit('get player items', {items});
            })
        });

        socket.on('get other player items', (data) => {
            Character_item.find({username: data.stringVal, is_on: true}, function (err, items) {
                console.log(data.toString());
                socket.emit('get other player items', {username: data.stringVal, items});
            })
        });

        socket.on('change item', (data) => {
            //console.log(data);
            console.log("Changing items");
            console.log(data.id);
            console.log(currentPlayer.id + " user id");
            Character_item.findOne({user_id: currentPlayer.id, item_id: data.id}, function (err, item) {
                let conditions = {user_id: currentPlayer.id, type: data.type}
                    , update = {$set: {is_on: false}}
                    , options = {multi: true};

                Character_item.update(conditions, update, options, callback);

                function callback(err, numAffected) {


                    item.is_on = true;
                    item.save().then(() => {
                        Character_item.find({user_id: currentPlayer.id, is_on: true}, function (err, items) {
                            console.log("gg wp");
                            socket.to(currentPlayer.roomName).emit('get on other player items', {
                                username: currentPlayer.name,
                                items
                            });
                            socket.emit('get on items', {items});
                        })
                    });
                }
            });
        });

        socket.on('get on items', () => {
            Character_item.find({user_id: currentPlayer.id, is_on: true}, function (err, items) {
                //console.log({items});
                socket.emit('get on items', {items});
                console.log(items);
            })
        });

        socket.on('get on other player items', (data) => {
            Character_item.find({user_id: data.id, is_on: true}, function (err, items) {
                //console.log({items});
                socket.emit('get on other player items', {username: data.type, items});
            })
        });

        socket.on('buy item', (data) => {
            let errors = new Array();
            let itemObj = {};

            let checkHasItem = function () {

                Character_item.findOne({item_id: data.stringVal, user_id: currentPlayer.id}, function (err, item) {
                    console.log("1");

                    if (item) {
                        errors.push('You already have this item!');
                    }
                })

            };

            let checkFish = function () {
                return new Promise(() => {
                    Character.findOne({user_id: currentPlayer.id}, function (err, character) {
                        console.log("2");
                        Item.findOne({item_id: data.stringVal}, function (err, item) {
                            itemObj = item;
                            if (character.fish < item.price) {
                                console.log(character.fish + " | " + item.price)
                                errors.push('You do not have enough fish!');
                            }
                        })
                    })
                })
            };


            //check if item is premium
            /*
             let checkPremium = function () {
             return new Promise(() => {
             .findOne({username: data.username}, function (err, existingUsername) {
             console.log("2");
             if (existingUsername) {
             errors.push('Username already exists');
             //callback('Username already exists');
             }
             })
             })
             };
             */

            let buyItem = function () {
                console.log("3");
                return new Promise(() => {

                    if (errors.length > 0) {
                        console.log(errors);

                        let errObj = {
                            errors: errors
                        };

                        socket.emit('buy item', errObj);
                    } else {
                        console.log(itemObj);

                        new Character_item({
                            user_id: currentPlayer.id,
                            username: currentPlayer.name,
                            item_id: data.stringVal,
                            name: itemObj.name,
                            picture: itemObj.picture,
                            type: itemObj.type,
                            is_on: false
                        }).save();

                        currentPlayer.fish -= itemObj.price;

                        let conditions = {user_id: currentPlayer.id, type: data.type}
                            , update = {$set: {fish: currentPlayer.fish}}
                            , options = {multi: true};

                        Character.update(conditions, update, options, callback);


                        function callback(err, numAffected) {
                            console.log("bought item");

                            let errObj = {
                                errors: errors
                            };

                            socket.emit('buy item', errObj);
                        }

                    }
                })
            };

            function asyncFunction(item, cb) {
                setTimeout(() => {
                    item();
                    //console.log('done with', cb);
                    cb();
                }, 15);
            }

            let requests = [checkHasItem, checkFish, buyItem].reduce((promiseChain, item) => {
                return promiseChain.then(() => new Promise((resolve) => {
                    asyncFunction(item, resolve);
                }));
            }, Promise.resolve());

        });

        socket.on('remove item', (data) => {
            Character_item.findOne({
                item_id: data.stringVal,
                user_id: currentPlayer.id,
                is_on: true
            }, function (err, item) {

                if (item) {
                    let conditions = {user_id: currentPlayer.id, item_id: data.stringVal}
                        , update = {$set: {is_on: false}}
                        , options = {multi: false};

                    Character_item.update(conditions, update, options, callback);

                    function callback(err, numAffected) {
                        Character_item.find({user_id: currentPlayer.id, is_on: true}, function (err, items) {
                            //console.log({items});
                            socket.to(currentPlayer.roomName).emit('get on other player items', {
                                username: currentPlayer.name,
                                items
                            });
                            socket.emit('get on items', {items});
                        })
                    }
                }
            })


        });

        socket.on('add fish', (data) => {

            currentPlayer.fish += data.intVal;

            let conditions = {_id: currentPlayer.id}
                , update = {$set: {fish: currentPlayer.fish}}
                , options = {multi: false};

            Character.update(conditions, update, options, callback);

            function callback(err, numAffected) {
            }
        });

        socket.on('disconnect', () => {
            //TODO FIX THIS SHIT
            if (currentPlayer.roomName != "unknown" && clients[currentPlayer.roomName] != undefined) {
                console.log(currentPlayer.name + "recv: disconnected");
                socket.to(currentPlayer.roomName).emit('other player disconnected', currentPlayer);
                console.log(clients[currentPlayer.roomName]);
                console.log(clients);
                for (let i = 0; i < clients[currentPlayer.roomName].length; i++) {
                    if (clients[currentPlayer.roomName][i].name === currentPlayer.name) {
                        clients[currentPlayer.roomName].splice(i, 1);
                    }
                }

                let conditions = {_id: currentPlayer.id}
                    , update = {$set: {is_logged: false}}
                    , options = {multi: false};

                User.update(conditions, update, options, callback);

                function callback(err, numAffected) {
                };
            }
        });
    });
};