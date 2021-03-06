const mongoose = require('mongoose');

let itemSchema = mongoose.Schema({
    name: String,
    picture: String,
    price: Number,
    is_premium: Boolean,
    type: String
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;