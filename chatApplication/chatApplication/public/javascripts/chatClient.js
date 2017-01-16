$(function () {
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#send');
    var $leave = $('#leave');
    var $start = $('#start');
    var timeout;
    var typing = false;

    var sendMessage = function () {
        var message = $message.val();
        var whiteSpaces = /^\s*$/;
        if (!whiteSpaces.test(message)){
            socket.emit('send message', message);
            $message.val('');
            $message[0].focus();
            $message[0].setSelectionRange(0, 0);
        }
    };

    function timeoutFunction() {
        typing = false;
        socket.emit('is typing', false);
    };

    function scrollDown() {
        var elem = document.getElementById('chat-messages');
        elem.scrollTop = elem.scrollHeight;
    }

    $('#upload-input').on('change', function () {

        var files = $(this).get(0).files;
        console.log(files);
        if (files.length > 0) {

            var formData = new FormData();

            // loop through all the selected files
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                // add the files to formData object for the data payload
                formData.append('uploads[]', file, file.name);
            }

            //call ajax method to post data to server
            $.ajax({
                url: '/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (data) {
                    console.log('upload successful!');
                    socket.emit('imageRequest', files);
                }
            });
        }

    });


    $send.on('click', function () {
        sendMessage();
    });

    $leave.click(function () {
        socket.emit('leave room');
    });

    $start.click(function () {
        socket.emit('start chat');
        $('.chat-message').remove();
    });


    $message.keypress(function (e) {
        if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            sendMessage();
            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 0);
        }
        else {
            if (typing === false) {
                typing = true;
                socket.emit('is typing', true);
            }
            else {
                clearTimeout(timeout);
                timeout = setTimeout(timeoutFunction, 2000);
            }
        }
        
    });


    socket.on('new message', function (data) {
        if (data.id === socket.id) {
            $chatBody.append('<div class="chat-message">You: ' + data.msg + '</div>');
        }
        else {
            $chatBody.append('<div class="chat-message">Stranger: ' + data.msg + '</div>');
        }
        scrollDown();
    });

    socket.on('no user', function () {
        $('#chat-textarea').prop("disabled", true);
    });

    socket.on('user connected', function () {
        $('#chat-textarea').prop("disabled", false);
    });

    socket.on('chat end', function () {
        $chatBody.append('<div class="chat-message">Your chat has been disconnected </div>');
    });

    socket.on('image', function (data) {
        if (data.val) {
            imgSrc = 'data:image/jpeg;base64,' + data.buffer;
            if (data.id === socket.id) {
                $chatBody.append('<div class="chat-message">You: <img src="' + imgSrc + '" class="img-thumbnail" width="250" height="150"></div>');
            }
            else {
                $chatBody.append('<div class="chat-message">Stranger: <img src="' + imgSrc + '" class="img-thumbnail" width="250" height="150"></div>');
            }
            scrollDown();
        }
    });

    socket.on('user typing', function (data) {
        if (data.isTyping) {
            if (data.id !== socket.id) {
                $chatBody.append('<div class="user-typing">Stranger is typing...</div>');
                scrollDown();
                timeout = setTimeout(timeoutFunction, 2000);
            }
        }
        else {
            $('.user-typing').remove();
        }
    });
});
