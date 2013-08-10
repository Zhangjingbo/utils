enyo.kind({
    name: "User",
    kind: enyo.Component,
    components: [
        {kind: "WebService", name: "login", onSuccess: "loginSuccess", onFailure: "loginFailure", method: "POST", url: gozapHost+"/xauth/access_token"},
        {kind: "WebService", name: "register", onSuccess: "registerSuccess", onFailure: "registerFailure", method: "POST", url: gozapHost+"/service/register"},
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        {kind: "WebService", name: "checkActivate", onSuccess: "checkActivateSuccess", onFailure: "checkActivateFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        {kind: "WebService", name: "checkStatus", onSuccess: "checkStatusSuccess", onFailure: "checkStatusFailure", method: "POST", url: gozapHost+"/service/ngsync"}
    ],
    
    constructor: function(){
        this.inherited(arguments);
        this.$$ = {onSuccess: function(){}, onFailure: function(){}, self: new Object()};
        this.__RETRY__ = 0;
    },
    
    checkLogin: function(){
        //check login
        var username = enyo.getCookie(APPID+'_username');
        var access_token = enyo.getCookie(APPID+'_access_token');
        if(username && access_token){
            _G.username = username;
            _G.access_token = access_token;
            _G.is_login = true;
        }
        return _G.is_login;
    },

    login: function(username, password){
        //this.checkDevice();
        if(username == '' || password == ''){
            ui.showMsg('请填写用户名和密码');
            return false;
        }
        username = username.toLowerCase();
        
        var url = 'http://api.gozap.com/xauth/access_token';//this.$.login.getUrl();
        var x_auth_username = username + "@gozap.com/mobile_" + _G.imei;
        var params = {
            "oauth_consumer_key": oauth_consumer_key,
            "oauth_nonce": util.random(1000000, 9000000),
            "oauth_timestamp": util.time(),
            "oauth_signature_method": "HMAC-SHA1",
            "oauth_version": "1.0",
            "x_auth_username": x_auth_username,
            "x_auth_password": password,
            "x_auth_model": "client_auth"
        }
        var querystring = util.toQueryString2(util.ksort(params));
        var base_string  = 'POST&' + util.urlencode(url) + '&' + util.urlencode(querystring);
        params.oauth_signature  = util.signature(base_string, oauth_consumer_secret);

        this.$$.username = username;
        this.$.login.call(params);
        ui.waitingOpen('正在登录...');
    },
    loginSuccess: function(inSender, inResponse, inRequest){
        ui.waitingClose();
        if(inResponse == ''){
           ui.showMsg('网络连接失败，请重试');
           return false;
        }
        //enyo.log("login="+JSON.stringify(inResponse));
        var rs = util.xml2json(inResponse);
        try {
            if(rs.result.code['#text'] == '200'){
                //setcookie
                var username = this.$$.username;
                var access_token = rs.result.data.access_token['#text'];
                enyo.setCookie(APPID+'_username', username, {"expires": 1000});
                enyo.setCookie(APPID+'_access_token', access_token, {"expires": 1000});
                if(this.checkLogin()){
                    var self = this;
                    BOOTING = true;
                    self.checkActivate(function(){
                        self.$$.onSuccess(self.$$.self, rs.result);
                    });
                    //check if boot ok
                    setTimeout(function(){
                        if(BOOTING == true){
                            BOOTING = false;
                            ui.showMsg('登录超时，请重试');
                        }
                    }, 5000);
                }else{
                    ui.showMsg('登录失败，请重试');
                }
            }else{//enyo.log('登录失败，错误信息：' + rs.result.message['#text'] + '(' + rs.result.code['#text'] + ')');
                //ui.showMsg('登录失败，错误信息：' + rs.result.message['#text'] + '(' + rs.result.code['#text'] + ')');
                var code = parseInt(rs.result.code['#text']);
                var map = { 40111: '用户名或密码不正确', 400013: '令牌获取失败', 400012: '无效的签名'};
                var msg = map[code];
                msg = msg ? msg : '目前服务不可用，请稍后重试！';
				ui.showMsg(msg);
            }
        }catch(e){
            //ui.showMsg('程序异常, 错误信息：' + e.message);
			ui.showMsg('服务器返回异常数据');
        }
    },
    loginFailure: function(inSender, inResponse, inRequest){
        ui.waitingClose();
        //ui.showMsg('服务器连接失败, 错误代码：' + inRequest.xhr.status);
		ui.showMsg('服务器连接失败');
        this.$$.onFailure(this.$$.self, inRequest.xhr.status); //inRequest.xhr.getResponseHeader("Content-Type")
    },
    
    logout: function(){
        enyo.setCookie(APPID+'_username', '', {"Max-Age": 0});
        enyo.setCookie(APPID+'_access_token', '', {"Max-Age": 0});
        
        _G.username = '';
        _G.access_token = '';
        _G.is_login = false;
    },
    
    register: function(is_agree, username, email, password){
        if(!is_agree){
            ui.showMsg('您需要接受我们的服务条款才可以注册');
            return false;
        }
        var re = /^[a-zA-Z0-9_]{5,20}$/g;
        if(!username.match(re)){
            ui.showMsg('用户名使用英文字母、数字、下划线或组合，5-20个字符');
            return false;
        }
        if(password.length < 6 || password.length > 16){
            ui.showMsg('密码长度6-16位');
            return false;
        }
        if(!email.match(/[a-zA-Z0-9\.-]+@[a-zA-Z0-9\.-]+\.[A-Za-z]{2,4}$/g)){
            ui.showMsg('请填写正确的邮箱');
            return false;
        }
        //need login
        this.$$.username = username;
        this.$$.password = password;
        
        var url = this.$.register.getUrl();
        username += '@gozap.com';
        var params = {
            "oauth_consumer_key": oauth_consumer_key,
            "username": username,
            "password": password,
            "email": email
        }
        var base_string = oauth_consumer_secret + '&' + oauth_consumer_key + '&' + username + '&' + password;
        params.oauth_signature  = util.signature(base_string, oauth_consumer_secret);
        
        this.$.register.call(params);
        ui.waitingOpen('正在注册...');
    },
    registerSuccess: function(inSender, inResponse, inRequest){
        ui.waitingClose();
        if(inResponse == ''){
           ui.showMsg('网络连接失败，请重试');
           return false;
        }

        var rs = util.xml2json(inResponse)
        //enyo.log("register="+JSON.stringify(inResponse));
        try {
            if(rs.result.code['#text'] == '200'){
                //just login
                this.login(this.$$.username, this.$$.password);
            }else{
                //ui.showMsg('服务器返回异常数据' + rs.result.message['#text'] + '(' + rs.result.code['#text'] + ')');
                var code = parseInt(rs.result.code['#text']);
                var map = {400: '目前服务不可用，请稍后重试！', 403: '目前服务不可用，请稍后重试！', 409: '此用户名已被注册，请另换一个', 419: '保密邮箱已被使用，请另换一个'};
                var msg = map[code];
                msg = msg ? msg : '目前服务不可用，请稍后重试！';
				ui.showMsg(msg);
            }
        }catch(e){
            //ui.showMsg('程序错误, 错误信息：' + e.message);
			ui.showMsg('服务器返回异常数据');
        }
    },
    registerFailure: function(inSender, inResponse, inRequest){
        ui.waitingClose();
        ui.showMsg('服务器连接失败, 错误代码：' + inRequest.xhr.status);
        this.$$.onFailure(this.$$.self, inRequest.xhr.status);
    },
    
    //---------------
    setCallback: function(callbacks){
        if(typeof(callbacks.self) == 'object'){
            this.$$.self = callbacks.self;
        }
        if(typeof(callbacks.onSuccess) == 'function'){
            this.$$.onSuccess = callbacks.onSuccess;
        }
        if(typeof(callbacks.onFailure) == 'function'){
            this.$$.onFailure = callbacks.onFailure;
        }
    },
    
    //检测用户状态status=13时退出让其重新登录
    checkStatus: function(callback){
        //this.checkDevice();
        var self = this;
        
        var method = 'sync.status.get';
        var postdata = '<item><imsi>'+ _G.iccid +'</imsi><imei>'+ _G.imei +'</imei></item>';
        var params = sync.getParams(method, postdata);
        self.$.checkStatus.call(params);
        
        self.checkStatusFailure = function(inSender, inResponse, inRequest){
            return typeof(callback) == 'function' ? callback(false) : true; //检测失败返回false
        };
        self.checkStatusSuccess = function(inSender, inResponse, inRequest){//enyo.log(inResponse);
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            var istatus = 0;
            if(rs){
                self.__RETRY__ = 0;
                var items = parseInt(rs.data.query['@attributes'].items); //有可能有多条记录
                if(items == 0){ //上传用户信息
                    istatus = 0;
                }else{
                    var obj = rs.data.query.item.length ? rs.data.query.item[0] : rs.data.query.item; //可以有多个item
                    var istatus = parseInt(obj.istatus['#text']); //istatus为激活的一些状态，可参见文档
                }
                return callback(istatus);
            }else{
                if(self.__RETRY__ < 5){
                    self.__RETRY__ += 1;
                    return self.checkStatus(callback);
                }else{
                    return typeof(callback) == 'function' ? callback(istatus) : true;
                }
            }
        };
    },
    
    //检测是否激活
    checkActivate: function(callback){
        //this.checkDevice();
        if(!this.checkLogin()){
            BOOTING = false;
            return typeof(callback) == 'function' ? callback(_G.is_activate) : true;
        }
        
        var self = this;
        self.checkActivateFailure = function(inSender, inResponse, inRequest){
            BOOTING = false;
            return typeof(callback) == 'function' ? callback(_G.is_activate) : true;
        };
        self.checkActivateSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            //enyo.log(JSON.stringify(inResponse));
            if(rs){
                self.__RETRY__ = 0;
                var items = parseInt(rs.data.query['@attributes'].items); //有可能有多条记录
                if(items == 0){ //上传用户信息
                    _G.is_activate = 1; //是否激活标志
                }else{
                    var objs = rs.data.query.item.length ? rs.data.query.item : [rs.data.query.item]; //可以有多个item
                    var pnum = '';
                    var istatus = 0;
                    var imsi = '';
                    var imei = '';
                    var brand = '';
                    var model = '';
                    var platform = '';
                    for(var i = 0; i< objs.length; i++){
                        var obj = objs[i];
                        obj.pnum = typeof(obj.pnum.length) == 'number' ? obj.pnum[0] : obj.pnum;
                        pnum = obj.pnum['#text']; //绑定的手机号
                        pnum = typeof(pnum) == 'undefined' ? '' : pnum;
                        istatus = parseInt(obj.istatus['#text']); //istatus为激活的一些状态，可参见文档
                        imsi = obj.imsi ? obj.imsi['#text'] : '';
                        imei = obj.imei ? obj.imei['#text'] : '';
                        brand = obj.brand ? obj.brand['#text'] : '';
                        model = obj.model ? obj.model['#text'] : '';
                        platform = obj.platform ? obj.platform['#text'] : '';
                        if(pnum != ''){
                            break;
                        }
                    }
                    if(pnum != ''){
                        _G.is_activate = 2;
                    }else{
                        _G.is_activate = 1;
                    }
                }
                if(brand != 'HP' || model != _G.model || platform != 'webos'){
                    self.setActivate(function(){
                        BOOTING = false;
                        return callback(_G.is_activate);
                    });
                }else{
                    BOOTING = false;
                    return callback(_G.is_activate);
                }
            }else{
                if(self.__RETRY__ < 5){
                    self.__RETRY__ += 1;
                    return self.checkActivate(callback);
                }else{
                    BOOTING = false;
                    return typeof(callback) == 'function' ? callback(_G.is_activate) : true;
                }
            }
        };
        var method = 'sync.status.get';
        var postdata = '<item><imsi>'+ _G.iccid +'</imsi><imei>'+ _G.imei +'</imei></item>';
        var params = sync.getParams(method, postdata);
        self.$.checkActivate.call(params);
    },
    
    //获得激活码
    getActivate: function(callback){
        this.checkDevice();
        var self = this;
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            //enyo.log("inResponse="+JSON.stringify(inResponse));
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            if(rs){
                var obj = rs.data.query.item;
                var data = {"pre": "", "code": "", "timeout": 0, "sps": []};
                data.pre = obj.pre ? obj.pre['#text'] : '';
                data.code = obj.code ? obj.code['#text'] : '';
                data.timeout = obj.timeout ? parseInt(obj.timeout['#text']) : 0;
                if(obj.sp.length){
                    for(var i = 0; i < obj.sp.length; i++){
                        data.sps.push(obj.sp[i]['#text']);
                    }
                }else{
                    data.sps.push(obj.sp['#text']);
                }
                return callback(data);
            }else{
                return callback('');
            }
        };
        
        var method = 'sync.activate.get';
        var postdata = '<item>';
        postdata += '<imsi>'+ _G.iccid +'</imsi>';
        postdata += '<imei>'+ _G.imei +'</imei>';
        postdata += '<brand>HP</brand>';
        postdata += '<model>'+ _G.model +'</model>';
        postdata += '<platform>webos</platform>';
        postdata += '<language>'+ _G.lang +'</language>';
        postdata += '<version>'+ VERSION +'</version>';
        postdata += '<timezone>'+ (_G.timezone/60) +'</timezone>';
        postdata += '</item>';
        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    
    
    //设置激活
    //设置业务状态激活码请求消息
    setActivate: function(callback){
        this.checkDevice();
        var self = this;
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            //enyo.log("inResponse="+JSON.stringify(inResponse));
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            return typeof(callback) == 'function' ? callback() : true;
        };
        
        var method = 'sync.status.set';
        var postdata = '<item>';
        postdata += '<imsi>'+ _G.iccid +'</imsi>';
        postdata += '<imei>'+ _G.imei +'</imei>';
        postdata += '<brand>HP</brand>';
        postdata += '<model>'+ _G.model +'</model>';
        postdata += '<platform>webos</platform>';
        
        postdata += '<version>'+ VERSION +'</version>';
        postdata += '<timezone>'+ (_G.timezone/60) +'</timezone>';
        
        postdata += '<cntStatus>0</cntStatus>';
        postdata += '<smsStatus>0</smsStatus>';
        postdata += '<crcStatus>0</crcStatus>';
        postdata += '<calStatus>0</calStatus>';
        postdata += '<sfwStatus>0</sfwStatus>';
        postdata += '<timeStatus>0</timeStatus>';
        
        postdata += '</item>';
        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    
    checkDevice: function(){
        if(_G.imei == '' || _G.iccid == ''){
            BOOTING = false
            ui.halt('获取硬件信息失败，请关闭软件重试');
        }else{
            return true;
        }
    }
});