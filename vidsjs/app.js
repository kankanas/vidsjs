﻿var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);
var routes = require('./routes/index');
var users = require('./routes/users');
var login = require('./routes/login');
var missingSettings = require('./routes/missingsettings');
var setupRoute = require('./routes/setup');
var view = require('./routes/view');
var setup = require('./modules/setup');
var app = express();
var connect = require('connect');
var db = require('./models');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//TODO: REMOVE ON PRODUCTION
//app.disable('etag');
// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
//Session
app.use(session({
    name: "VidsJS Session",
    secret: "sYS52f0LiGJqjcnrwqa9FV3iVPP9HszmapcQOASBwoTbSRIMIexnW6PX5VQV",
    saveUninitialized: true,
    resave: true,
    store: new SequelizeStore({db: db.sequelize})
}));

app.all('*', setup.checkSetup);
app.all('*', setup.checkLogin);

app.use('/', routes);
app.use('/users', users);
app.use('/login', login);
app.use('/missingsettings', missingSettings);
app.use('/setup', setupRoute);
app.use('/view', view);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});



// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.locals.pretty = true;
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        console.log(err.message);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
