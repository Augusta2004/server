const mongoose = require('mongoose');

let itemSchema = mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    username: String,
    item_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Item' },
    name: String,
    picture: String,
    type: String,
    is_on: Boolean
});

const Item = mongoose.model('Character_item', itemSchema);
module.exports = Item;