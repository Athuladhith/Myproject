var createError = require('http-errors');
var express = require('express');
var path = require('path');
const hbs = require("hbs")
var cookieParser = require('cookie-parser');
var logger = require('morgan');




var adminRouter = require('./routes/adminRoute');
var usersRouter = require('./routes/userRoute');
var db= require('./config/connection')
var app = express();


const handlebars = require('handlebars');

handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

hbs.registerPartials(__dirname + '/views/partial',);


hbs.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
});

hbs.registerHelper('ifnoteq', function (a, b, options) {
    if (a != b) { return options.fn(this); }
    return options.inverse(this);
});



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');


app.use(function(req, res, next) { 
  res.header('Cache-Control', 'no-cache, no-store');
  next();
});




app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', usersRouter);
app.use('/admin',adminRouter );

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.status(404).render('error', { message: '404 Not Found', error: {} });
});





//HELPERS
hbs.registerHelper("calcTotal", function (quantity, price) {
  return "" + quantity * price;
});

hbs.registerHelper("eq", function (a, b) {
  return a === b;
});


hbs.registerHelper("or", function (x,y) {
  return x || y;
})


hbs.registerHelper('formatDate', function(date, format) {
  const options = {
   
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kolkata'
  };
  const formattedDate = new Date(date).toLocaleString('en-US', options);
  return formattedDate;
});




hbs.registerHelper('slice', function(context, start, end) {
return context.slice(start, end);
});


hbs.registerHelper('each_from_three', function(context, options) {
var ret = "";
for(var i=0; i<3 && i<context.length; i++) {
    ret += options.fn(context[i]);
}
return ret;
});

hbs.registerHelper('eq', function (a, b) {
return a === b;
});

hbs.registerHelper('checkStock', function(stock, options) {
if (stock <= 5) {
  return options.fn(this);
} else {
  return options.inverse(this);
}
});

hbs.registerHelper('ifCond', function(v1, v2, options) {
if (v1 === v2) {
  return options.fn(this);
}
return options.inverse(this);
});



//error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});




module.exports = app;
