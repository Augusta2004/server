const homeController = require('./../controllers/home');


module.exports = (app) => {
    app.get('/', homeController.index);

    app.use((req, res, next) => {
        if(req.isAuthenticated()) {
            req.user.isInRole('Admin').then(isAdmin => {
                if (isAdmin) {
                    next();
                } else {
                    res.redirect('/');
                }
            })
        } else {
            res.redirect('/user/login');
        }
    });

    //admin things

};
