const Article = require('mongoose').model('Article');

module.exports = {
    index: (req, res) => {
        // Article.find({}).sort('-dateAdded').limit(5).populate('author').then(article => {
        //     article.map(e => e.date = `${e.dateAdded.getDate()}/${e.dateAdded.getMonth() + 1}/${e.dateAdded.getFullYear()}`);
        //     res.render('home/index', { title: 'Polar Adventures', articles: article });
        // });

        Article.paginate({}, { page: 1, limit: 5, sort: '-dateAdded', populate: 'author' }, (err, result) => {
            result.docs.map(e => e.date = `${e.dateAdded.getDate()}/${e.dateAdded.getMonth() + 1}/${e.dateAdded.getFullYear()}`);

            let pages = [];
            for (let i = 1; i <= result.pages; i++) {
                pages.push(i);
            }

            res.render('home/index', { title: 'Polar Adventures', articles: result.docs, pages: pages });
        });
    },
    page: (req, res) => {
        let page = req.params.id;
        Article.paginate({}, { page: page, limit: 5, sort: '-dateAdded', populate: 'author' }, (err, result) => {
            //   console.log(result.pages);
            result.docs.map(e => e.date = `${e.dateAdded.getDate()}/${e.dateAdded.getMonth() + 1}/${e.dateAdded.getFullYear()}`);

            let pages = [];
            for (let i = 1; i <= result.pages; i++) {
                pages.push(i);
            }

            res.render('home/index', { title: 'Polar Adventures', articles: result.docs, pages: pages });
        });
    }

};