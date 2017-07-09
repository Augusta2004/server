const path = require('path');

module.exports = {
    development: {
        rootFolder: path.normalize(path.join(__dirname, '/../')),
        connectionString: 'mongodb://localhost:27017/game'
    },
    production:{
        rootFolder: path.normalize(path.join(__dirname, '/../')),
        connectionString: 'mongodb://162.249.6.165:27017/game'
    }
};
