const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

module.exports = (config) => {

    //mongoose.connect(config.connectionString,
    //{user: 'bobonikstambe', pass: 'IgrA1anI3velikA0*(%', auth:{authdb:"admin"}});


    if (config.env === 'production') {
        const fs = require('fs');

        let key = fs.readFileSync('/var/server/polar/keys/polar-adventures_com.pem');
        let ca = [fs.readFileSync('/var/server/polar/keys/ca.pem')];

        let o = {
            server: {
                sslValidate: true,
                sslCA: ca,
                sslKey: key,
                sslCert: key
            }
        };
        mongoose.connect(config.connectionString, o);
    } else {
        mongoose.connect(config.connectionString);
    }





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
    require('./../models/Code');
    require('./../models/Ring');
    require('./../models/Ring_shop');
};