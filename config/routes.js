const homeController = require('./../controllers/home');
const aboutController = require('./../controllers/about');
const userController = require('./../controllers/user');
const adminController = require('./../controllers/admin');
const articleController = require('./../controllers/article');
const gameController = require('./../controllers/game');
const premiumController = require('./../controllers/premium');
const blogController = require('../controllers/blog');
//const itemController = require('./../controllers/item');

module.exports = (app) => {
    app.get('/', homeController.index);
    // app.get('/page/:id', homeController.page);
    app.get('/about', aboutController.aboutGet);

    app.get('/blog', blogController.index);
    app.get('/article', articleController.articleGet);

    app.get('/user/register', userController.registerGet);
    app.post('/user/register', userController.registerPost);

    app.get('/user/login', userController.loginGet);
    app.post('/user/login', userController.loginPost);
    app.get('/user/logout', userController.logout);

    app.get('/user/profile/:id', userController.profile);

    app.get('/play', gameController.game);
    app.get('/premium', premiumController.premium);

    app.use((req, res, next) => {

        if (req.isAuthenticated()) {
            req.user.isInRole('Admin').then(isAdmin => {
                if (isAdmin) {
                    next();
                } else {
                    res.redirect('/');
                }
            });
        } else {
            res.redirect('/user/login');
        }
    });

    //admin things

    app.get('/admin', adminController.panel);
    app.get('/admin/user/list', adminController.userList);


    app.get('/admin/article/new', articleController.newArticleGet);
    app.post('/admin/article/new', articleController.newArticlePost);

    //    app.get('/admin/item/new',itemController.newItemGet);
    //    app.post('/admin/item/new',itemController.newItemPost);

};
