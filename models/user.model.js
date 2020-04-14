const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

let userSchema = mongoose.Schema({
    name : { type : String },
    username : { type : String },
    email : { type : String },
    password : { type : String },
    isAdmin : { type : Boolean , default : false },
    registeringToken : { type : Number },
    isActive : {type : Boolean , default : false },
    passwordResetToken : { type : String },
    resetPasswordExpires : { type : Date },
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User',userSchema);