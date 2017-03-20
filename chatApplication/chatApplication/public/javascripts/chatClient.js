$(function () {
    var socket = io.connect();
    var $message = $('#chat-textarea');
    var $chatBody = $('#chat-messages');
    var $send = $('#send');
    var $leave = $('#leave');
    var timeout;
    var status; // 0-disconnected, 1-chatting, 2-waiting, 3-asking
    var typing = false;
    var URL = window.webkitURL || window.URL;
    var imgId = 0;

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

            // loop through all the selected files
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                if (file.size <= 5242880) {
                    readFile(file);
                }
                else {
                    alert('File size too big. Please select a file less than 5Mb');
                }
            }
        }
    });

    function readFile(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            getCanvasImage(reader.result,file);
        }
        reader.readAsDataURL(file);
    }

    var getCanvasImage = function (image, file) {
        
        //define canvas image
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        var img = new Image();
        var newWidth = 300;
        img.onload = function () {
            var oldWidth = img.width;
            var oldHeight = img.height;
            var newHeight = Math.floor(oldHeight / oldWidth * newWidth);

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            var newimageurl = canvas.toDataURL("image/jpeg", 0.5);
            var base64ImageContent = newimageurl.split(',')[1].trim();
            uploadToServer(file, dataURItoBlob(newimageurl));
        }

        img.src = image;
    }

    function dataURItoBlob(dataURI) {

        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(dataURI.split(',')[1]);
        else
            byteString = unescape(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        //Passing an ArrayBuffer to the Blob constructor appears to be deprecated, 
        //so convert ArrayBuffer to DataView
        var dataView = new DataView(ab);
        var blob = new Blob([dataView], { type: mimeString });

        return blob;
    }

    var uploadToServer = function (oldFile, newFile) {
        // prepare FormData
        var formData = new FormData();
        formData.append('uploads[]', newFile, oldFile.name);

        //submit formData using $.ajax			
        $.ajax({
            url: '/chat',
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                socket.emit('imageRequest', oldFile.name);
            }
        });
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
        $chatBody.append('<div class="chat-message"><strong>Looking for a random stranger on the server...</strong></div>');
        $('#chat-textarea').prop("disabled", true);
        $('#upload-input').prop("disabled", true);
    });

    socket.on('user connected', function () {
        status = 1;
        imgId = 0;
        $leave.text('End');
        $('.chat-message').remove();
        $('.user-typing').remove();
        $message.val('');
        $chatBody.append('<div class="chat-message"><strong>You are connected to a random stranger. Press Esc key to disconnect.</strong></div>');
        $('#chat-textarea').prop("disabled", false);
        $('#upload-input').prop("disabled", false);
    });

    socket.on('chat end', function () {
        status = 0;
        $leave.text('Start New');
        $chatBody.append('<div class="chat-message"><strong>Your chat has been disconnected.</strong></div>');
        $chatBody.append('<div class="chat-message" id="start-chat">Click here to start chatting again.</div>');
        scrollDown();
        $('#chat-textarea').prop("disabled", true);
        $('#upload-input').prop("disabled", true);
    });

    socket.on('imageNew', function (data) {
        if (data.val) {
            var arrayBuffer = data.buffer;
            var arrayBufferView = new Uint8Array(arrayBuffer);
            var blob = new Blob([arrayBufferView], { type: "image/jpeg" });
            var imgSrc = URL.createObjectURL(blob);
            if (data.id === socket.id) {
                $chatBody.append('<div class="chat-message"><span style="color:blue;font-weight:bold">You</span>: <img src="' + imgSrc + '" class="imgChat" id="'+imgId+'"></div>');
            }
            else {
                $chatBody.append('<div class="chat-message"><span style="color:red;font-weight:bold">Stranger</span>: <img src="' + imgSrc + '" class="imgChat" id="'+imgId+'"></div>');
            }
            scrollDown();
        }
        imgId += 1;
    });

    socket.on('user typing', function (data) {
        if (data.isTyping) {
            if (data.id !== socket.id) {
                $chatBody.append('<div class="user-typing"><strong>Stranger is typing...</strong></div>');
                scrollDown();
                timeout = setTimeout(timeoutFunction, 2000);
            }
        }
        else {
            $('.user-typing').remove();
        }
    });

    var modal = document.getElementById('myModal');
    $chatBody.on('click', '.imgChat', function () {
        modal.style.display = "block";
        $('#img01').attr('src',this.src);
    });
    
    $('#myModal').on('click', function () {
        modal.style.display = "none";
    });

});