var http = require('http');
var express = require('express');
var Session = require('express-session');
var google = require('googleapis');
var mongoose = require('mongoose');
var plus = google.plus('v1');
var OAuth2 = google.auth.OAuth2;
var port = process.env.PORT || 8080;
const User = require('./models/user.js');
var configAuth = require('./config/auth');

var app = express();
//mongoose.connect('mongodb://localhost/googleDB'); // connect to our database
mongoose.connect('mongodb://rupank:4121996110249@ds137261.mlab.com:37261/heroku_w1fcg7kf'); // connect to our database
app.set('view engine', 'ejs'); // set up ejs for templating
app.use(Session({
  secret: 'rupankSecretKey',
  resave: true,
  saveUninitialized: true
}));

function getOAuthClient() {
  return new OAuth2(configAuth.googleAuth.clientID, configAuth.googleAuth.clientSecret, configAuth.googleAuth.callbackURL);
}

function getAuthUrl() {
  var oauth2Client = getOAuthClient();
  // generate a url that asks permissions for Google+ and Google Calendar scopes
  var scopes = [
    'profile', 'email'
  ];

  var url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes // If you only need one scope you can pass it as string
  });

  return url;
}

//------------------Using Async Await
async function getUserProfile(oauth2Client) {
  return new Promise(function (resolve, reject) {
    plus.people.get({
      userId: 'me',
      auth: oauth2Client
    }, function (err, response) {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  })
}

async function getUserDatabase(obj) {
  const response = await User.findOne({
    _id: obj.id
  });
  return response;
}

async function getAll(oauth2Client) {
  try {
    var data = await getUserProfile(oauth2Client);
    var user = await getUserDatabase(data);
    if (user) {
      console.log('User already exits in the database');
      // if a user is found, log them in
      return user;
    } else {
      console.log('Entering a new User into Database');
      var newUser = new User();

      // set all of the relevant information
      newUser._id = data.id;
      newUser.name = data.displayName;
      newUser.email = data.emails[0].value; // pull the first email
      newUser.img = data.image.url;

      const user = await newUser.save();
      console.log("User got inserted into database");
      console.log(user);
      return user;
    }
  } catch (err) {
    console.log(err);
  }

}

app.use("/oauthCallback", async function (req, res) {
  var oauth2Client = getOAuthClient();
  var session = req.session;
  var code = req.query.code;
  oauth2Client.getToken(code, async function (err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      oauth2Client.setCredentials(tokens);
      session["tokens"] = tokens;
      //console.log(tokens)

      var userData = await getAll(oauth2Client);
      console.log('User credentials are: ');
      console.log(userData);
      res.render('status.ejs');
    } //Login Successful
    else {
      res.send('Login Failed');
    }

  });
});

app.use("/profileDetails", async function (req, res) {
  var oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(req.session["tokens"]);

  var data = await getUserProfile(oauth2Client);
  res.render('profile.ejs', {
    data: data
  });


});

app.use("/", function (req, res) {
  var url = getAuthUrl();
  res.render('homePage.ejs', {
    url: url
  }); // load the homePage.ejs file
  res.end();
});

var server = http.createServer(app);
server.listen(port);
server.on('listening', function () {
  console.log(`listening to ${port}`);
});
