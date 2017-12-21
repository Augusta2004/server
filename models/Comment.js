const mongoose = require('mongoose');

let commentSchema = mongoose.Schema({
    dateAdded: { type: Date, default: Date.now() },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' }
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;