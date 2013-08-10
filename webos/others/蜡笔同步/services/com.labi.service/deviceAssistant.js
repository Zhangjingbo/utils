if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var exec = require('child_process').exec;

var deviceAssistant = function(){};

deviceAssistant.prototype.run = function(future){

    var imei = '';
    var iccid = '';
    
    var self = this;
    self.getImei(future, function(data){
        imei = data;
        self.getIccid(future, function(data){
            iccid = data;
            future.result = {"imei": imei, "iccid": iccid};
        });
    });
};

deviceAssistant.prototype.getImei = function(future, callback){
    exec("luna-send -n 1 -a com.palm.app.deviceinfo palm://com.palm.telephony/imeiQuery '{}'", function(error, stdout, stderr){
        if(error !== null){
            future.exception = "error: " + stderr;
            return false;
        }else{
            var imei_data = JSON.parse(stdout);
            if(imei_data.errorCode == 0 && imei_data.extended && imei_data.extended.value){
                var imei = imei_data.extended.value;
                return callback(imei);
            }else{
                exec("luna-send -n 1 -a com.palm.app.deviceinfo palm://com.palm.telephony/meidQuery '{}'", function(error, stdout, stderr){
                    if(error !== null){
                        future.exception = "error: " + stderr;
                        return false;
                    }else{
                        var meid_data = JSON.parse(stdout);
                        if(meid_data.errorCode == 0 && meid_data.extended && meid_data.extended.value){
                            var meid = meid_data.extended.value;
                            return callback(meid);
                        }else{
                            return callback('');
                        }
                    }
                });
            }
        }
    });
};

deviceAssistant.prototype.getIccid = function(future, callback){
    exec("luna-send -n 1 -a com.palm.app.deviceinfo palm://com.palm.telephony/iccidQuery '{}'", function(error, stdout, stderr){
        if(error !== null){
            future.exception = "error: " + stderr;
            return false;
        }else{
            var iccid_data = JSON.parse(stdout);
            if(iccid_data.errorCode == 0 && iccid_data.extended && iccid_data.extended.value){
                var iccid = iccid_data.extended.value;
                return callback(iccid);
            }else{
                exec("luna-send -n 1 -a com.palm.app.deviceinfo palm://com.palm.telephony/esnQuery '{}'", function(error, stdout, stderr){
                    if(error !== null){
                        future.exception = "error: " + stderr;
                        return false;
                    }else{
                        var esn_data = JSON.parse(stdout);
                        if(esn_data.errorCode == 0 && esn_data.extended && esn_data.extended.value){
                            var esn = esn_data.extended.value;
                            return callback(esn);
                        }else{
                            return callback('');
                        }
                    }
                });
            }
        }
    });
};

/*
luna-send -n 1  palm://com.labi.service/device '{}' 
*/