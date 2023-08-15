
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const app = express();
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const server = require('http').Server(app)
const io = require('socket.io')(server)

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: 'tops Secret.',
    resave: false,
    saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/smDB",{useNewUrlParser:true}).then(()=>{
    console.log("connection established")
})

const userSchema = new mongoose.Schema({
    name:String,
    email:String,
    password:String,
});

const roomSchema = {
  roomName:String,
}

const profileSchema = {
  username:String,
  email:String,
  description:String,
  interests:Array,
  privacy:String,
  googleId:String,
  // profile:String,
}

const friendSchema={
  from:String,
  to:String,
  Status:String
}

const chatSchema={
  room:String,
  name:String,
  message:String,
}


userSchema.plugin(passportLocalMongoose);


const User = mongoose.model("User",userSchema);
const Room = mongoose.model("Room",roomSchema);
const Profile = mongoose.model("Profile",profileSchema);
const Friend = mongoose.model("Friend",friendSchema);
const Chat = mongoose.model("Chat",chatSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/",function(req,res){
  
    res.render("Home.ejs");
})



app.get("/register",function(req,res){
    res.render("register.ejs");
})

app.get("/login",function(req,res){
    res.render("login.ejs");
})

app.get('/homepage',function(req,res){
  if(req.isAuthenticated()){
    res.render("homepage.ejs");
}else{
    res.redirect('/login');
}
})

app.post('/cp',function(req,res){
  res.render("homepage.ejs");
})

app.get('/friends',function(req,res){
  var names=[];
  User.find().then(function(result){
      result.forEach(item =>{
          names.push(item.name);
      })
      res.render('friends.ejs',{
          NAMES:names,
      });
  })
  
})

app.get('/requests',function(req,res){
  var reqnames=[];
  Friend.find({to:req.user.name,Status:"request"}).then(function(result){
      result.forEach(item =>{
          reqnames.push(item.from);
          console.log(item.from)
      })
      res.render('requests.ejs',{
          REQUESTS:reqnames,
      })
  })
})

app.post('/requests', function(req, res){
  Friend.find({from:req.body.accept}).then(function(result){
      result.forEach(item =>{
          console.log(item)
          if(req.body.type==='accept'){
          item.Status="Accepted";
          item.save()
          console.log("hmmmm")
          }else{
              item.Status='';
          }
      })
      res.redirect('/requests')
  })
})


app.get('/createprofile',function(req,res){
  
  res.render("createprofile.ejs");
})

app.post("/register",function(req,res){
    User.register({username:req.body.username,name:req.body.name},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect('/register')
        }else{
            passport.authenticate("local")(req,res,function(){
                console.log("hi");
                res.redirect('/createprofile')
            });
        }
       })
})

app.get('/logout', function(req, res){
  req.logOut(function(err){
      if(err){
          console.log(err);
      }else{
          
          res.redirect('/');
      }
  })
  
})

app.post('/createprofile', function(req,res){

  

  const newprofile = new Profile({
    username:req.body.name,
    email:req.body.email,
    description:req.body.desc,
    interests:req.body.interest,
    privacy:req.body.privacy,
    // profile:newImageName
  })
   newprofile.save().then(function(){
    res.render("homepage.ejs",{
      NAME:req.user.name,
    })
   })
  
})

app.post("/login",function(req,res){
    const user = new User({
        name: req.body.name,
        username:req.body.username,
        password:req.body.password
    })
    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate('local')(req,res,function(){
              //  NAME=req.user.name;
              console.log(req.user.name);
                res.render("homepage.ejs",{
                  NAME: req.user.name,
                });
            })
        }
    })
    
})

