const mongoose = require('mongoose');

let codeSchema = mongoose.Schema({
    code: {type: String, required: true, unique: true},
    days: {type: Number, required: true},
    mail: { type: String, required: true, unique: true },
    date_reg: { type: Date, default: Date.now() }
});

const Code = mongoose.model('Code', codeSchema);
module.exports = Code;