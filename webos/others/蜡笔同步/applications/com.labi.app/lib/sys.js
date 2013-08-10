//luna-send -n 1 -f palm://com.palm.systemservice/time/getSystemTime '{}' -> timezone info
//luna-send -n 1 -f palm://com.palm.systemservice/getPreferences '{"keys": ["local"]}' -> timezone info
//luna-send -n 1 -f palm://com.palm.telephony/phoneNumberQuery '{}'
//luna-send -n 1 -f palm://com.palm.telephony/imeiQuery '{}' //gsm
//luna-send -n 1 -f palm://com.palm.telephony/meidQuery '{}' //cdma
//luna-send -n 1 -f palm://com.palm.telephony/iccidQuery '{}' //gsm
//luna-send -n 1 -f palm://com.palm.telephony/esnQuery '{}' //cdma
//luna-send -n 1 -f palm://com.palm.telephony/activationInfoQuery '{}' //cdma response.extended.msid
//luna-send -n 1 -f -a com.labi.app palm://com.palm.deviceprofile/getDeviceId '{}' //IMEI
//luna-send -n 1 -f -a com.labi.app palm://com.palm.deviceprofile/getDeviceProfile '{}' //PhotoNumber, etc...
//luna-send -n 1 -f palm://com.labi.service/device '{}'
//以上都无权限

