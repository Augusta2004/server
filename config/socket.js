const mongoose = require('mongoose');
const User = mongoose.model('User');
const Item = mongoose.model('Item');
const Character_item = mongoose.model('Character_item');
const Friend_request = mongoose.model('Friend_request');

module.exports = (server) => {
    const io = require('socket.io').listen(server);
    let async = require('async');
    let playerSpawnPoints = [];
    let clients = {};
    const __serverName = 'Europe';

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
                    }
                }

                if (clients[currentPlayer.roomName].length == 0) {
                    socket.emit('players loaded', {});
                }
            }
            else {
                socket.emit('players loaded', {});
            }
        });

        socket.on('play', (data) => {

            console.log(currentPlayer.name + 'recv play: ' + JSON.stringify(data));
            console.log(data);
            if (clients[currentPlayer.roomName] == undefined || clients[currentPlayer.roomName].length === 0) { //if is not defined
                playerSpawnPoints = [];
                /*data.playerSpawnPoints.forEach((_playerSpawnPoints) => {
                    let playerSpawnPoint = {
                        position: _playerSpawnPoints.position
                    };
                    playerSpawnPoints.push(playerSpawnPoint);
                });*/
            }

            //let randomSpawnPoints = playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
            //currentPlayer.position = randomSpawnPoints.position;
            currentPlayer.position = data.playerSpawnPoint.position;
            currentPlayer.animation = [0, -1];
            currentPlayer.server = __serverName;

            if (clients[currentPlayer.roomName] == undefined) {
                clients[currentPlayer.roomName] = new Array();
            }

            clients[currentPlayer.roomName].push(currentPlayer);

            console.log(clients);
            console.log(currentPlayer.name + ' emit: play:' + JSON.stringify(currentPlayer));
            socket.emit('play', currentPlayer);

            socket.to(currentPlayer.roomName).emit('other player connected', currentPlayer);
        });

        socket.on('get friend status', (data) => {
            let isFriend = false;
            User.findOne({_id: currentPlayer.id}, function (err, existingUser) {
                if(existingUser) { //If this user exists
                    for(let i=0; i < existingUser.friends.length; i++){ //Loop trough all our friends (if we have any :(  )
                        if(existingUser.friends[i] == data.id){
                            isFriend = true;
                            break;
                        }
                    }

                    let friendsStatus = {
                        username: data.type,
                        isFriend: isFriend
                    };

                    socket.emit('get friend status', friendsStatus);
                    console.log(friendsStatus);
                }
            });
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
                                    //TODO: Check if this will still work without the above query

                                    let conditions = {_id: existingUser._id}
                                        , update = {$set: {is_logged: true, last_logged: Math.floor(Date.now() / 1000), "character.server" : __serverName, "socketID": socket.id}}
                                        , options = {multi: false};

                                    User.update(conditions, update, options, callback);

                                    function callback(err, numAffected) {

                                        //username = existingUser.username;
                                        //user_id = existingUser.user_id;
                                        //coins = character.coins;
                                        currentPlayer.name = existingUser.username;
                                        currentPlayer.id = existingUser._id;
                                        currentPlayer.fish = user.character.fish;

                                        //console.log(currentPlayer + "fdklgjdflkgj" + {clients});
                                        updateFriendsStatus(); //Update our friends status
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

        socket.on('get player items', (data) => {
            Character_item.find({user_id: currentPlayer.id}, function (err, items) {

                socket.emit('get player items', {items});
            }).sort({ type: 1 }).skip((data.intVal - 1) * 3).limit(3);
        });

        socket.on('get player items by type', (data) => {
            Character_item.find({user_id: currentPlayer.id, type: data.stringVal}, function (err, items) {

                socket.emit('get player items', {items});
            }).sort({ type: 1 }).skip((data.intVal - 1) * 3).limit(3);
        });

        socket.on('get player items count', () => {
            Character_item.find({user_id: currentPlayer.id}, function (err, items) {

                let count = items.length;
                socket.emit('get player items count', {count});
            });
        });

        socket.on('get player items count by type', (data) => {
            Character_item.find({user_id: currentPlayer.id, type: data.stringVal}, function (err, items) {

                let count = items.length;
                socket.emit('get player items count', {count});
            });
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
                    User.findOne({_id: currentPlayer.id}, function (err, character) {
                        console.log("2");
                        Item.findOne({_id: data.stringVal}, function (err, item) {
                            itemObj = item;
                            if(item)
                            {
                                if (character.character.fish < item.price) {
                                    console.log(character.character.fish + " | " + item.price)
                                    errors.push('You do not have enough fish!');
                                }
                            }
                            else
                            {
                                errors.push('Item does not exist!');
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

                        let conditions = {_id: currentPlayer.id}
                            , update = {$set: {character: {fish: currentPlayer.fish}}}
                            , options = {multi: true};

                        User.update(conditions, update, options, callback);


                        function callback(err, numAffected) {
                            console.log("bought item");

                            errors.push('Successfully bought item!');

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
                , update = {$set: {"character.fish" : currentPlayer.fish}}
                , options = {multi: false};

            User.update(conditions, update, options, callback);

            function callback(err, numAffected) {
            }
        });

        socket.on('friend request', (data) => {
            User.findOne({
                _id : currentPlayer.id,
                friends: {
                    "$in": [data.stringVal]
                }
            }, (err, friend) =>{

                if(friend == null) {
                    //Check if we already have request related to this character
                    Friend_request.findOne({
                        $or: [{
                            'sender_id': currentPlayer.id,
                            'receiver_id': data.stringVal
                        }, {'sender_id': data.stringVal, 'receiver_id': currentPlayer.id}]
                    }, function (err, friendRequest) {
                        if (!friendRequest) { //If we already have friend request sent to each other
                            console.log("Sending this motherfucker a friend request");

                            new Friend_request({
                                sender_username: currentPlayer.name,
                                sender_id: currentPlayer.id,
                                receiver_id: data.stringVal
                            }).save().then(() => {
                                updateRequests(data.stringVal);
                            });

                        } else {
                            console.log("Your request hasn't been answered yet");
                        }
                    });
                }
                else{
                    console.log("You're already friends...");
                }
            });
        });

        socket.on('remove friend', (data) => {
            console.log(data);

            User.findOneAndUpdate({_id: currentPlayer.id}, {$pull: {friends: data.stringVal}}, function(err, currentUser){
                if(currentUser) {
                    socket.emit('update friend list', {});
                }
            });


            User.findOneAndUpdate({_id: data.stringVal}, {$pull: {friends: currentPlayer.id}}, function(err, user){
                if(user) {
                    if (user.is_logged === true && user.character.server === __serverName) {
                        if (io.sockets.sockets[user.socketID]) {
                            io.to(user.socketID).emit('update friend list', {});

                            io.to(user.socketID).emit('handle friend', {
                                'playerId' : currentPlayer.id,
                                'playerUsername': currentPlayer.name,
                                'addFriend': false
                            });

                            socket.emit('handle friend', {
                                'playerId' : user._id,
                                'playerUsername': user.username,
                                'addFriend': false
                            });

                            console.log("gg wp");
                        }
                    }
                }
            });
        });

        socket.on('show friends', () => {
            console.log("SHOW FRIENDS");
            User.findOne({'_id': currentPlayer.id}, 'friends', (err, userFriends) => {
                let showFriends  = [];
                if(userFriends.friends.length > 0){
                    User.find({ _id: { $in: userFriends.friends}}, function (err, friends) {

                        friends.forEach((friend) => {
                            console.log(friend.character.server);
                            showFriends.push({'username' : friend.username, 'id' : friend._id, 'is_logged' : friend.is_logged, 'server' : friend.character.server});
                        });

                        socket.emit('show friends', {showFriends});
                    }).sort([['is_logged', -1], ['username', 1]])
                }
                else{
                    socket.emit('show friends', {showFriends});
                }
            })
        });

        socket.on('show requests', () => {
            showRequests();
        });

        socket.on('check request update', () => {
           User.findOne({'_id': currentPlayer.id}, 'character.update_requests', (err, user) => {

               if(user.character.update_requests){
                   showRequests(true);
               }
           })
        });

        socket.on('handle request', (data) => {
            Friend_request.findOneAndRemove({'_id' : data.requestId}, (err, request) => {
                console.log(request);
                if(data.acceptRequest){
                    User.findById(request.receiver_id, (err, currentUser) => {
                        if(currentUser) {
                            currentUser.friends.push(request.sender_id);
                            currentUser.save();

                            socket.emit('update friend list', {});
                        }
                    });

                    User.findById(request.sender_id, (err, user) => {
                        if(user) {
                            user.friends.push(request.receiver_id);
                            user.save();

                            if(user.is_logged === true && user.character.server === __serverName){
                                if(io.sockets.sockets[user.socketID]){
                                    console.log("SQ 6 MU KAA NA TOA " + user.socketID);
                                    io.to(user.socketID).emit('update friend list', {});
                                    io.to(user.socketID).emit('handle friend', {'playerId' : currentPlayer.id, 'playerUsername' : currentPlayer.name, 'addFriend' : true});

                                    socket.emit('handle friend', {'playerId' : request.sender_id, 'playerUsername' : request.sender_username, 'addFriend' : true});
                                }
                            }
                        }
                    });
                }
            })
        });

        socket.on('disconnect', () => {
            //TODO: FIX THIS SHIT

            //TODO: remove server from USER.CHARACTER
            if (currentPlayer.roomName != "unknown" && clients[currentPlayer.roomName] != undefined) {
                console.log(currentPlayer.name + "recv: disconnected");
                socket.to(currentPlayer.roomName).emit('other player disconnected', currentPlayer);
                updateFriendsStatus();
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
                }
            }
        });

        function updateFriendsStatus() {
            User.findOne({'_id': currentPlayer.id}, 'friends', (err, userFriends) => {

                if(userFriends.friends.length > 0){
                    User.find({ _id: { $in: userFriends.friends}, is_logged : true, "character.server": __serverName}, function (err, friends) {
                        if(friends.length > 0) {
                            friends.forEach((friend) => {
                                if(io.sockets.sockets[friend.socketID]){
                                    console.log("SQ 6 MU KAA NA TOA " + friend.socketID);
                                    io.to(friend.socketID).emit('update friend list', {})
                                }
                            });
                        }
                    })
                }
            })
        }

        function updateRequests(user_id) {
            User.findOne({ _id: user_id, is_logged : true, "character.server": __serverName}, function (err, friend) {

                if(friend) {
                    if(io.sockets.sockets[friend.socketID]){
                        console.log("SQ 6 MU KAA NA TOA ZA REQUESTA" + friend.socketID);
                        //io.to(friend.socketID).emit('update friend list', {})
                        showRequests(true, user_id, friend.socketID)
                    }
                }

                let conditions = {_id: user_id}
                    , update = {$set: {"character.update_requests" : true}}
                    , options = {multi: false};

                User.update(conditions, update, options, callback);
                function callback(err, numAffected) {
                }
            })
        }

        function showRequests(update_requests = false, user_id = null, socketID = null){
            console.log("SHOW REQUESTS");
            if(user_id == null){
                user_id = currentPlayer.id;
            }

            Friend_request.find({'receiver_id': user_id}, (err, friendRequests) => {
                console.log(friendRequests.length);
                if(friendRequests.length > 0){
                    let showRequests  = [];

                    friendRequests.forEach((friendRequest) => {
                        showRequests.push({'_id' : friendRequest._id, 'sender_username' : friendRequest.sender_username, 'sender_id' : friendRequest.sender_id});
                    });

                    if(!update_requests) {
                        socket.emit('show requests', {showRequests});
                    }
                    else if(update_requests && user_id == currentPlayer.id){
                        socket.emit('update requests', {showRequests});

                        let conditions = {_id: user_id}
                            , update = {$set: {"character.update_requests" : false}}
                            , options = {multi: false};

                        User.update(conditions, update, options, callback);
                        function callback(err, numAffected) {
                        }
                    }
                    else if(update_requests && user_id != null){
                        if(io.sockets.sockets[socketID]) {
                            io.to(socketID).emit('update requests', {showRequests})
                        }
                    }
                }
                else{
                    if(user_id == currentPlayer.id) {
                        let conditions = {_id: user_id}
                            , update = {$set: {"character.update_requests": false}}
                            , options = {multi: false};

                        User.update(conditions, update, options, callback);
                        function callback(err, numAffected) {
                        }
                    }
                }
            })
        }
    });
};