app.post('/homepage',function(req,res){
  // console.log(req.user.name);
  var Name =[];
  var comment;
  var interests = [];
  Profile.find({username:req.body.searched,privacy:"Public"}).then(function(profile){
    profile.forEach(item =>{
      Name.push(item.username);
      if(item.privacy=="Public"){
        res.render('profilepage.ejs',{
          NAME:Name,
          EMAIL:item.email,
          DESC:item.description,
          INTEREST:item.interests,
        })}
    })
    
  }).catch(function(err){
    console.log(err);
  })
  Profile.find({username:req.body.searched,privacy:"Private"}).then(function(profile){
    console.log(profile);
    profile.forEach(item =>{
      Friend.find({to:req.user.name,from:item.username}).then(function(friend){
        console.log("MINE");
        console.log(friend);
        friend.forEach(fri =>{
          if(fri.Status=="Accepted"){
            Name.push(item.username)
            console.log("hi")
            res.render('profilepage',{
              NAME:Name,
              EMAIL:item.email,
              DESC:item.description,
              INTEREST:item.interests,
            })
          }
          else if(fri.Status!=="Accepted"){
            console.log("NO")
            comment="This Account is Private , To see this be a Friend"
            res.render('profilepage',{
              COMMENT:comment,
            })
          }
        })
        if(friend.length===0){
          console.log("NO")
          comment="This Account is Private , To see this be a Friend"
          res.render('profilepage',{
            COMMENT:comment,
          })
        }
        
    }).catch(function(err){
      console.log(err)
    })
  })
  })
  
})


app.post('/friends', function(req,res){
  const friendname=req.body.friendname;
  const status=req.body.status;
  console.log(req.user.name);
  const request = new Friend ({
      from:req.user.name,
      to:friendname,
      Status:status,
  })
  request.save();
  res.render('login.ejs')
})

app.get('/your-friends',function(req,res){
  var friendnames=[];
  Friend.find({to:req.user.name,Status:"Accepted"}).then(function(result){
      // console.log(result)
      result.forEach(item =>{
          
          friendnames.push(item.from);
          // console.log("IM here")
          // console.log(item.from);
      })
      res.render('your-friends.ejs',{
          Friends: friendnames,
      })
  }).catch(function(err) {
      console.error(err);
  })
  
})

// app.post('/homepage', function(req,res){
//     res.render('room.ejs')
// })

app.set('views', './views')
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))

const rooms = { }

Room.find().then(function(result){
  result.forEach(item =>{
    rooms[item.roomName]={users:{}};
  })
})

app.post('/homepage1', (req, res) => {
  var room=[];
  Room.find().then(function(result){
    result.forEach(item =>{
      room.push(item.roomName);
      // console.log(item.roomName);
    })
    res.render('index.ejs', {
      Rooms: room 
   })
  })
  
})

app.get('/chat-anomy',function(req, res){
  res.render('chat-anomy.ejs');
})

app.post('/room', (req, res) => {
  if (rooms[req.body.room] != null) {
    return res.redirect('/room')
  }
  rooms[req.body.room] = { users: {} }
  const newroom = new Room({
    roomName: req.body.room,
  })
  newroom.save();
  console.log(rooms)
  res.redirect(req.body.room)
  // Send message that new room was created
  io.emit('room-created', req.body.room)
})

app.get('/:room', (req, res) => {
  if (rooms[req.params.room] == null) {
    return res.render("login")
  }
  res.render('room', { roomName: req.params.room })
})

// server.listen(3000)

io.on('connection', socket => {
  socket.on('new-user', (room, name) => {
    socket.join(room)
    // console.log(name);
    rooms[room].users[socket.id] = name
    // console.log(name);
    Chat.find({room:room}).then(function(Messages){
      // console.log(result)
      socket.emit('chat-restore', Messages)
      console.log("hi");
    })
    socket.to(room).emit('user-connected', name)
  })
  socket.on('send-chat-message', (room, message) => {
    console.log(room);
    const chat = new Chat({
      room:room,
      name:rooms[room].users[socket.id],
      message:message
    })
    chat.save();
    socket.to(room).emit('chat-message', { message: message, name: rooms[room].users[socket.id] })
  })
  socket.on('disconnect', () => {
    getUserRooms(socket).forEach(room => {
      socket.to(room).emit('user-disconnected', rooms[room].users[socket.id])
      delete rooms[room].users[socket.id]
    })
  })
})

function getUserRooms(socket) {
  return Object.entries(rooms).reduce((names, [name, room]) => {
    if (room.users[socket.id] != null) names.push(name)
    return names
  }, [])
}



server.listen(3000,()=>{
    console.log("listening on port 3000");
})
