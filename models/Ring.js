const mongoose = require('mongoose');

let ringSchema = mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    ring_type: { type: String, required: true},
    ring_name: {type: String, required: true}
});

const Ring = mongoose.model('Ring', ringSchema);
module.exports = Ring;