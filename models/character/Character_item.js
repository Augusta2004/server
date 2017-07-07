const mongoose = require('mongoose');

let itemSchema = mongoose.Schema({
    user_id: Number,
    username: String,
    item_id: Number,
    name: String,
    picture: String,
    type: String,
    is_on: Boolean
});

const Item = mongoose.model('Character_item', itemSchema);
module.exports = Item;