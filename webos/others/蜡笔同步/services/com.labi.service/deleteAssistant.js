if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var fs = require('fs');
var path = require('path');

var deleteAssistant = function(){};

deleteAssistant.prototype.run = function(future){
    var file = this.controller.args.file ? this.controller.args.file : '';
    var files = this.controller.args.files ? this.controller.args.files : [];

    var count = 0;
    if(file){
        /*
        if(!path.existsSync(file)){
            future.exception = "file: " + file + " not found";
            return false;
        }
        */
        if(fs.unlinkSync(file)){
            count = 1;
        }
        future.result = {"count": count};
    }else{
        for(var i = 0; i < files.length; i++){
            if(fs.unlinkSync(files[i])){
                count++;
            }
        }
        future.result = {"count": count};
    }
};

/*
luna-send -n 1  palm://com.labi.service/delete '{"file": "/media/internal/labi/13352837048580.28745131101459265.jpg"}'
luna-send -n 1  palm://com.labi.service/delete '{"files": ["/media/internal/labi/13352837048580.28745131101459265.jpg", "2.jpg"]}'
*/