enyo.kind({
    name: "Sys",
    kind: enyo.Component,
    components: [
        //palm
        {kind: "PalmService", name: "conn", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.connectionmanager/", subscribe: true},
        {kind: "PalmService", name: "sys", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.systemservice/time/", subscribe: true},
        {kind: "PalmService", name: "labi", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.labi.service/"},
        {kind: "PalmService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.applicationManager/"},
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"}
    ],
    
    startup: function(callback){
        var self = this;
        self.$.labi.onFailure = 'palmFailure';
        self.$.labi.onSuccess = 'upgradeSuccess';
        self.$.labi.setMethod('upgrade');
        self.$.labi.call({"init": true});
        self.upgradeSuccess = function(inSender, inResponse){
            if(inResponse && inResponse.status == 'ok'){
                if(inResponse.restart == 0){
                    return self.init(callback);
                }else if(inResponse.restart == 1){
                    ui.showMsg('请再次手动重启蜡笔软件');
                }else if(inResponse.restart == 2){
                    ui.showMsg('请将手机重启以使软件生效');
                }else{
                    return self.init(callback);
                }
            }else{
                //升级升败
                ui.halt('升级升败');
            }
        };
        
        /*
        var params = enyo.windowParams;
        if(params.action == 'upgrade'){
            self.$.labi.onFailure = 'palmFailure';
            self.$.labi.onSuccess = 'upgradeSuccess';
            self.$.labi.setMethod('upgrade');
            self.$.labi.call({"init": true});
            self.upgradeSuccess = function(inSender, inResponse){
                if(inResponse && inResponse.status == 'ok'){
                    if(inResponse.restart == 0){
                        return self.init(callback);
                    }else if(inResponse.restart == 1){
                        ui.showMsg('请再次手动重启蜡笔软件');
                    }else if(inResponse.restart == 2){
                        ui.showMsg('请将手机重启以使软件生效');
                    }else{
                        return self.init(callback);
                    }
                }else{
                    //升级升败
                    ui.halt('升级升败');
                }
            };
        }else{
            return self.init(callback);
        }
        */
    },
    
    init: function(callback){
        BOOTING = true;
        var lang = new enyo.g11n.currentLocale().locale;
        _G.lang = lang ? lang : _G.lang;
        enyo.setAllowedOrientation('up');
        var info = enyo.fetchDeviceInfo();
        _G.model = info.modelName ? info.modelName : '';

        //异步
        var self = this;
        self.getSysTime(function(){ //时间subscribe
            self.checkConnect(function(){ //网络subscribe
                self.getDevice(function(){ //设备信息
                    return user.checkActivate(callback);
                });
            }, true);
        }, true);

        //check if boot ok
        setTimeout(function(){
            if(BOOTING == true){
                BOOTING = false;
                return callback();
            }
        }, 10000);
    },

    getDevice: function(callback){
        var self = this;
        self.$.labi.onFailure = 'deviceFailure';
        self.$.labi.onSuccess = 'deviceSuccess';
        self.$.labi.setMethod('device');
        self.$.labi.call();
        self.deviceSuccess = function(inSender, inResponse){//enyo.log(inResponse);
            //ui.showMsg("测试信息="+JSON.stringify(inResponse));
            if(inResponse && inResponse.returnValue){
                _G.imei = typeof(inResponse.imei) == 'string' ? inResponse.imei : '';
                _G.iccid = typeof(inResponse.iccid) == 'string' ? inResponse.iccid : '';
                _G.imei = _G.imei.replace(/[^a-z0-9_-]/gi, '');
                _G.iccid = _G.iccid.replace(/[^a-z0-9_-]/gi, '');
                
                if(_G.imei == '' || _G.iccid == ''){
                    //BOOTING = false
                    //ui.halt('获取硬件信息失败，请关闭软件重试');
                }
                //_G.imei = '01260400076306502';
                //_G.iccid = '89860065011000013033';
                return typeof(callback) == 'function' ? callback() : true;
            }else{
                //BOOTING = false;
                //ui.halt('获取硬件信息失败，请关闭软件重试');
                return typeof(callback) == 'function' ? callback() : true;
            }
        };
        self.deviceFailure = function(inSender, inError){
            //enyo.log("inError=" + enyo.json.stringify(inError));
            //BOOTING = false;
            //ui.halt('获取硬件信息失败，请关闭软件重试');
            return typeof(callback) == 'function' ? callback() : true;
        };
    },
    
    checkConnect: function(callback, first){
        this.$.conn.onFailure = 'palmFailure';
        this.$.conn.onSuccess = 'connSuccess';
        this.$.conn.setMethod('getStatus');
        this.$.conn.call();
        
        this.connSuccess = function(inSender, inResponse){
            if(inResponse.isInternetConnectionAvailable){
                _G.is_online = true;
                var wifi = false;
                if(inResponse.wifi && inResponse.wifi.state == 'connected'){
                    //_G.is_online = inResponse.wifi.onInternet == 'yes' ? true : false;
                    _G.net = 'wifi';
                    wifi = true;
                }else if(inResponse.wan && inResponse.wan.state == 'connected'){
                    //_G.is_online = inResponse.wan.onInternet == 'yes' ? true : false;
                    _G.net = inResponse.wan.network;
                }else if(inResponse.vpn && inResponse.vpn.state == 'connected'){
                    _G.net = 'vpn';
                }else if(inResponse.bridge && inResponse.bridge.state == 'connected'){
                    _G.net = 'bridge';
                }else{
                    _G.net = 'unknown';
                }
                if(wifi == true){
                    _G.net = 'wifi';
                }
            }else{
                _G.net = 'offline';
            }
            //enyo.log("connSuccess=" + enyo.json.stringify(inResponse));
            if(first == true && typeof(callback) == 'function'){ //第一次时会有returnValue=true
                first = false;
                return callback();
            }
        };
    },
    
    getSysTime: function(callback, first){
        this.$.sys.onFailure = 'palmFailure';
        this.$.sys.onSuccess = 'sysSuccess';
        this.$.sys.setMethod('getSystemTime');
        this.$.sys.call();
        
        this.sysSuccess = function(inSender, inResponse){
            if(inResponse && inResponse.offset){
                _G.timezone = inResponse.offset; //分钟
            }
            //enyo.log("sysSuccess=" + enyo.json.stringify(inResponse));
            if(first == true && typeof(callback) == 'function'){
               first = false;
               return callback();
            }
        };
    },
    
    browse: function(url){
        this.onFailure = this.palmFailure;
        this.onSuccess = function(inSender, inResponse){
            //enyo.log("inSender=" + inSender);
        };
        this.onResponse = this.onSuccess;
    
        this.$.web.setMethod('launch');
        var args = {id: "com.palm.app.browser", params: {"target": url}};
        this.$.web.call(args);
    },

    palmFailure: function(inSender, inError){
        //enyo.log("inError=" + enyo.json.stringify(inError));
        return false;
    },
    
    getTimestamp: function(callback){
        var sql = {"query": {"from": "com.labi:1", "where": [{"prop": "username", "op": "=", "val": _G.username}], "limit": 1}};
        this.$.db.onFailure = 'getTimestampFailure';
        this.$.db.onSuccess = 'getTimestampSuccess';
        this.$.db.setMethod('find');
        this.$.db.call(sql);
        
        this.getTimestampFailure = function(inSender, inResponse, inRequest){
            return sync.dbFailure(inSender, inResponse, inRequest);
        };
        this.getTimestampSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs && rs.results.length > 0){
                rs = rs.results[0];
            }else{
                rs = {};
            }
            return callback(rs);
        };
    },
    
    //保存流量
    saveBw: function(callback){
        var bw = _G.bw;
        var timestamp = util.timestamp();
        var type = _G.net == 'wifi' ? 'wifi' : 'wan';

        var sql = {"objects": [{"_kind": "com.labi.bw:1", "type": type, "timestamp": timestamp, "bw": bw}]};
        this.$.db.onFailure = 'savebwFailure';
        this.$.db.onSuccess = 'savebwSuccess';
        this.$.db.setMethod('put');
        this.$.db.call(sql);
        
        this.savebwFailure = function(inSender, inResponse, inRequest){
            return sync.dbFailure(inSender, inResponse, inRequest);
        };
        this.savebwSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            _G.bw = 0; //清空本次流量
            return typeof(callback) == 'function' ? callback() : true; 
        };
    },
    //获得流量
    getBw: function(callback){
        var bw = 0;
        var type = 'wan';//'';wifi
        //取当月1号
        var timestamp = util.timestamp();
        var date = util.date(timestamp, _G.timezone / 60);
        var dt = date.match(/(\d+)/g);
        date = dt[0] + "-" + dt[1] + "-01 00:00:00";
        timestamp = util.str2time(date, _G.timezone / 60);

        var sql = {
            "query": {
                "select": ["bw", "timestamp"],
                "from": "com.labi.bw:1",
                "orderBy": "timestamp",
                "desc": true,
                "where": [{"prop": "type", "op": "=", "val": type}, {"prop": "timestamp", "op": ">=", "val": timestamp}]
            }
        };
        this.$.db.onFailure = 'bwfailure';
        this.$.db.onSuccess = 'bwSuccess';
        this.$.db.setMethod('find');
        this.$.db.call(sql);
        
        this.bwFailure = function(inSender, inResponse, inRequest){
            return sync.dbFailure(inSender, inResponse, inRequest);
        };
        this.bwSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs && rs.results.length > 0){
                for(var i = 0; i < rs.results.length; i++){
                    bw += rs.results[i].bw;
                }
                if(bw < 1024){
                    bw = bw + 'B';
                }else if(bw < (1024*1024)){
                    bw = (bw/1024).toFixed(2) + 'K';
                }else if(bw < (1024*1024*1024)){
                    bw = (bw/1024/1024).toFixed(2) + 'M';
                }else{
                    bw = (bw/1024/1024/1024).toFixed(4) + 'G';
                }
            }
            return typeof(callback) == 'function' ? callback(bw) : true; 
        };
    }
});