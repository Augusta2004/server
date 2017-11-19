const mongoose = require('mongoose');

let codeSchema = mongoose.Schema({
    code: {type: String, required: true, unique: true},
    days: {type: Number, required: true}
});

const Code = mongoose.model('Code', codeSchema);
module.exports = Code;