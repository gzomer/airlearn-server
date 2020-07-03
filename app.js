const express = require('express')
const app = express()
const port = 3030
const swig = require('swig')
const cors = require('cors')
const passport = require('passport');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ensureLogin = require('connect-ensure-login')
const session = require('express-session')
const DB = require('./db.js')
const routes = require('./routes.js')
const fileUpload = require('express-fileupload');
const RedisStore = require('connect-redis')(session);
const redis = require('redis')
const redisClient = redis.createClient({
    host: '127.0.0.1',
    port: 6379,
    prefix: 'lms_',
})

const LMS = require('./services/lms')

mongoose.connect('mongodb://localhost:27017/lms', { useNewUrlParser: true, useUnifiedTopology: true });

const expressSession = session({
  secret: 'YVYivrs8n4',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 3600*24*30*1000},
  key:'connect.sid',
  //store: new RedisStore(redisClient)
});

passport.use(DB.models.User.createStrategy());

passport.serializeUser(DB.models.User.serializeUser());
passport.deserializeUser(DB.models.User.deserializeUser());

app.use(expressSession);
app.use(passport.initialize());
app.use(passport.session());

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(fileUpload());

app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static('public'))

const DEFAULT_URL_AFTER_LOGIN = '/courses'

app.use(function(req, res, next) {
  if (req.subdomains && req.subdomains.length) {
    req.schoolDomain = req.subdomains[0]
  }
  next()
})

app.get('/', function(req, res) {
	if (req.user) {
		res.redirect(DEFAULT_URL_AFTER_LOGIN)
	} else {
		res.redirect('/login')
	}
})

function loginUser(req, res, next, user) {
	req.logIn(user, function(err) {
      if (err) {
        return next(err);
      }

      return res.redirect(DEFAULT_URL_AFTER_LOGIN);
    });
}

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/login', wrapAsync(async (req, res) => {
  let lms = await new LMS(req.schoolDomain).init()
  res.render('login', {
    school: lms.school
  })
}))

app.post('/login', (req, res, next) => {
  passport.authenticate('local',
  (err, user, info) => {

    if (err) {
      return next(err);
    }

    if (!user) {
      return res.redirect('/login');
    }

    loginUser(req, res, next, user);
  },{ failureRedirect: '/login' })(req, res, next);
});


app.get('/register', wrapAsync(async (req, res) => {
  let lms = await new LMS(req.schoolDomain).init()
  res.render('register', {
    school: lms.school
  })
}))

app.post('/register', async (req, res, next) => {
	let lms = await new LMS(req.schoolDomain).init()
  var errors = {}

	if (typeof req.body.name == 'undefined' || req.body.name.trim() == '') {
		errors.name = 'Please type your name'
	}
	if (typeof req.body.email == 'undefined' || req.body.email.trim() == '') {
		errors.email = 'Please type your email'
	}
	if (typeof req.body.password == 'undefined' || req.body.password.trim() == '') {
		errors.password = 'Please type a password'
	}

	if (Object.keys(errors).length > 0) {
		res.render('register', {errors: errors, school: lms.school})
	} else {
    try {
      let user = await DB.models.User.register( {
        username: req.body.email,
        name : req.body.name,
      }, req.body.password)

      loginUser(req, res, next, user)
    } catch (e) {
      res.render('register', {
        school: lms.school,
        errors: {
          email:  "User already exists"
        }
      })
    }
	}
});

function wrapAsync(fn) {
  return function(req, res, next) {
    // Make sure to `.catch()` any errors and pass them along to the `next()`
    // middleware in the chain, in this case the error handler.
    fn(req, res, next).catch(next);
  };
}

app.use(routes)

router.use(async function(error, req, res, next) {
  let school = null
  try {
    school = await new LMS(req.schoolDomain).init()
  } catch (e) {
    res.status(422).render('error', {
      school: {
        name:'AirLearn',
        theme:'United'
      },
      page: {
        title: "Ops, there was an error",
        description: error.message
      }
    })
    return
  }


  if (req.headers && req.headers.accept && req.headers.accept.indexOf('application/json') != -1) {
    res.status(422).json({ message: error.message });
  } else {
    res.status(422).render('error', {
      school: school.school,
      page: {
        title: "Ops, there was an error",
        description: error.message
      }
    })
  }
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`))