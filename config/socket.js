const mongoose = require('mongoose');
const User = mongoose.model('User');
const Item = mongoose.model('Item');
const Character_item = mongoose.model('Character_item');
const Friend_request = mongoose.model('Friend_request');
const Code = mongoose.model('Code');
const Role = mongoose.model('Role');
const Ring = mongoose.model('Ring');
const Ring_shop = mongoose.model('Ring_shop');

const encryption = require('./../config/encryption');

module.exports = (server) => {
    const io = require('socket.io').listen(server);
    let async = require('async');
    let playerSpawnPoints = [];
    let clients = {};
    const __serverName = 'Europe';

    //let username = "";
    //let user_id = 0;
    //let coins = 0;
    resetUsers();

    io.on('connection', socket => {
        console.log('a user connected');

        let currentPlayer = {};
        currentPlayer.name = "unknown";
        currentPlayer.roomName = "unknown";

        socket.on('join room', (data) => {
            console.log(data);
            if (io.sockets.adapter.sids[socket.id][currentPlayer.roomName]) {

                console.log(currentPlayer.roomName.indexOf("Room"));
                if (currentPlayer.roomName.indexOf("Room") !== -1) {
                    console.log(clients[currentPlayer.roomName].length);
                    for (let i = 0; i < clients[currentPlayer.roomName].length; i++) {
                        console.log(clients[currentPlayer.roomName][i].name);
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
                        animation: clients[currentPlayer.roomName][i].animation,
                        position: clients[currentPlayer.roomName][i].position,
                        popularity: clients[currentPlayer.roomName][i].popularity,
                        movement: clients[currentPlayer.roomName][i].movement,
                        isWalking: clients[currentPlayer.roomName][i].isWalking
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
            currentPlayer.movement = 'none';
            currentPlayer.isWalking = false;

            if (clients[currentPlayer.roomName] == undefined) {
                clients[currentPlayer.roomName] = new Array();
            }

            clients[currentPlayer.roomName].push(currentPlayer);

            console.log(clients);
            console.log(currentPlayer.name + ' emit: play:' + JSON.stringify(currentPlayer));
            socket.emit('play', currentPlayer);

            socket.to(currentPlayer.roomName).emit('other player connected', currentPlayer);
            getPopularity(currentPlayer.id);
        });

        socket.on('get friend status', (data) => {
            let isFriend = false;
            User.findOne({_id: currentPlayer.id}, function (err, existingUser) {
                if(existingUser) { //If this user exists
                    for(let i=0; i < existingUser.friends.length; i++){ //Loop trough all our friends (if we have any :(  )
                        if(existingUser.friends[i]._id == data.id){
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
            currentPlayer.movement = 'walking';
            currentPlayer.isWalking = true;

            socket.to(currentPlayer.roomName).emit('player move', currentPlayer);
        });

        socket.on('player stop animation', (data) => {
            //currentPlayer.numAnimation = data.vec2;
            currentPlayer.position = [data.vec2.x , data.vec2.y];
            currentPlayer.isWalking = false;
            //console.log(data.vec2);
            //socket.to(currentPlayer.roomName).emit('player stop animation', currentPlayer);
            //console.log(data);
        });

        socket.on('player chat', (data) => {
            data.player = currentPlayer.name;

            socket.emit('player chat', data);
            socket.to(currentPlayer.roomName).emit('player chat', data);
        });

        socket.on('movement', (data) => {
            if(data.movement !== 'wave'){
                currentPlayer.animation = [data.x, data.y];
                currentPlayer.movement = data.movement;
            }
            else{
                currentPlayer.movement = 'none';
            }

            socket.emit('movement', data);
            socket.to(currentPlayer.roomName).emit('movement', data);
        });

        socket.on('login to server', (data) => {
            loginUser(data.stringVal);
        });

        socket.on('user login', (data) => {
            let errors = new Array();
            console.log(data);
            User.findOne({usernameToLower: data.username.toLowerCase()}, function (err, existingUser) {
                // Load hash from your password DB.
                if (existingUser) {
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
                                /*
                                let is_premium = true;
                                if(existingUser.character.premium_end <= Date.now() / 1000)
                                {
                                    is_premium = false;
                                }

                                User.findOne({_id: existingUser._id}, function (err, user) {
                                    //TODO: Check if this will still work without the above query

                                    let conditions = {_id: existingUser._id}
                                        , update = {$set: {is_logged: true, is_premium: is_premium, last_logged: Math.floor(Date.now() / 1000), "character.server" : __serverName, "socketID": socket.id}}
                                        , options = {multi: false};

                                    User.update(conditions, update, options, callback);

                                    function callback(err, numAffected) {

                                        //username = existingUser.username;
                                        //user_id = existingUser.user_id;
                                        //coins = character.coins;
                                        currentPlayer.name = existingUser.username;
                                        currentPlayer.id = existingUser._id;
                                        currentPlayer.fish = user.character.fish;
                                        currentPlayer.is_premium = user.character.is_premium;
                                        currentPlayer.popularity = user.character.popularity;
                                        currentPlayer.premium_end = user.character.premium_end;

                                        updateFriendsStatus(); //Update our friends status
                                    }

                                });
                                */
                                errors.push('-1');
                                errors.push(existingUser._id);
                                console.log("Successfull login");
                            }
                        }
                    }

                    let errObj = {
                        errors: errors
                    };

                    socket.emit('user login', errObj);
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

        socket.on('user register', (data) => {
                let roles = [];
                let errors = new Array();

                console.log(data);
                User.findOne({$or: [
                    {mail: data.mail},
                    {usernameToLower: data.username.toLowerCase()}
                ]}).then(user => {
                    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    if (user) {
                        errors.push('User with the same email or username exists!');
                    } else if (data.password !== data.password2) {
                        errors.push('Passwords do not match!');
                    } else if (!re.test(data.mail)) {
                        errors.push('Email is not valid');
                    }

                    if (errors.length > 0) {

                        console.log(errors);

                        let errObj = {
                            errors: errors
                        };
                        socket.emit('user register', errObj);

                    } else {
                        let salt = encryption.generateSalt();
                        let passwordHash = encryption.hashPassword(data.password, salt);

                        let userObject = {
                            mail: data.mail.toLowerCase(),
                            password: passwordHash,
                            username: data.username,
                            usernameToLower: data.username.toLowerCase(),
                            salt: salt,
                            banned: false,
                            sendMail: false,
                        };

                        Role.findOne({ name: 'User' }).then(role => {
                            roles.push(role.id);
                            userObject.roles = roles;
                            User.create(userObject).then((user, err) => {

                                console.log(errors);

                                let errObj = {
                                    errors: errors
                                };
                                socket.emit('user register', errObj);
                            });
                        });
                    }
                });
        });

        socket.on('collect item', (data) => {

            Character_item.findOne({item_id: data.stringVal, user_id: currentPlayer.id}, function (err, hasItem) {
                if (hasItem) {
                    console.log("has item");
                    let itemObj = {
                        stringVal: "You already have this item"
                    };

                    socket.emit('show dialog', itemObj);
                }
                else {
                    Item.findOne({_id: data.stringVal}, function (err, itemExists) {
                        console.log(data.stringVal);
                        if (itemExists) {
                            if(itemExists.is_premium && !currentPlayer.is_premium)
                            {
                                let itemObj = {
                                    stringVal: "You need to be premium to collect this item!"
                                };

                                socket.emit('show dialog', itemObj);
                            }
                            else
                            {
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
                                        stringVal: "You have successful collected " + itemExists.name
                                    };

                                    socket.emit('show dialog', itemObj);
                                })
                            }
                        }
                        else {
                            let itemObj = {
                                stringVal: "Item does not exist"
                            };

                            socket.emit('show dialog', itemObj);
                            console.log("Item does not exist");
                        }
                    });
                }
            });

        });

        socket.on('get player items', (data) => {
            Character_item.find({user_id: currentPlayer.id}, function (err, items) {

                socket.emit('get player items', {items});
            }).sort({ type: 1 }).skip((data.intVal - 1) * 12).limit(12);
        });

        socket.on('get player items by type', (data) => {
            Character_item.find({user_id: currentPlayer.id, type: data.stringVal}, function (err, items) {

                socket.emit('get player items', {items});
            }).sort({ type: 1 }).skip((data.intVal - 1) * 12).limit(12);
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
            console.log(data);
            Character_item.find({user_id: data.id, is_on: true}, function (err, items) {
                console.log(data.toString());
                socket.emit('get other player items', {username: data.name, items});
            })
        });

        socket.on('change item', (data) => {
            //console.log(data);
            console.log("Changing items");
            console.log(data.id);
            console.log(currentPlayer.id + " user id");
            Item.findOne({_id: data.id}, (err, item) => {
                if(item.is_premium && !currentPlayer.is_premium)
                {
                    let errObj = {
                        stringVal: "You are no longer Premium and cannot put this item on!"
                    };

                    socket.emit('show dialog', errObj);
                }
                else
                {
                    Character_item.findOne({user_id: currentPlayer.id, item_id: data.id}, (err, character_item) => {
                        let conditions = {user_id: currentPlayer.id, type: data.type}
                            , update = {$set: {is_on: false}}
                            , options = {multi: true};

                        Character_item.update(conditions, update, options, callback);

                        function callback(err, numAffected) {


                            character_item.is_on = true;
                            character_item.save().then(() => {
                                Character_item.find({user_id: currentPlayer.id, is_on: true}, function (err, items) {
                                    console.log("gg wp");
                                    let newObjItem = {
                                        _id: item._id,
                                        item_id: item._id,
                                        name: item.name,
                                        picture: item.picture,
                                        price: item.price,
                                        is_premium: item.is_premium,
                                        type: item.type,
                                        changeStatus: "changeToOn"
                                    };

                                    let newItem = {"item" : [newObjItem]};

                                    socket.to(currentPlayer.roomName).emit('change other player item', {  //get on other player items
                                        username: currentPlayer.name,
                                        newItem
                                    });

                                    socket.emit('change on item', newItem);
                                    //socket.emit('get on items', {items});
                                })
                            });
                        }
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

            let validateBuy = function () {
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
                                else
                                {
                                    if(item.is_premium && !currentPlayer.is_premium)
                                    {
                                        errors.push('You need to be Premium to buy this item!');
                                    }
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
                            stringVal: errors[0]
                        };

                        socket.emit('show dialog', errObj);
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
                            , update = {$set: {"character.fish": currentPlayer.fish}}
                            , options = {multi: true};

                        User.update(conditions, update, options, callback);


                        function callback(err, numAffected) {
                            console.log("bought item");

                            errors.push('Successfully bought ' + itemObj.name + '!');

                            let errObj = {
                                stringVal: errors[0]
                            };

                            socket.emit('show dialog', errObj);
                            socket.emit('update fish', {intVal: currentPlayer.fish});
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

            let requests = [checkHasItem, validateBuy, buyItem].reduce((promiseChain, item) => {
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
                            console.log({item});

                            let newObjItem = {
                                _id: item._id,
                                item_id: item._id,
                                name: item.name,
                                picture: item.picture,
                                price: item.price,
                                is_premium: item.is_premium,
                                type: item.type,
                                changeStatus: "changeToOff"
                            };

                            let newItem = {"item" : [newObjItem]};

                            socket.to(currentPlayer.roomName).emit('change other player item', {
                                username: currentPlayer.name,
                                newItem
                            });
                            socket.emit('change on item', {newItem});
                            //socket.emit('get on items', {items});
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
                "friends._id": data.stringVal

                //$in: {"friends" : {_id: data.stringVal}}
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

                            let requestObj = {
                                stringVal: "Your request has been sent successfully!"
                            };

                            socket.emit('show dialog', requestObj);

                        } else {
                            console.log("Your request hasn't been answered yet");
                            let request = {
                                stringVal: "Your request hasn't been answered yet"
                            };

                            socket.emit('show dialog', request);
                        }
                    });
                }
                else{
                    console.log("You're already friends...");
                    let request = {
                        stringVal: "You're already friends... dummy"
                    };

                    socket.emit('show dialog', request);
                }
            });
        });

        socket.on('remove friend', (data) => {
            console.log(data);

            User.findOneAndUpdate({_id: currentPlayer.id}, {/*"$pull": {friends : {_id : new mongoose.Types.ObjectId(data.stringVal)}}*/}, function(err, currentUser){
                if(currentUser) {

                    let result = currentUser.friends.filter(function( obj ) {
                        return obj._id == data.stringVal;
                    });
                    console.log(result[0].popularity);
                    //let index = currentUser.friends.map(function(e) { return e._id; }).indexOf(result[0]._id);
                    let index = currentUser.friends.findIndex(x => x._id === result[0]._id);
                    console.log("Index1:" + index);
                    console.log(result[0]._id)
                    currentUser.friends.splice(index, 1);
                    currentUser.character.popularity -= result[0].popularity;
                    currentUser.save();

                    socket.emit('update friend list', {});
                    getPopularity(currentPlayer.id);

                    let request = {
                        stringVal: "Successfully removed from your friend list"
                    };

                    socket.emit('show dialog', request);
                }
            });

            User.findOneAndUpdate({_id: data.stringVal} , {},/*{"$pull": {friends : {_id : new mongoose.Types.ObjectId(currentPlayer.id)}}},*/ function(err, user){
                if(user) {
                    let result2 = user.friends.filter(function( obj2 ) {
                        return obj2._id == currentPlayer.id.toString();
                    });
                    console.log(result2 + "GG WP");
                    let index = user.friends.findIndex(i => i._id == currentPlayer.id.toString());
                    console.log("Index2:" + index);
                    user.friends.splice(index, 1);
                    user.character.popularity -= result2[0].popularity;
                    user.save();

                    //OTHER PLayer
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

                            getPopularity(user._id, user.socketID);

                            console.log("gg wp");
                        }
                    }
                }
            });
        });

        socket.on('show friends', (data) => {
            console.log("SHOW FRIENDS");
            console.log(data.intVal);
            User.findOne({'_id': currentPlayer.id}, 'friends', (err, userFriends) => {
                let showFriends  = [];
                if(userFriends.friends.length > 0){
                    User.find({ _id: { $in: userFriends.friends}}, function (err, friends) {

                        friends.forEach((friend) => {
                            showFriends.push({'username' : friend.username, 'id' : friend._id, 'is_logged' : friend.is_logged, 'server' : friend.character.server});
                        });

                        socket.emit('show friends', {showFriends});
                    }).sort([['is_logged', -1], ['username', 1]]).skip((data.intVal - 1) * 10).limit(10)
                }
                else{
                    socket.emit('show friends', {showFriends});
                }
            })
        });

        socket.on('get friends count', () => {
            User.findOne({'_id': currentPlayer.id}, 'friends', (err, userFriends) => {
                let count = userFriends.friends.length;
                console.log(count)
                socket.emit('get friends count', {count})
            });


        });

        socket.on('show requests', (data) => {
            showRequests(false, null, null, data.intVal);
            console.log(data.intVal)
        });

        socket.on('get requests count', () => {
            Friend_request.find({'receiver_id': currentPlayer.id}, '_id', (err, requests) => {
                let count = requests.length;
                console.log("COUNT REQUESTS" + count)
                socket.emit('get requests count', {count})
            });


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
                if(request) {
                    if (data.acceptRequest) {
                        User.findById(request.receiver_id, (err, currentUser) => {
                            if (currentUser) {
                                User.findById(request.sender_id, (err, user) => {
                                    if (user) {
                                        let myPopularity = currentUser.character.popularity;
                                        let otherPopularity = user.character.popularity;

                                        let giveMePopularity = Math.ceil(otherPopularity / 10);
                                        let giveHimPopularity = Math.ceil(myPopularity / 10);

                                        let friendArr = {_id:mongoose.Types.ObjectId(request.sender_id), popularity: giveMePopularity};

                                        currentUser.friends.push(friendArr);
                                        currentUser.character.popularity += giveMePopularity;
                                        currentUser.save();

                                        socket.emit('update friend list', {});

                                        let itemObj = {
                                            stringVal: "Successfully added to your friend list!"
                                        };

                                        socket.emit('show dialog', itemObj);
                                        getPopularity(currentPlayer.id);

                                        ////OTHER USER
                                        let friendArr2 = {_id:mongoose.Types.ObjectId(request.receiver_id), popularity: giveHimPopularity};
                                        user.character.popularity += giveHimPopularity;
                                        user.friends.push(friendArr2);
                                        user.save();

                                        console.log("Give me:" + giveMePopularity);
                                        console.log("Give him:" + giveHimPopularity);

                                        if (user.is_logged === true && user.character.server === __serverName) {
                                            if (io.sockets.sockets[user.socketID]) {
                                                console.log("SQ 6 MU KAA NA TOA " + user.socketID);
                                                io.to(user.socketID).emit('update friend list', {});
                                                io.to(user.socketID).emit('handle friend', {
                                                    'playerId': currentPlayer.id,
                                                    'playerUsername': currentPlayer.name,
                                                    'addFriend': true
                                                });

                                                socket.emit('handle friend', {
                                                    'playerId': request.sender_id,
                                                    'playerUsername': request.sender_username,
                                                    'addFriend': true
                                                });

                                                getPopularity(request.sender_id, user.socketID);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
                else{
                    let itemObj = {
                        stringVal: "An error occurred!"
                    };

                    socket.emit('show dialog', itemObj);
                }
            })
        });

        socket.on('show character info', (data) => {
            console.log(data);

            User.findOne({'_id': data.stringVal}, (err, user) => {

                if(user){
                    var days =  (new Date().getTime() - new Date(user.date_reg).getTime()) / 1000 / 60 / 60 / 24;
                    days = Math.floor(days);
                    if(user.is_logged){
                        if(user.character.server == __serverName){

                            for(var propertyName in clients) {
                                clients[propertyName].forEach((value, index) => {
                                    if(value.name == user.username)
                                    {
                                        let dialogText = {
                                            stringVal: "This bear is " + days + " days old \nBear in " + propertyName
                                        };

                                        //TODO: Check if this player is playing any game, otherwise tell us his room

                                        socket.emit('show dialog', dialogText);

                                        return;
                                    }
                                })
                             }
                        }
                        else{
                            let dialogText = {
                                stringVal: "This Bear is " + days + " days old \nBear in server " + user.character.server
                            };

                            socket.emit('show dialog', dialogText);
                        }
                    }
                    else{
                        let dialogText = {
                            stringVal: "This Bear is " + days + " days old"
                        };

                        socket.emit('show dialog', dialogText);
                    }
                }
            })
        });

        socket.on('check premium code', (data) => {
            let Exp = /^[0-9a-zA-Z]+$/;
            if(data.stringVal.match(Exp))
            {
                data.stringVal = data.stringVal.toLowerCase();
                console.log(data.stringVal)
                Code.findOneAndRemove({'code': data.stringVal}, (err, code) => {
                    console.log(code);
                    if(code)
                    {
                        let premium_end = 0;
                        if(currentPlayer.premium_end < Math.floor(Date.now() / 1000))
                        {
                            premium_end = (Math.floor(Date.now() / 1000)) + (code.days * 24*60*60);
                        }
                        else
                        {
                            premium_end = currentPlayer.premium_end + (code.days * 24*60*60);
                        }

                        currentPlayer.premium_end = premium_end;
                        currentPlayer.is_premium = true;

                        let conditions = {_id: currentPlayer.id}
                            , update = {$set: {"character.premium_end": premium_end, "character.is_premium": true}}
                            , options = {multi: false};

                        User.update(conditions, update, options, callback);

                        function callback(err, numAffected) {
                        }


                        let monthNames = [
                            "January", "February", "March",
                            "April", "May", "June", "July",
                            "August", "September", "October",
                            "November", "December"
                        ];

                        let date_end = new Date(premium_end * 1000);
                        let monthIndex = date_end.getMonth();
                        let year = date_end.getFullYear();
                        let day = date_end.getDate();
                        let hours = date_end.getHours();
                        let minutes = date_end.getMinutes();

                        if(minutes < 10){
                            minutes = "0" + minutes
                        }

                        let codeObj = {
                            stringVal: "Yay! You successfully purchased premium! The end date is " + monthNames[monthIndex] + " " + day + " " + year + " " + hours + ":" + minutes
                        };

                        getPremiumInfo();
                        socket.emit('show dialog', codeObj);
                    }
                    else
                    {
                        let codeObj = {
                            stringVal: "Oops! Code invalid, please check it again!"
                        };

                        socket.emit('show dialog', codeObj);
                    }
                });
            }
        });

        socket.on('get premium info', () => {
            getPremiumInfo();
        });

        socket.on('premium purchase', (data) => {
            let days = data.days;
            generatePremiumCode(days);
        });

        socket.on('change ring', (data) => {
            let proceed = false;
            let bought = true;

           if(data.stringVal === 'popularity'){
                if(currentPlayer.popularity > 25){
                    proceed = true;
                    bought = false;
                }
           }else if(data.stringVal === 'premium')
           {
                if(currentPlayer.is_premium){
                    proceed = true;
                    bought = false;
                }
           }
           else if(data.stringVal === 'none'){
               proceed = true;
               bought = false;
           }
           else {
               proceed = true;
               bought = true;
           }


           if(proceed){
               if(bought){
                    Ring.findOne({user_id: currentPlayer.id, ring_name: data.stringVal}, function(err, myRing){
                        if(myRing){
                            currentPlayer.ring = data.stringVal;

                            User.findOneAndUpdate({_id: currentPlayer.id}, {$set:{'character.ring' : currentPlayer.ring}},function(err, doc){
                                if(doc){
                                    let objRing = {
                                        stringVal : currentPlayer.name,
                                        intVal : currentPlayer.popularity,
                                        stringVal2 : currentPlayer.ring
                                    };

                                    socket.to(currentPlayer.roomName).emit('change ring', objRing);
                                    socket.emit('change ring', objRing);
                                }
                            });
                        }
                    })
               }else{
                   currentPlayer.ring = data.stringVal;

                   User.findOneAndUpdate({_id: currentPlayer.id}, {$set:{'character.ring' : currentPlayer.ring}},function(err, doc){
                       if(doc){
                           let objRing = {
                               stringVal : currentPlayer.name,
                               intVal : currentPlayer.popularity,
                               stringVal2 : currentPlayer.ring
                           };

                           socket.to(currentPlayer.roomName).emit('change ring', objRing);
                           socket.emit('change ring', objRing);
                       }
                   });
               }
           }
        });

        socket.on('buy ring', (data) => {
           Ring_shop.findOne({_id: data.stringVal}, function(err, ringShop){
               if(ringShop){
                    Ring.findOne({ring_name: ringShop.ring_name, user_id: currentPlayer.id}, function(err2, myRing){
                        if(!myRing){
                            if((ringShop.is_premium && currentPlayer.is_premium) || !ringShop.is_premium) {
                                if (ringShop.price <= currentPlayer.fish) {
                                    let newRing = new Ring({
                                        user_id: currentPlayer.id,
                                        ring_type: ringShop.ring_type,
                                        ring_name: ringShop.ring_name
                                    });

                                    newRing.save((err, results) => {
                                        console.log("bought ring");

                                        currentPlayer.fish -= ringShop.price;

                                        let conditions = {_id: currentPlayer.id}
                                            , update = {$set: {"character.fish": currentPlayer.fish}}
                                            , options = {multi: false};

                                        User.update(conditions, update, options, callback);

                                        function callback(err, numAffected) {
                                            let itemObj = {
                                                stringVal: "You have successful bought " + ringShop.ring_name + " ring!"
                                            };

                                            socket.emit('show dialog', itemObj);
                                            socket.emit('update fish', {intVal: currentPlayer.fish});
                                        }
                                    })
                                } else {
                                    let itemObj = {
                                        stringVal: "You don't have enough fish"
                                    };

                                    socket.emit('show dialog', itemObj);
                                }
                            }
                            else{
                                let itemObj = {
                                    stringVal: "You need to be premium"
                                };

                                socket.emit('show dialog', itemObj);
                            }
                        }else{
                            let itemObj = {
                                stringVal: "You already have this ring"
                            };

                            socket.emit('show dialog', itemObj);
                        }
                    })
               }
               else{
                   let itemObj = {
                       stringVal: "Ring with this id does not exist"
                   };

                   socket.emit('show dialog', itemObj);
               }
           })
        });

        socket.on('get my rings', () => {
            Ring.find({user_id: currentPlayer.id}, function(err, myRings){
                if(myRings.length > 0){
                    socket.emit('get my rings', {myRings});
                }
            })
        });

        socket.on('disconnect', () => {
            //TODO: FIX THIS SHIT

            //TODO: remove server from USER.CHARACTER
            console.log(clients[currentPlayer.roomName]);
            console.log(currentPlayer.roomName);
            if (currentPlayer.roomName != "unknown" ) {
                console.log(currentPlayer.name + "recv: disconnected");
                socket.to(currentPlayer.roomName).emit('other player disconnected', currentPlayer);
                updateFriendsStatus();
                console.log(clients[currentPlayer.roomName]);
                console.log(clients);

                if(clients[currentPlayer.roomName] != undefined)
                {
                    for (let i = 0; i < clients[currentPlayer.roomName].length; i++) {
                        if (clients[currentPlayer.roomName][i].name === currentPlayer.name) {
                            clients[currentPlayer.roomName].splice(i, 1);
                        }
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

        function getPremiumInfo(){
            if(currentPlayer.is_premium)
            {
                let monthNames = [
                    "January", "February", "March",
                    "April", "May", "June", "July",
                    "August", "September", "October",
                    "November", "December"
                ];

                let date_end = new Date(currentPlayer.premium_end * 1000);
                let monthIndex = date_end.getMonth();
                let year = date_end.getFullYear();
                let day = date_end.getDate();
                let hours = date_end.getHours();
                let minutes = date_end.getMinutes();

                if(minutes < 10){
                    minutes = "0" + minutes
                }

                let infoObj = {
                    stringVal: "Your premium ends at \n" + monthNames[monthIndex] + " " + day + " " + year + " " + hours + ":" + minutes
                };

                socket.emit("get premium info", infoObj);
            }
        }

        function generatePremiumCode(days){
            let premiumCode = "";
            let possible = "abcdefghijklmnopqrstuvwxyz0123456789";

            for (let i = 0; i < 6; i++) {
                premiumCode += possible.charAt(Math.floor(Math.random() * possible.length));
            }

            Code.findOne({code: premiumCode}, (err, checkedCode) => {
                console.log(premiumCode);
                if(checkedCode){
                    generatePremiumCode();
                }
                else {
                    let newCode = new Code({
                     code: premiumCode,
                     days: days,
                     mail: 'admin@mail.bg' //insert papypal's mail
                     });

                     newCode.save((err, results) => {
                        console.log(results);
                     })

                }
            });
        }

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

        function showRequests(update_requests = false, user_id = null, socketID = null, page = 1){
            console.log("SHOW REQUESTS");
            if(user_id == null){
                user_id = currentPlayer.id;
            }

            Friend_request.find({'receiver_id': user_id}, (err, friendRequests) => {
                console.log(friendRequests.length);
                console.log(friendRequests);
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

                        User.update(conditions, update, options, callback2);
                        function callback2(err, numAffected) {
                        }
                    }
                }
            }).skip((page - 1) * 10).limit(10)
        }

        function getPopularity (id, socketId = null) {
            User.findById(id, (err, myUser) => {

                let popularity = myUser.character.popularity;

                if(id == currentPlayer.id){
                    socket.emit('get popularity', {intVal: popularity, stringVal: currentPlayer.name, stringVal2: currentPlayer.ring});

                    if(currentPlayer.roomName.indexOf("Room") > -1){
                        socket.to(currentPlayer.roomName).emit('get popularity', {intVal: popularity, stringVal: currentPlayer.name, stringVal2: currentPlayer.ring});
                    }
                }
                else if(socketId != null){
                    io.to(socketId).emit('get popularity', {intVal: popularity, stringVal: user.username, stringVal2: user.character.ring});
                }

            })
        }

        function loginUser(user_id){
            User.findOne({_id: user_id}, function (err, user) {
                //TODO: Check if this will still work without the above query

                let is_premium = true;
                if(user.character.premium_end <= Date.now() / 1000)
                {
                    is_premium = false;
                }

                let conditions = {_id: user._id}
                    , update = {$set: {is_logged: true, is_premium: is_premium, last_logged: Math.floor(Date.now() / 1000), "character.server" : __serverName, "socketID": socket.id}}
                    , options = {multi: false};

                User.update(conditions, update, options, callback);

                function callback(err, numAffected) {

                    //username = existingUser.username;
                    //user_id = existingUser.user_id;
                    //coins = character.coins;
                    currentPlayer.name = user.username;
                    currentPlayer.id = user._id;
                    currentPlayer.fish = user.character.fish;
                    currentPlayer.is_premium = user.character.is_premium;
                    currentPlayer.popularity = user.character.popularity;
                    currentPlayer.premium_end = user.character.premium_end;
                    currentPlayer.ring = user.character.ring;

                    updateFriendsStatus(); //Update our friends status

                    socket.emit('user logged', {});
                }

            });
        }
    });

    function resetUsers(){
        //User.update({_id: '59663a51a788d8034480f9ca' }, {$set: { is_logged: false }});
        //User.where({'usernameToLower': 'jamal' }).update({$set: { is_logged: false }});
        var conditions = { 'character.server' : __serverName }
            , update = { $set: { is_logged : false, 'character.server' : null }}
            , options = { multi: true };

        User.update(conditions, update, options, callback);

        function callback (err, numAffected) {
        }
    }
};