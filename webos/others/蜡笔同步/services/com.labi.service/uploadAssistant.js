if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var net = require('net');
var url = require('url');
var fs = require('fs');
var path = require('path');

var uploadAssistant = function(){};

uploadAssistant.prototype.run = function(future){
    var remoteurl = this.controller.args.url;
    var file = this.controller.args.file ? this.controller.args.file : '';
    var filedata = this.controller.args.filedata ? this.controller.args.filedata : '';
    var contentType = this.controller.args.contentType ? this.controller.args.contentType : 'text/plain';
    var name = this.controller.args.name ? this.controller.args.name : 'upload';
    var filename = this.controller.args.filename ? this.controller.args.filename : '';
    
    if(file){
        if(!path.existsSync(file)){
            future.exception = "file: " + file + " not found";
            return false;
        }
        filedata = fs.readFileSync(file);
        var suffix = file.split('.').pop();
        contentType = getMime(suffix);
        filename = file.replace(/\\/g, '/').split('/').pop();
    }
    
    var upload = new Upload();
    upload.addPart(filedata, contentType, name, filename);
    upload.post(remoteurl, function(data, header, OK){
        if(OK){
            future.result = {"data": data, "header": header};
        }else{
            future.exception = "Request failure Header: "+ header;
        }
    });
};


function Upload(){
    this.boundary = '--' + new Date().getTime().toString(16);
    this.parts = [];
    this.contentLength = 0;
    
    this.addPart = function(data, contentType, name, filename){
        var data = typeof(data) == 'string' ? new Buffer(data) : data;
        var partHeader = [];
        partHeader.push((this.parts.length == 0 ? '' : "\r\n") + '--'+ this.boundary);
        partHeader.push('Content-Disposition: form-data; name="'+ name +'"' +(filename ? '; filename="'+filename+'"' : '')); //have filename mean it is a regular file
        partHeader.push('Content-Type: '+ (contentType ? contentType : 'text/plain'));
        partHeader.push('Content-Transfer-Encoding: binary');
        partHeader = partHeader.join("\r\n") + "\r\n\r\n";
        partHeader = new Buffer(partHeader);
        var part = new Buffer(partHeader.length + data.length);
        partHeader.copy(part, 0);
        data.copy(part, partHeader.length);
        this.parts.push(part);
        this.contentLength += part.length;
        return this;
    };

    this.post = function(remoteurl, callback){
        if(this.parts.length > 0){
            var part = new Buffer("\r\n--" + this.boundary+'--'); //end
            this.parts.push(part);
            this.contentLength += part.length;
        }
        
        remoteurl = url.parse(remoteurl);
        remoteurl.port = remoteurl.port ? remoteurl.port : 80;

        var header = [];
        header.push("POST "+ remoteurl.pathname +" HTTP/1.1");
        header.push("Host: " + remoteurl.host);
        header.push("Content-Type: multipart/form-data; boundary="+ this.boundary);
        header.push("Content-length: "+ this.contentLength);
        header.push("Connection: Close");
        header = header.join("\r\n") + "\r\n\r\n";
        
        var conn = this.open(remoteurl.port, remoteurl.host);
        var that = this;
        conn.on('connect', function(){
            conn.write(header);
            for(var i in that.parts){
                conn.write(that.parts[i]);
            }
        });
        
        conn.on("data", function(data, header){
            conn.end();
            data = data.toString('utf8');
            data = data.match(/^([\w\W]+?)\r\n\r\n([\w\W]+)$/);
            var header = data[1];
            var body = data[2];
            var OK = header.match(/200 OK/) ? true : false;
            if(typeof(callback) == 'function'){
                return callback(body, header, OK);
            }
        });
    };
    
    this.open = function(port, host){
        var conn = net.createConnection(port, host);
        conn.setEncoding("utf8");
        conn.setTimeout(30000);
        return conn;
    };
};

