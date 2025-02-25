var express = require('express');
var router = express.Router();

var fileService = require('../services/file_service');

router.get('/open', function(req, res, next) {
  const { collectionId, docId } = req.query;
  console.log(collectionId, docId);
  fileService.openFile(collectionId, docId, (err, data) => {
    if (err) {
      res.json({ success: false, message: '无法打开文件' });
    } else {
      res.json({ success: true });
    }
  });
});

module.exports = router;
