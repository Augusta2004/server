const mongoose = require('mongoose');
const Role = mongoose.model('Role');
const encryption = require('./../config/encryption');

let userSchema = mongoose.Schema({
    username: { type: String },
    password: { type: String, required: true },
    mail: { type: String, required: true, unique: true },
    sendMail: { type: Boolean },
    date_reg: { type: Date, default: Date.now() },
    is_logged: { type: Boolean,default:false },
    last_logged: { type: Number},
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    banned: { type: Boolean },
    salt: { type: String, required: true },
    articles: { type: [mongoose.Schema.Types.ObjectId], ref: 'Article' },

    character: {
        fish: { type: Number, default:150 }
    }
});

userSchema.method({
    authenticate: function (pass) {
        let inputPasswordHash = encryption.hashPassword(pass, this.salt);
        let isSamePasswordHash = inputPasswordHash === this.password;
        return isSamePasswordHash;
    },

    isInRole: function (roleName) {
        return Role.findOne({ name: roleName }).then(role => {
            if (!role) {
                return false;
            }

            let isInRole = this.roles.indexOf(role.id) !== -1;
            return isInRole;
        })
    },

    isBanned: function () {
        if (!this.banned) {
            return false;
        }

        return true;
    },

});



userSchema.set('versionKey', false);
const User = mongoose.model('User', userSchema);
module.exports = User;


module.exports.seedAdmin = () => {
    let email = 'admin@polar-adventures.com';
    User.findOne({ email: email }).then(admin => {
        if (!admin) {
            Role.findOne({ name: 'Admin' }).then(role => {
                let salt = encryption.generateSalt();
                let passwordHash = encryption.hashPassword('admin', salt);

                let roles = [];
                roles.push(role.id);

                let user = {
                    email: email,
                    passwordHash: passwordHash,
                    fullName: 'Admin',
                    salt: salt,
                    roles: roles
                };

                User.create(user).then(user => {
                    role.users.push(user.id);
                    role.save(err => {
                        if (err) {
                            console.log(err.message);
                        } else {
                            console.log('Admin seeded successfully!')
                        }
                    });
                })
            })
        }
    })
};