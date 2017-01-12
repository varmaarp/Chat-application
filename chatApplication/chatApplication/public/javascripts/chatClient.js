$(function(){
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#send');
    var $leave = $('#leave');
    var $start = $('#start');
    var timeout;
    var typing = false;

    var sendMessage = function () {
        socket.emit('send message', $message.val());
        $message.val('');
    };

    function timeoutFunction() {
        typing = false;
        socket.emit('is typing', false);
    };

    $('#upload-input').on('change', function () {

        var files = $(this).get(0).files;

        if (files.length > 0) {
            // One or more files selected, process the file upload

            // create a FormData object which will be sent as the data payload in the
            // AJAX request
            var formData = new FormData();

            // loop through all the selected files
            for (var i = 0; i < files.length; i++) {
                var file = files[i];

                // add the files to formData object for the data payload
                formData.append('uploads[]', file, file.name);
            }

            $.ajax({
                url: '/',
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function (data) {
                    console.log('upload successful!');
                }
            });
            console.log('trying to upload');
        }

    });


    $send.on('click',function () {
        //sendMessage();
        
        console.log('button clicked');
        var x = document.getElementById("upload-photo");
        var txt = "";
        if ('files' in x) {
            if (x.files.length == 0) {
                txt = "Select one or more files.";
            } else {
                for (var i = 0; i < x.files.length; i++) {
                    txt += "<br><strong>" + (i + 1) + ". file</strong><br>";
                    var file = x.files[i];
                    if ('name' in file) {
                        txt += "name: " + file.name + "<br>";
                    }
                    if ('size' in file) {
                        txt += "size: " + file.size + " bytes <br>";
                    }
                }
            }
        }
        console.log(txt); 
        $message.val(txt);
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
        if (e.keyCode === 13) {
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

    /*$('#attach-image').click(function () {
        socket.emit('open explorer')
    });*/

    socket.on('new message', function (data) {
        if (data.id === socket.id) {
            $chatBody.append('<div class="chat-message">' +'You: '+ data.msg + '</div>');
        }
        else {
            $chatBody.append('<div class="chat-message">'+'Stranger: ' + data.msg + '</div>');
        }
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

    socket.on('user typing', function (data) {
        if (data.isTyping) {
            if (data.id !== socket.id) {
                $chatBody.append('<div class="user-typing">Stranger is typing...</div>');
                timeout = setTimeout(timeoutFunction, 2000);
            }
        }
        else {
            $('.user-typing').remove();
        }
    });
});