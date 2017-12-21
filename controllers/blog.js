const Article = require('mongoose').model('Article');

module.exports = {
    index: (req, res) => {
        let page = req.query.page;
        Article.paginate({}, { page: page, limit: 5, sort: '-dateAdded', populate: 'author' }, (err, result) => {
            //   console.log(result.pages);
            result.docs.map(e => e.date = `${e.dateAdded.getDate()}/${e.dateAdded.getMonth() + 1}/${e.dateAdded.getFullYear()}`);

            let pages = [];
            for (let i = 1; i <= result.pages; i++) {
                pages.push(i);
            }

            let articles = result.docs;
            for(let article of articles){
                article.content = article.content.substring(0,125);
            }

            res.render('blog/blog', { title: 'Polar Adventures', articles: articles, pages: pages });
        });
    },
};