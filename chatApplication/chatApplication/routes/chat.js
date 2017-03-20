var express = require('express');
var multer = require('multer')
var router = express.Router();
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

router.buff = [];

/* GET home page. */
router.get('/', function (req, res) {
    res.render('chat');
});

router.post('/', upload.any(), function (req, res) {

    if (req.files) {
        var len = req.files.length;
        for (var i = 0; i < len; i++) {
            var buff = req.files[i].buffer;
            var name = req.files[i].originalname;
            router.buff[name] = buff;
        }
        req.files = [];
        res.end('success');
    } else {
        console.log('failed');
    }
    
});

module.exports = router;