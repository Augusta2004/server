const mongoose = require('mongoose');

let characterSchema = mongoose.Schema({
    user_id: Number,
    fish: Number
});

const Character = mongoose.model('Character', characterSchema);
module.exports = Character;