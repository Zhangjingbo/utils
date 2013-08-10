if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var fileinfoAssistant = function(){};

fileinfoAssistant.prototype.run = function(future){
    var file = this.controller.args.file;
    
    if(!path.existsSync(file)){
        //future.exception = "file: " + file + " not found";
        future.result = {};
    }else{
        var buffer = fs.readFileSync(file);
        var md5sum = crypto.createHash('md5');
        md5sum.update(buffer);
        var md5 = md5sum.digest('hex').toUpperCase();
        var fileinfo = fs.statSync(file);
        var name = file.replace(/\\/g, '/').split('/').pop();
        future.result = {"name": name, "size": fileinfo.size, "md5": md5, "path": file};
    }
};

/*
luna-send -n 1  palm://com.labi.service/fileinfo '{"file": "/media/internal/labi/13352837048580.28745131101459265.jpg"}' 
*/