function getMime(suffix){
    var MIMES = {
        "html": "text/html",
        "htm": "text/html",
        "shtml": "text/html",
        "css": "text/css",
        "xml": "text/xml",
        "gif": "image/gif",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "js": "application/x-javascript",
        "atom": "application/atom+xml",
        "rss": "application/rss+xml",
        "mml": "text/mathml",
        "txt": "text/plain",
        "jad": "text/vnd.sun.j2me.app-descriptor",
        "wml": "text/vnd.wap.wml",
        "htc": "text/x-component",
        "png": "image/png",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "wbmp": "image/vnd.wap.wbmp",
        "ico": "image/x-icon",
        "jng": "image/x-jng",
        "bmp": "image/x-ms-bmp",
        "svg": "image/svg+xml",
        "jar": "application/java-archive",
        "war": "application/java-archive",
        "ear": "application/java-archive",
        "hqx": "application/mac-binhex40",
        "doc": "application/msword",
        "pdf": "application/pdf",
        "ps": "application/postscript",
        "eps": "application/postscript",
        "ai": "application/postscript",
        "rtf": "application/rtf",
        "xls": "application/vnd.ms-excel",
        "ppt": "application/vnd.ms-powerpoint",
        "wmlc": "application/vnd.wap.wmlc",
        "xhtml": "application/vnd.wap.xhtml+xml",
        "kml": "application/vnd.google-earth.kml+xml",
        "kmz": "application/vnd.google-earth.kmz",
        "7z": "application/x-7z-compressed",
        "cco": "application/x-cocoa",
        "jardiff": "application/x-java-archive-diff",
        "jnlp": "application/x-java-jnlp-file",
        "run": "application/x-makeself",
        "pl": "application/x-perl",
        "pm": "application/x-perl",
        "prc": "application/x-pilot",
        "pdb": "application/x-pilot",
        "rar": "application/x-rar-compressed",
        "rpm": "application/x-redhat-package-manager",
        "sea": "application/x-sea",
        "swf": "application/x-shockwave-flash",
        "sit": "application/x-stuffit",
        "tcl": "application/x-tcl",
        "tk": "application/x-tcl",
        "der": "application/x-x509-ca-cert",
        "pem": "application/x-x509-ca-cert",
        "crt": "application/x-x509-ca-cert",
        "xpi": "application/x-xpinstall",
        "zip": "application/zip",
        "bin": "application/octet-stream",
        "exe": "application/octet-stream",
        "dll": "application/octet-stream",
        "deb": "application/octet-stream",
        "dmg": "application/octet-stream",
        "eot": "application/octet-stream",
        "iso": "application/octet-stream",
        "img": "application/octet-stream",
        "msi": "application/octet-stream",
        "msp": "application/octet-stream",
        "msm": "application/octet-stream",
        "mid": "audio/midi",
        "midi": "audio/midi",
        "kar": "audio/midi",
        "mp3": "audio/mpeg",
        "ra": "audio/x-realaudio",
        "3gpp": "video/3gpp",
        "3gp": "video/3gpp",
        "mpeg": "video/mpeg",
        "mpg": "video/mpeg",
        "mov": "video/quicktime",
        "flv": "video/x-flv",
        "mng": "video/x-mng",
        "asx": "video/x-ms-asf",
        "asf": "video/x-ms-asf",
        "wmv": "video/x-ms-wmv",
        "avi": "video/x-msvideo"
    };
    
    suffix = suffix ? suffix.toLowerCase() : 'UNKNOW';
    var mime = 'application/octet-stream';
    if(MIMES.hasOwnProperty(suffix)){
        mime = MIMES[suffix];
    }
    return mime;
}

/*
luna-send-n 1  palm://com.labi.service/upload '{"file": "/media/internal/labi/13352837048580.28745131101459265.jpg"}'
luna-send-n 1  palm://com.labi.service/upload '{"filedata": "<html>hi</html>"}'
*/