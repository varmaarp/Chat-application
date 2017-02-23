var express = require('express');
var multer = require('multer')
var router = express.Router();
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

router.b = [];

/* GET home page. */
router.get('/', function (req, res) {
    res.render('chat');
});

router.post('/', function (req, res) {
    console.log('in post');
    
});

module.exports = router;