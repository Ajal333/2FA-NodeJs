const User = require('../models/user.model');
const passport = require('passport');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const registeringTokenGenerator = () => {
    return Math.floor(100000 + Math.random() * 900000)
}

module.exports = server => {

    //Log-In route
    server.get('/login' ,(req,res) => {
        res.render('login');
    });

   
    server.post("/login",  (req, res, next) => {
        passport.authenticate("local", (err, user) => {
            if (err) {
                console.log("POST /login passport.authenticate()");
                console.log(err)
                req.flash("error", err.message);
                return next(err);
            }
            if (!user.isActive) {
                req.flash("error", "Invalid username or password");
                return res.redirect('/login');
            }
            req.logIn(user, err => {
                if (err) {
                    console.log("POST /login req.logIN()");
                    console.log(err)
                    req.flash("error", err.message);
                    return next(err);
                }
                console.log(user.username + " Logged in.");
                req.flash("success", "Good to see you again, " + user.username);
               res.send('User Log-In sucessfull')
            });
        })(req, res, next);
    });


    //Log-Out route
    server.get("/logout", (req, res) => {
        req.logout();
        console.log('User logged out!');
        res.redirect("/login");
    });

    //User Register Route
    server.get('/register',(req,res) => {
        res.render('signup');
    });

    server.post('/register' , (req,res,next) => {
        let token = registeringTokenGenerator();
        let user = new User({
            name : req.body.name,
            email : req.body.mail,
            username : req.body.username,
            registeringToken : token,
        })

        if(req.body.password ==req.body.confpassword) {
            console.log('Password Matching');
            User.register(user,req.body.password , (err,user) => {
                if(err) {
                    if (err.name === 'UserExistsError') {
                        console.log("User already exits.");
                        return res.redirect("/register");
                    }
                    req.flash( "Something went wrong...");
                    console.log("error", err);
                    return res.redirect("/register");
                }
            passport.authenticate("local" , (err,user) => {
                console.log(user);
                if(err) {
                    console.log("Error Occured during authentication");
                    return next(err);
                }
                if(!user){
                    console.log('Cannot find user');
                    return res.redirect('/login')
                }
            })(req, res, next);
        })  
                let smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'visitthestars0010@gmail.com',
                        pass: 'pass@882836'
                    }
                });
                let mailOptions = {
                    to: req.body.mail,
                    from: 'e-Xhibyte<visitthestars0010@gmail.com>',
                    subject: 'Confirm Mail',
                    text:`Hey, 
                    The OTP for confirming your registration is ${token}.
                    Click on the following link to enter your OTP : http://${req.headers.host}/confirm/${token}
                    
                    Thank you!`
                };
                smtpTransport.sendMail(mailOptions, err => {
                    if (err) {
                        
                        console.log("Error in smtpTransport.sendMail()");
                        return next(err)
                    }
                    console.log(`Email sent to ${req.body.name}`);
                    return res.redirect('/login');
                });
        }
      
    })

    //Confirmation for registration
    server.get('/confirm/:token' ,(req,res,next) => {
        User.findOneAndUpdate({registeringToken : req.params.token},{isActive : true} , err => {
            if(err) {
                console.log('Error finding user with the OTP');
                return next(err);
            }
            res.send('Account creation successful.')
            console.log('Account Created Sucessfully');
            
        })
    })

    server.get('/forget' , (req,res) => {
        res.render('forget');
    })

    server.post('/forget' ,(req,res) => {
        async.waterfall([
            followOn => {
                let token = registeringTokenGenerator();
                return followOn(null,token);
            },
            (token,followOn) => {
                User.findOne({email : req.body.email } ,(err,user) => {
                    if(err) {
                        console.log('User with the given mail does not exist');
                        return followOn(err);
                    }
                    if(!user) {
                        console.log('No account exist');
                        return followOn(err);
                    }
                    console.log(token);
                    user.passwordResetToken = token;
                    user.resetPasswordExpires = Date.now() + 360000;

                    user.save(err => {
                        if(err) {
                            console.log('Error occured during password reset');
                            return followOn(err);
                        }
                        return followOn(null,token,user);
                    })
                })
            },
            (token , user , followOn ) => {
                let smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'visitthestars0010@gmail.com',
                        pass: 'pass@882836'
                    }
                });
                let mailOptions = {
                    to: user.email,
                    from: 'e-Xhibyte <visitthestars0010@gmail.com>',
                    subject: 'Password Reset',
                    text: `Hey,
                    The OTP to reset your password : ${token}.
                    Click on this link to enter your OTP : http://${req.headers.host}/reset/${token}
                   
                    Thank you! `
                };
                smtpTransport.sendMail(mailOptions, function (err) {
                    if (err) {
                        err.flash = "Error sending e-mail";
                        console.log("Error in smtpTransport.sendMail()");
                        return followOn(err)
                    }
                    console.log('Email sent.');
                    return followOn(null);
                });
            }
        ], err => {
            if(err) {
                console.log(err);
                req.flash('errror' , 'Error Occured');
                return res.redirect('/forget');
            }
            req.flash('success' , "An OTP has been sent to your mail.")
            res.redirect('/forget');
        })
    })

    server.get('/reset/:token' ,(req,res) => {
        User.findOne({ passwordResetToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } },  (err, user) => {
            if (err) {
                return console.log(err);
            }
            if (!user) {
                console.log('error', 'The OTP has expired');
                res.render('reset', { token: req.params.token, message: 'The OTP has expired' });
            }
            else {
                res.render('reset', { token: req.params.token, message: false });
            }
        });
    })

    server.post('/reset/:token' ,(req,res) => {
        async.waterfall([
            followOn => {
                User.findOne({passwordResetToken : req.params.token, resetPasswordExpires: {$gt : Date.now() }} , (err,user) => {
                    if(!user) {
                        console.log('OTP is incorrect');
                        res.render('reset',{message : 'The OTP is wrong or has expired'})
                    }
                    if(req.body.password == req.body.confpassword) {
                        console.log('Password Matches');
                        user.setPassword(req.body.password, err => {
                            console.log('Password Changed');
                            
                            user.passwordResetToken = undefined;
                            user.resetPasswordExpires = undefined;
                        
                        user.save(err => {
                            req.logIn(user, err => {
                                console.log('evadethi');
                                
                                followOn(err,user);
                            })
                        })
                    })
                    }
                    else {
                        res.render('reset' , {token : req.params.token , message : 'Password Mismatch'})
                    }
                })
            },  
            (user,followOn) => {
                let smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'visitthestars0010@gmail.com',
                        pass: 'pass@882836'
                    }
                });
                let mailOptions = {
                    to: user.email,
                    from: 'e-Xhibyte <visitthestars0010@gmail.com>',
                    subject: 'Password Change Successful.',
                    text: `Hey,
                    You have sucessfully changed your password ${user.username}.
                    Log-In : http://${req.headers.host}/login
                    
                    Thank You.`
                };
                smtpTransport.sendMail(mailOptions, function (err) {
                    if(err) {console.log(err);
                    }
                    req.flash('success', 'Success! Your password has been changed.');
                    console.log('Mail sucessfully sent');
                    followOn(err);
                });
            }
        ],err => {
            res.redirect('/login');
        })
    })
}

