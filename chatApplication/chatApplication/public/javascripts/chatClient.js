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
            var URL = window.webkitURL || window.URL;

            // loop through all the selected files
            for (var i = 0; i < files.length; i++) {
                var blob = '';
                var file = files[i];
                console.log(file);
                var url = URL.createObjectURL(file);
                console.log('url main');
                console.log('1 '+url);
                blob = processFile(url);

                if (blob !== '') {
                    console.log('emiting imageSend');
                    socket.emit('imageSend', blob);
                }
            }
        }
    });

    function processFile(url) {
        var canvas = document.createElement('canvas');
        var blobUrl;
        var URL = window.webkitURL || window.URL;
        var newWidth = 300;
        var newDataUrl = '';
        var base64ImageContent;
        var img = new Image();
        img.src = url;
        img.onload = function () {
            var oldWidth = img.width;
            var oldHeight = img.height;
            var newHeight = Math.floor(oldHeight / oldWidth * newWidth);

            canvas.width = newWidth;
            canvas.height = newHeight;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            newDataUrl = canvas.toDataURL("image/jpeg", 0.5);
            //console.log(newDataUrl);
            //base64ImageContent = newDataUrl.split(',')[1].trim();
            base64ImageContent = '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'
            var blob = base64ToBlob(base64ImageContent, 'image/png');
            blobUrl = URL.createObjectURL(blob);
            console.log('2 '+blobUrl);
            //return blobUrl;
        }
        
        console.log('3 out ' + blobUrl);
        var c = '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'
        var b = base64ToBlob(c, 'image/png');
        bu = URL.createObjectURL(b);
        console.log('4 '+bu);
        return bu;

        //console.log(newDataUrl);
        //var x = newDataUrl.split(',');
        //console.log('split ' + x);
        
        
    }

    function base64ToBlob(base64, mime) {
        mime = mime || '';
        var sliceSize = 1024;
        var byteChars = window.atob(base64);
        var byteArrays = [];

        for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
            var slice = byteChars.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: mime });
    }


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
        scrollDown();
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

    socket.on('imageNew', function (data) {
        if (data.val) {
            var img = new Image();
            imgSrc = data.imgSrc;
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