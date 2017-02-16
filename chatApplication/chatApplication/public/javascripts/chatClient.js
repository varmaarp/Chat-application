$(function () {
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#send');
    var $leave = $('#leave');
    var timeout;
    var status; // 0-disconnected, 1-chatting, 2-waiting, 3-asking
    var typing = false;

    var sendMessage = function () {
        var message = $message.val();
        var whiteSpaces = /^\s*$/;
        if (!whiteSpaces.test(message)) {
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
                url: '/chat',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (data) {
                    socket.emit('imageRequest', files);
                }
            });
        }

    });

    $(document).keyup(function (e) {
        e.preventDefault();
        if (e.keyCode === 27) {
            $leave.click();
        }
    });

    $send.on('click', function () {
        sendMessage();
    });

    $leave.click(function () {
        if (status === 3) {
            status = 0;
            socket.emit('leave room');
            $leave.text('Start New');
        }
        else if (status === 1) {
            status = 3;
            $leave.text('Sure?');
        }
        else if (status === 0) {
            startChat();
        }
    });

    function startChat() {
        socket.emit('start chat');
        $('.chat-message').remove();
    }

    $message.keypress(function (e) {
        if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            status = 1;
            $leave.text('End');
            sendMessage();
            clearTimeout(timeout);
            timeout = setTimeout(timeoutFunction, 0);
        }
        else {
            status = 1;
            $leave.text('End');
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

    $chatBody.on("click", "div#start-chat", function () {
        startChat();
    });

    socket.on('new message', function (data) {
        if (data.id === socket.id) {
            $chatBody.append('<div class="chat-message"><span style="color:blue;font-weight:bold">You</span>: ' + data.msg + '</div>');
        }
        else {
            $chatBody.append('<div class="chat-message"><span style="color:red;font-weight:bold">Stranger</span>: ' + data.msg + '</div>');
        }
        scrollDown();
    });

    socket.on('no user', function () {
        status = 2;
        $leave.text('Connecting...');
        $chatBody.append('<div class="chat-message bold-text">Looking for a random stranger on the server...</div>');
        $('#chat-textarea').prop("disabled", true);
        $('#upload-input').prop("disabled", true);
    });

    socket.on('user connected', function () {
        status = 1;
        $leave.text('End');
        $('.chat-message').remove();
        $chatBody.append('<div class="chat-message bold-text">You are connected to a random stranger. Press Esc key to disconnect.</div>');
        $('#chat-textarea').prop("disabled", false);
        $('#upload-input').prop("disabled", false);
    });

    socket.on('chat end', function () {
        status = 0;
        $leave.text('Start New');
        $chatBody.append('<div class="chat-message bold-text">Your chat has been disconnected.</div>');
        $chatBody.append('<div class="chat-message" id="start-chat">Click here to start chatting again.</div>');
        $('#chat-textarea').prop("disabled", true);
        $('#upload-input').prop("disabled", true);
    });

    socket.on('image', function (data) {
        if (data.val) {
            imgSrc = 'data:image/jpeg;base64,' + data.buffer;
            if (data.id === socket.id) {
                $chatBody.append('<div class="chat-message"><span style="color:blue;font-weight:bold">You</span>: <img src="' + imgSrc + '" class="img-thumbnail" width="250" height="150"></div>');
            }
            else {
                $chatBody.append('<div class="chat-message"><span style="color:red;font-weight:bold">Stranger</span>: <img src="' + imgSrc + '" class="img-thumbnail" width="250" height="150"></div>');
            }
            scrollDown();
        }
    });

    socket.on('user typing', function (data) {
        if (data.isTyping) {
            if (data.id !== socket.id) {
                $chatBody.append('<div class="user-typing bold-text">Stranger is typing...</div>');
                scrollDown();
                timeout = setTimeout(timeoutFunction, 2000);
            }
        }
        else {
            $('.user-typing').remove();
        }
    });

});