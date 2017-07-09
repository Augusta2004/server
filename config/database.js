const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = (config) => {
    mongoose.connect(config.connectionString);

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
    require('./../models/character/Character');
    require('./../models/Item');
    require('./../models/character/Character_item');
    require('./../models/Counter');
    require('./../models/Article');


};