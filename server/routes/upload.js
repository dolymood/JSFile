
/*
 * upload page.
 */
var fs = require('fs');
exports.upload = function(req, res){
    console.log(req.files);
    var fd = req.files.filedata;
    if (fd.length) {
    	fd.forEach(function(_fd) {
    		var target_path = './public/images/' + _fd.name;
		    var tmp_path = _fd.path;
		    // 移动文件
		    fs.rename(tmp_path, target_path, function(err) {
		      if (err) throw err;
		      // 删除临时文件夹文件, 
		      fs.unlink(tmp_path, function() {
		         if (err) throw err;
		      });
		    });
    	});
    } else {
    	var target_path = './public/images/' + fd.name;
	    var tmp_path = fd.path;
	    // 移动文件
	    fs.rename(tmp_path, target_path, function(err) {
	      if (err) throw err;
	      // 删除临时文件夹文件, 
	      fs.unlink(tmp_path, function() {
	         if (err) throw err;
	      });
	    });
    }
    res.writeHead(200, {'Content-Type': 'text/plain'});
     res.write(JSON.stringify({
    	status: 1,
    	statusText: {
    		msgs: 'ok'
    	}
     }));
     res.end();
};