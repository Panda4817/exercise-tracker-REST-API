const express = require('express')
const mongo = require('mongodb')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
// MongoDB connection
mongoose.Promise = global.Promise;

var connectionPromise = mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, 
  useUnifiedTopology: true,
});

connectionPromise.then(function(db) {
    console.log("Connected to database!!!");
}, function(err){
    console.log("Error in connecting database " + err);
});


var userSchema = new mongoose.Schema({
  username: String
});
var User = mongoose.model('User', userSchema);

var exerciseSchema = new mongoose.Schema({
  userId: String,
  date: Date,
  duration: Number,
  description: String
});

var Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res) => {
  const name = req.body.username;
  console.log(name)
  const data = User.findOne({username: name}).exec();
  console.log(data)
  data.then((doc) => {
    if (doc === null) {
      const user = new User({username: name});
      const promise = user.save();
      promise.then(function (doc) {
        res.json({"username": doc.username, "_id": doc._id})
      })
    } else {
      res.status(400).send('Username already taken')
    }
  })
})

app.get("/api/exercise/users", (req, res) => {
  const allUsers = User.find({}).exec();
  allUsers.then((docs) => {
    res.json(docs)
  })
})

const isInt = (str) => {
  if (parseInt(str) === NaN || /^[a-z]+$/i.test(str)) {
    return false;
  } else {return true;}
  
}

const isGoodDate = (d) => {
  if (d.split("-").length == 1 || new Date(d) == "Invalid Date") {
    return false;
  } else {return true;}
  
}

app.post("/api/exercise/add", (req, res) => {
  const id = req.body.userId;
  const desc = req.body.description;
  const dur = req.body.duration;
  if (isInt(dur) == false) {
    res.status(400).send("Duration must be a number.")
  }
  const date = req.body.date;
  let d;
  if (date == "" || date == null || date == undefined || date == false) {
    d = new Date()
  } else if (isGoodDate(date) == false) {
    res.status(400).send("The date submitted is not valid. Please follow the yyyy-mm-dd format.")
  } else {
    d = new Date(date)
  }

  const userData = User.findById(id).exec();
  userData.then((doc) => {
    const newExercise = new Exercise({
      userId: id,
      date: d,
      duration: parseInt(dur),
      description: desc
    });
    const promise = newExercise.save();
    res.json({
      "_id": id,
      "username": doc.username,
      "date": d.toDateString(),
      "duration": parseInt(dur),
      "description": desc
    })
  }).catch((err) => {
    res.status(500).send(err.message)
  })

})

app.get("/api/exercise/log", (req, res) => {
  const id = req.query.userId
  console.log(id)
  if (id == undefined) {
    res.status(500).send("Unknown userId.")
  }
  
  const f = req.query.from
  const to = req.query.to
  const limit = req.query.limit
  
  const userData = User.findById(id).exec();
  
  userData.then((doc) => {
    
    const exerciseData = Exercise.find({userId: id}).exec();
    exerciseData.then((docs) => {
      const log = docs.filter((doc) => {
        if (f != undefined && isGoodDate(f)) {
          if (doc.date >= new Date(f)) {
            return true;
          }
          return false;
        }
        return true;
      }).filter((doc) => {
        if (to != undefined && isGoodDate(to)) {
          if (doc.date <= new Date(to)) {
            return true;
          }
          return false;
        }
        return true;
      })
     if (isInt(limit)) {
       if (parseInt(limit) <= log.length) {
         const newLog = log.slice(0, limit)
         res.json({
           "_id": id,
           "username": doc.username,
           "count": newLog.length,
           "log": newLog.map(e => {
             return {
               "description": e.description,
               "duration": e.duration,
               "date": e.date.toDateString()
             }
           })
         })
       } 
     } else {
       res.json({
        "_id": id,
        "username": doc.username,
        "count": log.length,
        "log": log.map(e => {
          return {
            "description": e.description,
            "duration": e.duration,
            "date": e.date.toDateString()
          }
        }) 
      })
     }
     
    
  })
}).catch((err) => {
    res.status(500).send(err.message)
})
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
