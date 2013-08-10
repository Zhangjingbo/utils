if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var upgradeAssistant = function(){};

var PKGID = 'com.labi';
//var VERSION = '1.0.0';
var APPS = '/media/cryptofs/apps';
var CONTROL = '/media/cryptofs/apps/usr/lib/ipkg/info';
var PMCONTROL = '/media/cryptofs/apps/.scripts';
var POSTINST = CONTROL + '/' + PKGID + '.postinst';
var PREINST = CONTROL + '/' + PKGID + '.postinst';
var PM_POSTINST = PMCONTROL + '/' + PKGID + '/pmPostInstall.script';
var PM_PRERM = PMCONTROL + '/' + PKGID + '/pmPreRemove.script';
var DATA_ROOT = '/media/internal/.labi';
var RESTART = 0; //0不重启，1软件重启，2硬件重启

upgradeAssistant.prototype.run = function(future, subscription){
    var init = this.controller.args.init;
    var file = this.controller.args.file;
    
    if(init === true){
        if(path.existsSync(DATA_ROOT+'/.firstuse')){
            if(path.existsSync(CONTROL + '/'+ PKGID+'.control')){
                var INST = null;
                if(path.existsSync(POSTINST)){
                    INST = POSTINST;
                }else if(path.existsSync(PM_POSTINST)){
                    INST = PM_POSTINST;
                }
                if(INST){
                    exec("/bin/sh " + INST, function(error, stdout, strerr){
                        if(error !== null){
                            future.exception = "error: " + stderr;
                        }
                        future.result = {"status": "ok", "restart": RESTART};
                    });
                }else{
                    future.result = {"status": "ok", "restart": RESTART};
                }
            }else{
                //not installed
                future.exception = "error: App not found";
            }
            fs.unlinkSync(DATA_ROOT+'/.firstuse');
        }else{
            future.result = {"status": "ok", "restart": 0};
        }
    }else{
        if(!path.existsSync(file)){
            future.exception = "file: " + file + " not found";
        }else{
            // launch
            //exec("/usr/bin/luna-send -n 1 -f palm://com.palm.power/timeout/set '{\"in\": \"00:00:8\", \"key\": \"com.labi.upgrade.timer\", \"uri\": \"palm://com.palm.applicationManager/launch\", \"params\": {\"id\": \"com.labi.app\", \"params\":{\"action\":\"upgrade\"}}}'");
            if(!path.existsSync(DATA_ROOT)){
                fs.mkdirSync(DATA_ROOT, 0777);
            }
            fs.writeFileSync(DATA_ROOT+'/.firstuse', '1');
            
            exec("/usr/bin/luna-send -n 1 palm://com.palm.appinstaller/installNoVerify '{\"target\": \""+ file +"\"}'", function(error, stdout, stderr){
                if(error !== null){
                    future.exception = "error: " + JSON.parse(stderr);
                    return false;
                }
                var data = JSON.parse(stdout);
                if(!data.returnValue){
                    future.exception = "error: " + data;
                    return false;
                }
                future.result = {"status": "ok"};
                
                //check
                /*
                var __check = function(retry){
                    retry = retry ? retry : 0;
                    exec("/usr/bin/luna-send -n 1 palm://com.palm.applicationManager/listPackages '{}'", function(error, stdout, stderr){
                        if(error !== null){
                            return false;
                        }
                        var data = JSON.parse(stdout);
                        if(!data.returnValue){
                            return false;
                        }
                        for(var i = 0; i < data.packages.length; i++){
                            var app = data.packages[i];
                            if(app.id === PKGID){
                                if(app.version !== VERSION){
                                    //done
                                }else{
                                    //retry
                                    if(retry < 5){
                                        setTimeout(function(){
                                            return __check(retry + 1);
                                        }, 1000);
                                    }
                                }
                                break;
                            }
                        }
                    });
                };
                __check();
                */
            });
        }
    }
};


/*
luna-send -n 1  palm://com.labi.service/upgrade '{"file": "/media/internal/download/com.labi_1.0.0_all.ipk"}' 
*/