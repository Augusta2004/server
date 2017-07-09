const Article = require('mongoose').model('Article');

module.exports = {
    index: (req, res) => {
        Article.find({}).sort('-dateAdded').populate('author').then(article => {
            article.map(e => e.date = `${e.dateAdded.getDate()}/${e.dateAdded.getMonth() + 1}/${e.dateAdded.getFullYear()}`);
            res.render('home/index', { title: 'Polar Adventures', articles: article});
        });
    },
};