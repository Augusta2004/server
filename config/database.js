const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = (config) => {

    //mongoose.connect(config.connectionString,
     //{user: 'bobonikstambe', pass: 'IgrA1anI3velikA0*(%', auth:{authdb:"admin"}});

    mongoose.connect(config.connectionString,{user: 'bobonikstambe', pass: 'IgrA1anI3velikA0*(%', auth:{authdb:"admin"}});


    let database = mongoose.connection;
    database.once('open', (error) => {
        if (error) {
            console.log(error);
            return;
        }

        console.log('MongoDB ready!')
    });

    require('./../models/Role').initialize();
    require('./../models/User');
    require('./../models/Item');
    require('./../models/character/Character_item');
    require('./../models/Article');
    require('./../models/Friend_request');

};