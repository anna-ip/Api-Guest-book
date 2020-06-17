import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from 'mongoose'
import crypto from 'crypto'
import bcrypt from 'bcrypt-nodejs'

// Defines the port the app will run on. Defaults to 8080, but can be 
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 6060
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/guestBook'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const User = mongoose.model('User', {
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const Message = mongoose.model('Message', {
  message: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 140
  },
  like: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      accessToken: req.header('Authorization')
    });
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ loggedOut: true });
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: 'access token missing or wrong', errors: err.errors });
  }
}

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Hello world')
})

//register form
app.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body
    //the bcrypt.... makes the password stored on the database as an bcrypt hash value of the password
    const user = new User({ name, email, password: bcrypt.hashSync(password) })
    //saves the user
    user.save()
    //if success = the json returns the users id (maybe id should be the author??)and accesToken
    res.status(201).json({ id: user._id, accessToken: user.accessToken })
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not create user", errors: err.errors })
  }
})

// app.get('/secrets', authenticateUser)
// app.get('/secrets', (req, res) => {
//   res.json({ secret: 'This is a super secret message.' })
// })

// //the log in .post
app.post('/signIn', async (req, res) => {
  //get the user from the DB checking by email & password
  const user = await User.findOne({ email: req.body.email })
  //if the user excisting and the password sent in json matches the DB password, the bcrypt checks if the crypted version is matchig
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    //the return will be user id and the accessToken
    res.json({ userId: user._id, accessToken: user.accessToken })
  } else {
    res.status(404).json({ notFound: true })
  }
})
//This endpoint will show all the posted messages? From Happy thought
app.get('/messages', authenticateUser)
app.get('/messages', async (req, res) => {
  const message = await Message.find().sort({ createdAt: 'desc' }).limit(20).exec()
  res.json(message)
  console.log('You have been authenticated')
})

//Thoughts will be added/posted to this endpoint
app.post('/messages', async (req, res) => {
  const { message } = req.body
  const thought = new Thought({ message })

  try {
    const savedThought = await thought.save()
    res.status(201).json(savedThought)
  } catch (err) {
    res.status(400).json({ message: 'Could not save your thought', error: err.errors })
  }
})

//This endpoint updates the number of hearts/likes 
// app.post('/messages/:id/like', async (req, res) => {
//   try {
//     const like = await Thought.findOneAndUpdate(
//       { "_id": req.params.id }, //filters & is required
//       { $inc: { "like": 1 } }, //updates & is required
//       { new: true } //updates the number of hearts in POST
//     )
//     res.status(201).json(like)
//   } catch (err) {
//     res.status(400).json({ message: 'Could not save your like', error: err.errors })
//   }
// })



//*** DELETE endpoint****/
app.delete('/messages:id', async (req, res) => {

})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
