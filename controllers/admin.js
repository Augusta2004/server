const User = require('mongoose').model('User');

module.exports = {
    panel: (req, res) => {
        res.render('admin/panel', { title: 'Admin Panel' });
    },
    userList: (req, res) => {
        User.find({}).then(user => {
            res.render('admin/user/list', { title: 'Users', users: user });
        });
    },
};