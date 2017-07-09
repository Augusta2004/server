const mongoose = require('mongoose');
let User = mongoose.model('User');

let articleSchema = mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    dateAdded: { type: Date, default: Date.now() },
});

articleSchema.method({
    prepareInsert: function () {
        User.findById(this.author).then(user => {
            if (user) {
                user.posts.push(this.id);
                user.save();
            }
        });
    },

    prepareDelete: function () {
        User.findById(this.author.id).then(user => {
            if (user) {
                user.posts.remove(this.id);
                user.save();
            }
        });
    }
});

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;