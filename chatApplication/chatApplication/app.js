var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var routes = require('./routes/home');
var chat = require('./routes/chat');
var app = express();
var server = app.listen(process.env.PORT || 5000);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/chat', chat);

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
        console.log('room id ' + roomId);

        //join both to room
        user.join(roomId);
        socket.join(roomId);

        //map room to user ids
        rooms[user.id] = roomId;
        rooms[socket.id] = roomId;

        socket.emit('user connected');
        user.emit('user connected');

        console.log('after room queue length ' + queue.length);
    }
};

io.sockets.on('connection', function (socket) {

    //when a user connects -> add to connections
    connections.push(socket);
    console.log('Connected: %s socktes connected', connections.length);


    //connecting to user waiting in queue
    connectUsers(socket);
    console.log('queue length ' + queue.length);

    //when a user sends message -> emit 'new message' to client with id of user who sent the message
    socket.on('send message', function (data) {
        var room = rooms[socket.id];
        io.to(room).emit('new message', { msg: data, id: socket.id });
    });

    socket.on('is typing', function (data) {
        var room = rooms[socket.id];
        io.to(room).emit('user typing', { isTyping: data, id: socket.id });
    });

    //deleting room entry from rooms object
    var endChat = function (room) {
        io.to(room).emit('chat end');
        users = room.split('&');
        var prop = users[0];
        delete rooms[prop];
        console.log(prop);
        prop = users[1];
        delete rooms[prop];
        console.log(prop);
        console.log('connections in queue ' + queue.length);
    };
    
    socket.on('start chat', function () {
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
        if (queue.indexOf(socket) !== -1) {
            queue.splice(queue.indexOf(socket), 1);
            console.log('socket removed from queue and connections ' + socket.id);
        }
        console.log('Disconnected: %s sockets connected', connections.length);
        console.log('connections in queue ' + queue.length);
    });

    /*
    socket.on('imageSend', function (data) {
        var room = rooms[socket.id];
        io.to(room).emit('imageNew', { val: true, imgSrc: data, id: socket.id });
        console.log('sending file to client');
    });
    */

    socket.on('imageRequest', function (data){
        console.log(data);
        console.log(chat.b[data]);
        var room = rooms[socket.id];
        // = data.length;
        //for (var i = 0; i < len; i++) {
            //file = data[i];
            io.to(room).emit('imageNew', { val: true, buffer: chat.b[data], id: socket.id });
            console.log('sending file to client');
        //}
    });

});

module.exports = app;