const express = require('express');
const config = require('./config/config');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(express.static(__dirname + '/uploads/'));
app.use(bodyParser.json());

app.use("/Assets", express.static(path.join(__dirname, 'public')));

let env = 'development';
require('./config/database')(config[env]);
require('./config/express')(app, config[env]);
require('./config/passport')();
require('./config/routes')(app);

module.exports = app;