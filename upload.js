/**
 * 文件上传模拟后台程序
 */
var express = require("express"); 
var app = new express();
var url = require("url");
var fs = require('fs');
// var formidable = require('formidable');
function start(route) {
    app.listen(8888);
    app.use(express.bodyParser()); 
    app.post('/', function(request,  response) {
        var pathname =  url.parse(request.url).pathname;
        var postData = "";
        console.log("request " + pathname + "received"); 
        
        // request. setEncoding("utf8"); 
        
        request.addListener("data", function(postDataChunk) {//新的小数据块到达了
            postData += postDataChunk;
            console.log("request post data chunk '" + pathname + "'."); 
        });
        request.addListener("end", function() {//所有的数据已经接受完毕
            console.log(request.files)
            route(pathname, response, postData, request);
        });

        // var form = new formidable.IncomingForm();

        // console.log("About to parse");
        // form.parse(request, function(error, fields, files){
        //     console.log("parse done");
        //     fs.renameSync(files.upload.path, "/home/tmp/test.png");
        //     console.log(files);
        //     // response.writeHead(200, {"Content-type": "text/html"});
        //     // response.write("Received image:<br>");
        //     // response.write("<image src=/show />");
        //     // response.end();
        // });
    });
    console.log('Server started');
}
start(function(pathname, response, postData, request) {
    console.log("About to route a request for "  +  pathname );
    // console.log("postData: " + postData);
    if (request.files) {
        console.log(request.files)
    }
    response.writeHead( 200,  { "Content - Type":  "text/html"}); 
    response.write('{"status": 0, "statusText": {"msg": "ok"}}');  
    response.end(); 
});