/**
 * 文件上传模拟后台程序
 */
var http = require("http");  //请求node.js自带的 http 模块 会得到一个对象
var url = require("url");
var fs = require('fs');
function start(route) {
    http.createServer(function( request,  response ) { // request 对象 包含了请求的一些参数 // response 对象 相应请求的对象
        var pathname =  url.parse(request.url).pathname;
        var postData = "";
        console.log("request " + pathname + "received"); 
        
        request. setEncoding("utf8"); 
        
        request.addListener("data", function(postDataChunk) {//新的小数据块到达了
            postData += postDataChunk;
            console.log("request post data chunk '" + pathname + "'."); 
        });
        request.addListener("end", function() {//所有的数据已经接受完毕
            console.log(request.files)
            route(pathname, response, postData, request);
        });
        
    }).listen (8888);  // listen HTTP服务器监听的端口号 这里设置为8080
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