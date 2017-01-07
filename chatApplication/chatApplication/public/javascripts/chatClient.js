$(function(){
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#submit');
    var $leave = $('#leave');
    var $start = $('#start');
    var timeout;

    $send.click(function () {
        console.log('submitted by ' + socket.id);
        socket.emit('send message', $message.val());
        $message.val('');
    });

    $leave.click(function () {
        console.log('leaving room');
        socket.emit('leave room');
    });

    $start.click(function () {
        socket.emit('start chat');
        $('#chat-message').empty();
    });
   
    socket.on('new message', function (data) {
        if (data.id === socket.id) {
            $chatBody.append('<div id="chat-message">' +'You: '+ data.msg + '</div>');
        }
        else {
            $chatBody.append('<div id="chat-message">'+'Stranger: ' + data.msg + '</div>');
        }
    });

    socket.on('no user', function () {
        $('#chat-textarea').prop("disabled", true);
    });

    socket.on('user connected', function () {
        $('#chat-textarea').prop("disabled", false);
    });

    socket.on('chat end', function () {
        $chatBody.append('<div>Your chat has been disconnected </div>');
    });
});