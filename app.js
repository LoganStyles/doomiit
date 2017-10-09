var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var request = require('request');
var exphbs = require('express-handlebars');
var mongoose = require('mongoose');
var credentials = require('./config/credentials');
var user = require('./models/user');


var passport = require('passport'), 
    TwitterStrategy = require('passport-twitter').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy;


passport.use(new FacebookStrategy({
    clientID: credentials.facebook.app_id,
    clientSecret: credentials.facebook.app_secret,
    callbackURL: credentials.facebook.callback,
    profileFields:['id','displayName','emails','name','gender']
    }, function(accessToken, refreshToken, profile, done) {
        //console.log('passport before profile')
        console.log(profile);
        var me = new user({
            email:profile.emails[0].value,
            name:profile.displayName
        });

        /* save if new */
        user.findOne({email:me.email}, function(err, u) {
            if(!u) {
                console.log('!u findOne in save')
                me.save(function(err, me) {
                    if(err) return done(err);
                    done(null,me);
                });
            } else {
                console.log('else of findOne in save')
                console.log(u);
                done(null, u);
            }
        });
  }
));

passport.serializeUser(function(user, done) {
    console.log(user);
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    user.findById(id, function(err, user) {
        done(err, user);
    });
});


var app = express();
//all middlewares
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave:false,
    saveUninitialized:false,
    secret:credentials.cookieSecret
}));

app.use(passport.initialize());
app.use(passport.session());

var members = require('./routes/members');

//Body Parser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//Set Static Path
app.use(express.static(path.join(__dirname,'public')));

//View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('html', exphbs({
	//defaultLayout: 'main.html' //Default templating page
	partialsDir: __dirname + '/views/partials/',
	helpers: {
		json: function(obj) {
			return JSON.stringify(obj);
		}
	}
}));
app.set('view engine', 'html');

var mongoose = require('mongoose');
var opts = {
    server: {
        socketOptions: { keepAlive: 1 }
    }
};

// switch(app.get('env')) {
//     case 'development':
//         mongoose.connect(credentials.mongo.development.connectionString, opts);
//         break;
//     case 'production':
//         mongoose.connect(credentials.mongo.production.connectionString, opts);
//         break;
//     default:
//         throw new error('Unknown execution environment: ', app.get('env'));
// }

function isLoggedIn(req, res, next) {
    req.loggedIn = !!req.user;
    next();
}

app.get('/', isLoggedIn, function(req, res) {
    res.render('index', {
        loggedIn:req.loggedIn
    });
});

app.get('/dashboard', isLoggedIn, function(req, res) {
    res.render('dashboard', {
        loggedIn:req.loggedIn
    });
});

app.get('/auth/facebook', passport.authenticate('facebook', {scope:"email"}));
app.get('/auth/facebook/callback', passport.authenticate('facebook', 
{ successRedirect: '/dashboard', failureRedirect: '/login' }));

app.get('/login', isLoggedIn, function(req, res) {
    if(req.loggedIn) res.redirect('/');
    console.log(req.loggedIn);
    res.render('login', {
        title:'Login/Registration'
    });
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500);
    res.render('error');
});

app.use('/members',members);

app.get('*', function(req, res){
	res.render('404', {});
});

app.listen(process.env.PORT || 3000,function(){
console.log('Server started on port '+process.env.PORT);
});