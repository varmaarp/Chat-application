var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

var server = app.listen(3000);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

var connections = []
var queue = []
var rooms = {}

var connectUsers = function (socket) {

    //if queue is empty -> add socket to queue display "finding someone to chat..."
    if (queue.length === 0) {
        console.log('socket pushed to waiting queue');
        queue.push(socket);

        //since no one to talk to, message area should be disabled
        socket.emit('no user');
    }
    //if queue has a user -> pop user and create room with the socket
    else {

        //could write a function to make it random
        var user = queue.pop();
        var roomId = socket.id + '&' + user.id;
        console.log('room id ' +roomId);

        //join both to room
        user.join(roomId);
        socket.join(roomId);

        //map room to user ids
        rooms[user.id] = roomId;
        rooms[socket.id] = roomId;

        socket.emit('user connected');
        user.emit('user connected');
    }
};

io.sockets.on('connection', function (socket) {

    //when a user connects -> add to connections
    connections.push(socket);
    console.log('Connected: %s socktes connected', connections.length);

    //connecting to user waiting in queue
    connectUsers(socket);
    
    //when a user sends message -> emit 'new message' to client with id of user who sent the message
    socket.on('send message', function (data) {
        console.log(data);
        var room = rooms[socket.id];
        io.to(room).emit('new message', { msg: data, id: socket.id });
    });

    //Todo: Check for typing
    socket.on('is typing', function (data) {
        var room = rooms[socket.id];
        io.to(room).emit('user typing', {isTyping: data, id: socket.id});
    });

    //Todo: Check for stop typing

    //deleting room entry from rooms object
    var endChat = function (room) {
        io.to(room).emit('chat end');
        users = room.split('&');
        var prop = users[0];
        delete rooms[prop];
        prop = users[1];
        delete rooms[prop];
    };

    //Todo: When a user disconnects, ask for starting chat again
    socket.on('start chat', function() {
        connectUsers(socket);
    });

    //when user disconnects
    socket.on('leave room', function () {
        var room = rooms[socket.id];
        endChat(room);
    });

    //when a user disconnects -> remove from connections and any rooms connected to
    socket.on('disconnect', function () {
        var room = rooms[socket.id];
        if (room !== undefined) {
            endChat(room);
        }
        connections.splice(connections.indexOf(socket), 1);
        console.log('Disconnected: %s sockets connected', connections.length);
    });

    //open file explorer
    /*
    socket.on('open explorer', function () {
        require('child_process').exec('start "" "f:\\test"');
    });*/
});

module.exports = app;
