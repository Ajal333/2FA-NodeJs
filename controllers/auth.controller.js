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

    server.post('/login' , (req,res,next) => {
        passport.authenticate('local' , (err,user) => {
            if(err) {
                console.log('Login failed');
                console.log(err);
                return next(err);
            }
            if(!user) {
                console.log('Invalid username or password');
                return res.redirect('/login');
            }
            req.logIn(user,err => {
                if(err) {
                    console.log('Error while logging in!');
                    console.log(err);
                    return next(err);
                }
                console.log(`${user.name} has logged in!`);
                res.redirect('/user/'+user.name);
            })
        })
    })

    //Log-Out route
    server.get("/logout", (req, res) => {
        req.logout();
        console.log('User logged out!');
        res.redirect("/login");
    });

    //User Register Route
    server.get('/register',(req,res) => {
        res.render('register');
    });

    server.post('/register' , (req,res,next) => {
        let newUser = new User({
            name : req.body.name,
            email : req.body.mail,
            username : req.body.username,
            registeringToken : registeringTokenGenerator(),
        })
        User.register(newUser,req.body.password , (err,user) => {
            if(err) {
                if (err.name === 'UserExistsError') {
                    console.log("User already exits.");
                    return res.redirect("/register");
                }
                req.flash( "Something went wrong...");
                console.log("error", err);
                return res.redirect("/register");
            }
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'your_email_id@gmail.com',
                    pass: 'your_password'
                }
            });
            let mailOptions = {
                to: user.email,
                from: 'Your Company Name <your_email_id@gmail.com>',
                subject: 'Confirm Mail',
                text:`Hey, 
                The OTP for confirming your registration is ${registeringToken}.
                Click on the following link to enter your OTP : http://${req.headers.host}/confirm/${registeringToken}
                
                Thank you!`
            };
            smtpTransport.sendMail(mailOptions, err => {
                if (err) {
                    
                    console.log("Error in smtpTransport.sendMail()");
                    return next(err)
                }
                console.log('Email sent.');
                return next(null);
            });
        })
    })

    //Confirmation for registration
    server.get('/confirm/:token' ,(req,res,next) => {
        if(err) {
            console.log('Error during mail confirmation');
            return next(err);
        }
        User.findOne({registeringToken : req.params.token} , (err,user) => {
            if(err) {
                console.log('Error finding user with the OTP');
                return next(err);
            }
            if(!user) {
                console.log('The entered OTP is wrong');
                req.flash('error', 'Wrong OTP entered');
                return next();
            }
            passport.authenticate('local' , (err,user) => {
                console.log(user);
                if(err) {
                    console.log("Error Occured during authentication");
                    return next(err);
                }
                if(!user){
                    console.log('Cannot find user');
                    return res.redirect('/login')
                }
                req.logIn(user, err => {
                    if(err) {
                        return next(err);
                    }
                    return res.redirect('/profiles/'+user.username);
                })
            })

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
                        return followOn(null,toke,user);
                    })
                })
            },
            (token , user , followOn ) => {
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'your_email_id@gmail.com',
                        pass: 'your_password'
                    }
                });
                var mailOptions = {
                    to: user.email,
                    from: 'Your Company Name <your_email_id@gmail.com>',
                    subject: 'Password Reset',
                    text: `Hey,
                    The OTP to reset your password : ${registeringToken}.
                    Click on this link to enter your OTP : http://${req.headers.host}/reset/${registeringToken}
                   
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

    server.get('/forget/:token' ,(req,res) => {
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
                    if(req.body.password == req.body.confPassword) {
                        console.log('Password Matches');
                        user.setPassword(req.body.password, err => {
                            user.passwordResetToken = undefined;
                            user.resetPasswordExpires = undefined;
                        })
                        user.save(err => {
                            req.logIn(user, err => {
                                followOn(err,user);
                            })
                        })
                    }
                    else {
                        res.render('reset' , {token : req.params.token , message : 'Password Mismatch'})
                    }
                })
            },
            (user,followOn) => {
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail',
                    auth: {
                        user: 'your_mail@gmail.com',
                        pass: 'your_password'
                    }
                });
                var mailOptions = {
                    to: user.username,
                    from: '<CompanyName> your_mail@gmail.com',
                    subject: 'Password Change Successful.',
                    text: `Hey,
                    You have sucessfully changed your password ${user.username}.
                    Log-In : http://${req.headers.host}/login
                    
                    Thank You.`
                };
                smtpTransport.sendMail(mailOptions, function (err) {
                    req.flash('success', 'Success! Your password has been changed.');
                    done(err);
                });
            }
        ],err => {
            res.redirect('/login');
        })
    })
}



