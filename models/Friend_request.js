const mongoose = require('mongoose');

let friendRequestSchema = mongoose.Schema({
    sender_username: {type: String, required: true},
    sender_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }
});

const Friend_request = mongoose.model('Friend_request', friendRequestSchema);
module.exports = Friend_request;