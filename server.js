if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require("./utils/messages");
const {userJoin , getCurrentUser, userLeave, getRoomUsers} = require("./utils/users");
const os = require('os');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash =require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

const initializePassport = require('./passport-config');
initializePassport(passport, 
    username =>  users_info.find(user_info => user_info.name === username),
    id => users_info.find(user_info => user_info.id === id),
    );
const users_info = [];


const app = express();
const server = http.createServer(app);
const io = socketio(server);
const osNet = os.networkInterfaces();
const osCpu = os.cpus();
const botName = 'Alex Bot';


app.get('/index.html', (req,res) => {
    res.status(404).send();
})

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));
// console.log(path.join(__dirname, 'public'));
// Set ejs static folder
const ejsFolder = path.join(__dirname, 'views');

// This line configures Express to serve static files from the 'public' directory.
// 'express.static' is a middleware that serves static files such as HTML, CSS, and JavaScript.
// The path to the 'public' directory is determined using the 'path' module's 'join' method.
// '__dirname' is a global variable that represents the current directory.
// So, path.join(__dirname, 'public') resolves to the absolute path of the 'public' directory.

// Run when client connects
io.on('connection', socket => {
    console.log('New WS connection ...');

    const ipv6Address = socket.handshake.address;

    // Send osInfo to client
    socket.emit('osInfo', { osNet, osCpu ,ipv6Address});

    socket.on('joinRoom',({username, room}) => {

        const user = userJoin(socket.id,username,room)
        socket.join(user.room);

    // This method sends a message (data) to the client that is associated with the socket (socket).
    socket.emit('message', formatMessage (botName,'Welcome to Chatchord!'));

    // Broadcast when a user connects
    // This method sends a message (data) to all connected clients except the client associated with the socket (socket).
    socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`));
    
    // Send users and room info
    io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
    })

    });



    //  Runs when cilent disconnects
    socket.on('disconnect', () => {

        const user = userLeave(socket.id);
        if (user){
            
            io.to(user.room).emit('message', 
            formatMessage(botName, `${user.username} user has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    })

    //  Listen for chatMessage
    socket.on('chatMessage', msg => {
        //  console.log(msg);
        const user = getCurrentUser(socket.id);
        io.to(user.room).emit('message', formatMessage(user.username, msg));
    })
 
})



//  25-2-2024 Login Form
// Set the view engine to EJS and specify the views directory
app.set('view engine', 'ejs');
app.set('views', ejsFolder);

app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


// Route handler for '/index.ejs' URL to serve the 'index.ejs' file
app.get('/login', checkNotAuthenticated, (req, res) => {
res.render(path.join(ejsFolder, 'login'));});
// Route handler for '/registration.ejs' URL to serve the 'registration.ejs' file
app.get('/registration' ,checkNotAuthenticated, (req, res) => {
res.render(path.join(ejsFolder, 'registration'));});


 // Registration function
 app.post('/registration', checkNotAuthenticated,async(req, res) => {
    try {
        // Hash password and put name and password into array
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users_info.push({
            id:Date.now().toString(),
            name: req.body.name,
            password: hashedPassword
        })
        // Redirect to login page 
        res.render((path.join(ejsFolder, 'login.ejs')));
    } catch (error) {
        // Redirect to registration page
        res.render(path.join(ejsFolder, 'registration.ejs'));
    }
 })




// Login function
app.post('/login', checkNotAuthenticated,passport.authenticate('local', {
    successRedirect: '/home', // Update the successRedirect URL
    failureRedirect: '/login',
    failureFlash: true
    })
  );


app.get('/home',checkAuthenticated,(req, res) => {
    res.render('home.ejs', {name: req.user.name});
})


app.post('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/login');
    });
  });
  
// if user loggin, not able to access login
function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/login');
}

// if user loggin, not able to accesss login and registration
function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/home')
    }
    next();
}


const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// This code starts the server and makes it listen on the specified port.
// The 'listen' method is called on the Express application object, 'app'.
// When the server starts, it logs a message to the console indicating the port it is running on.
// The 'PORT' variable is set to 3000 if it is not already set in the environment variables (process.env.PORT).
// This allows the server to run on the specified port or, if that port is not available, fallback to the environment variable.