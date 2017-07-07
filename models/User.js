const mongoose = require('mongoose');

let userSchema = mongoose.Schema({
    user_id: Number,
    username: String,
    password: String,
    mail: String,
    sendMail: Boolean,
    date_reg: Number,
    is_logged: Boolean,
    last_logged: Number
});

const User = mongoose.model('User', userSchema);
module.exports = User;