const mongoose = require('mongoose');

let ringShopSchema = mongoose.Schema({
    ring_type: { type: String, required: true},
    ring_name: { type: String, required: true},
    is_premium: {type: Boolean, default: false},
    price: {type: Number, required: true}
});

const Ring_shop = mongoose.model('Ring_shop', ringShopSchema);
module.exports = Ring_shop;