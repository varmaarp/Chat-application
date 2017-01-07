$(function(){
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#submit');

    $send.click(function () {
        console.log('submitted by '+socket.id);
        socket.emit('send message', $message.val());
        $message.val('');
    });

    socket.on('new message', function (data) {
        //add the data to chat-body
        if (data.id === socket.id) {
            $chatBody.append('<div>' +'You: '+ data.msg + '</div>');
        }
        else {
            $chatBody.append('<div>'+'Stranger: ' + data.msg + '</div>');
        }
    });
});