if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var readAssistant = function(){};

readAssistant.prototype.run = function(future){
    var fs = require('fs');
    var path = require('path');
    
    var file = this.controller.args.file;
    if(!path.existsSync(file)){
        //future.exception = "file: " + file + " not found";
        future.result = {"base64": ""};
    }else{
        var buffer = fs.readFileSync(file);
        var content = buffer.toString('base64');
        future.result = {"base64": content};
    }
};

/*
luna-send-n 1  palm://com.labi.service/read '{"file": "/media/internal/labi/13352837048580.28745131101459265.jpg"}' 
*/