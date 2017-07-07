const mongoose = require('mongoose');

let counterSchema = mongoose.Schema({
    user_id: Number,
    item_id: Number
});

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;