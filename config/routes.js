const homeController = require('./../controllers/home');
const aboutController = require('./../controllers/about');
const userController = require('./../controllers/user');
const adminController = require('./../controllers/admin');
const articleController = require('./../controllers/article');
const gameController = require('./../controllers/game');

module.exports = (app) => {
    app.get('/', homeController.index);
    app.get('/about', aboutController.aboutGet);

    app.get('/user/register', userController.registerGet);
    app.post('/user/register', userController.registerPost);

    app.get('/user/login', userController.loginGet);
    app.post('/user/login', userController.loginPost);
    app.get('/user/logout', userController.logout);

    app.get('/play',gameController.game);

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
    app.get('/admin/user/list',adminController.userList);


    app.get('/admin/article/new',articleController.newArticleGet);
    app.post('/admin/article/new',articleController.newArticlePost);

};
