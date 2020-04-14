const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const passport = require('passport');
const localStrategy = require('passport-local');
const passportLocalMongoose = require('passport-local-mongoose');
const bodyParser = require("body-parser");
const flash = require("connect-flash");
const expressSession = require("express-session");
const authController  = require('./controllers/auth.controller');

//Creating server
const server = express();

//Setting view engine
server.set("view engine","ejs");

//Connecting to the database
mongoose.connect("mongodb://localhost/test");

//Using resources
server.use(expressSession({
    secret: "Polisaanam",
    resave: false,
    saveUninitialized: false
}));

server.use(bodyParser.urlencoded({extended : false}));
server.use(bodyParser.json());
server.use(passport.initialize());
server.use(passport.session());
server.use(flash());

//Setting up Passport 
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


authController(server);

server.get('/' , (req,res) => {
    res.render('home')
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => console.log(`Listening to PORT: ${PORT}`));
