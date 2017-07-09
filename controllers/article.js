const Article = require('mongoose').model('Article');

module.exports = {
    newArticleGet: (req, res) => {
        res.render('admin/article/new', { title: 'New Article' });
    },
    newArticlePost: (req, res) => {
        let newArticleArgs = req.body;
        

        let errMsg = '';

        if (!req.isAuthenticated()) {
            errMsg = 'Please Login';
        }
        else if (!newArticleArgs.title) {
            errMsg = 'Please enter title!';
        }
        else if (!newArticleArgs.content) {
            errMsg = 'Please enter content!';
        }

        if (errMsg) {
            newArticleArgs.error = errMsg;
            res.render('admin/article/new', newArticleArgs);
            return;
        }

        newArticleArgs.author = req.user.id;

        Article.create(newArticleArgs).then(article => {
            article.prepareInsert();
            req.user.articles.push(article.id);
            req.user.save(err => {
                if (err) {
                    res.redirect('/', { error: errMsg });
                }
                else {
                    res.redirect('/');
                }
            });
        });
    }
};