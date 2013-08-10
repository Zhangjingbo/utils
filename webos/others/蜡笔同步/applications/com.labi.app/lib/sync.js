enyo.kind({
    name: "Sync",
    kind: enyo.Component,
    components: [
    
    ],
    
    constructor: function(){
        this.inherited(arguments);
        this.callbacks = {onSuccess: function(){}, onFailure: function(){}, self: new Object()};
        this._ = {};
    },
    
    getInstance: function(obj_name){
        //return new window[obj_name]();

        var fn = window || this;
        if(typeof(this._[obj_name]) != 'object'){
            this._[obj_name] = new fn[obj_name]();
        }
        return this._[obj_name];
    },
    
    //同步联系人
    //method = S2C[Server to Client],C2S[Client to Server],SCD[Server & Client dual], RES[Restore]
    contact: function(method, args){
        var obj = this.getInstance('Contact');
        if(typeof(obj[method]) == 'function'){
            obj[method](args);
        }else{
            ui.showMsg('未知的同步方案');
            return false;
        }
    },

    //同步SMS/MMS短信
    sms: function(method, args){
        var obj = this.getInstance('Sms');
        if(typeof(obj[method]) == 'function'){
            obj[method](args);
        }else{
            ui.showMsg('未知的同步方案');
            return false;
        }
    },
    
    //同步通话记录CRC
    crc: function(method, args){
        var obj = this.getInstance('Crc');
        if(typeof(obj[method]) == 'function'){
            obj[method](args);
        }else{
            ui.showMsg('未知的同步方案');
            return false;
        }
    },
    
    //同步日程
    calendar: function(method, args){
        var obj = this.getInstance('Calendar');
        if(typeof(obj[method]) == 'function'){
            obj[method](args);
        }else{
            ui.showMsg('未知的同步方案');
            return false;
        }
    },
    
    //同步照片
    photo: function(method, args){
        var obj = this.getInstance('Photo');
        if(typeof(obj[method]) == 'function'){
            obj[method](args);
        }else{
            ui.showMsg('未知的同步方案');
            return false;
        }
    },
    
    //---------------
    /**
    * 数据库调用
    */
    dbSuccess: function(inSender, inResponse, inRequest){
        //enyo.log("dbsuccess, results=" + enyo.json.stringify(inResponse));
        if(inResponse.returnValue == true){// && inResponse.results.length > 0
            return {"results": inResponse.results, "next": inResponse.next, "count": inResponse.count}
        }else{
            return false;
        }
        //ui.showMsg("dbsuccess, results=" + enyo.json.stringify(inResponse));
    },
    /**
    * 数据库调用
    */
    dbFailure: function(inSender, inResponse, inRequest, msg){
        enyo.error(enyo.json.stringify(inResponse));
        //ui.halt('测试出错=' + enyo.json.stringify(inResponse));
		ui.showMsg('数据库操作出错' + (msg ? msg : ''));
        return false;
    },
    
    //获得ajax结果并处理成json, 然后回调
    webSuccess: function(inSender, inResponse, inRequest){
        //enyo.log(inResponse);
        if(!inResponse){
            var content = "status="+ inRequest.xhr.status +", content=" + inRequest.xhr.getAllResponseHeaders() + inResponse;
            //enyo.log(content);
            //ui.halt("debug="+content);
            return false;
        }
        
        //流量统计
        _G.bw += inResponse.length ? inResponse.length : 0;
        
        var rs = util.xml2json(inResponse);
        try {
            if(rs.result.code['#text'] == '200'){
                return rs.result;
            }else if(rs.result.code['#text'] == '400015'){ //invalid access_token
                if(user.checkLogin()){
                    user.logout();
                    ui.showMsg('令牌已失效，请重新登录');
                }
            }else{
                //ui.halt('同步失败，错误信息：' + rs.result.message['#text'] + '(' + rs.result.code['#text'] + ')');
				ui.halt('服务器返回异常数据');
                return false;
            }
        }catch(e){
            //ui.halt('程序异常, 错误信息：' + e.message);
			ui.halt('程序异常, 服务器返回错误信息');
            return false;
        }
    },
    webFailure: function(inSender, inResponse, inRequest){
        enyo.error(enyo.json.stringify(inResponse));
        //ui.showMsg('服务器连接失败, 错误代码：' + JSON.stringify(inResponse));
		ui.showMsg('服务器连接失败');
    },
    
    /**
    * 服务调用
    */
    palmSuccess: function(inResponse){
        //enyo.log("inResponse=" + enyo.json.stringify(inResponse));
        if(inResponse.returnValue == true){
            return inResponse;
        }else{
            return false;
        }
    },
    /**
    * 服务调用
    */
    palmFailure: function(inSender, inResponse){
        //ui.showMsg('服务调用失败, 错误信息：' + enyo.json.stringify(inResponse));
        enyo.error(enyo.json.stringify(inResponse));
		ui.showMsg('远程服务器无响应 请检查网络连接或稍后再试');
        return false;
    },
    
    getParams: function(method, data){
        var params = {
            "oauth_consumer_key": oauth_consumer_key,
            "access_token": _G.access_token,
            "method": method,
            "params": data
        }
        var base_string = oauth_consumer_secret + "&" + _G.access_token + "&" + oauth_consumer_key + "&" + method + "&" + data;
        params.oauth_signature  = util.signature(base_string, oauth_consumer_secret);
        
        //流量
        _G.bw += oauth_consumer_key.length + _G.access_token.length + method.length + data.length + params.oauth_signature.length;
        
        return params;
    },
    
    //设置回调
    setCallback: function(callbacks){
        this.callbacks = callbacks;
    },
    
    //每个项目完成后会调用sync.callback('onSuccess');
    callback: function(status, data){
        if(status == 'onSuccess'){
            this.callbacks.onSuccess(this.callbacks.self, data)
        }else if(status == 'onFailure'){
            this.callbacks.onFailure(this.callbacks.self, data)
        }
    },
    
    //某值是否存在于列表中，存在则返回此项的索引，否则返回false
    isExists: function(val, objs, field){
        var result = false;
        for(var i in objs){
            if(val == objs[i][field]){
                result = i;
                break;
            }
        }
        return result;
    },
    //比较版本库与内容库的列表，得出变更列表
    getChangedList: function(ROW_lists, REV_lists, force){
        var changed_lists = [];
        
        //1、循环ROW_lists检查add set
        //存在于ROW_lists而不在REV_lists为add，都存在时rev不同则更新
        for(var i = 0; i < ROW_lists.length; i++){
            var row = ROW_lists[i];
            
            var index = this.isExists(row._id, REV_lists, 'luid');
            var _action = '';
            var _guid = 0;
            if(index !== false){//记录存在
                var rev = REV_lists[index];
                row.erev = row.erev ? row.erev : 0;
                rev.erev = rev.erev ? rev.erev : 0;
                if(force){ //强制上传，当网站上数据为0时
                    _action = 'set'; //action=set是为了在syncC2S写入map时不会重复
                    _guid = rev.guid;
                }else{
                    if(row._rev != rev.lrev || row.erev != rev.erev){//记录已变更,不变更不放进改动列表 row._rev > rev.lrev
                        _action = 'set';
                        _guid = rev.guid;
                    }
                }
            }else{
                _action = 'add';
                _guid = 0;
            }
            if(_action != ''){
                var _obj = {"action": _action, "luid": row._id, "lrev": row._rev, "guid": _guid};
                changed_lists.push(_obj);
            }
        }
        //2 循环REV_lists检查del
        //存在于rev而不存在于row中即为del，如果是del则需要del掉map表中相应记录
        for(var i = 0; i < REV_lists.length; i++){
            var rev = REV_lists[i];
            
            var index = this.isExists(rev.luid, ROW_lists, '_id');
            if(index === false){//记录不存在
                var _obj = {"action": "del", "luid": rev.luid, "lrev": rev.lrev, "guid": rev.guid};
                changed_lists.push(_obj);
            }
        }
        
        return changed_lists;
    },
    //去重、检查冲突,参见 解决数据更新冲突遵循规则
    //列表结构[{action, luid, guid},...,]
    unique: function(C2S_lists, S2C_lists){
        var _C2S_lists = [];
        var _S2C_lists = [];
        var _C2S_lists_remove = [];
        var _S2C_lists_remove = []; //服务器到本地将要删除的记录key
        
        for(var i in S2C_lists){
            var s2c = S2C_lists[i];
            var index = this.isExists(s2c.luid, C2S_lists, 'luid');
            if(index !== false){//记录存在
                var c2s = C2S_lists[index];
                //del 具有优先级，服务器端具有优先级
                if(c2s.action == 'del' && s2c.action != 'del'){
                    _S2C_lists_remove.push(i);
                }else{
                    _C2S_lists_remove.push(index);
                }
            }
        }
        
        function in_array(val, arr){
            for(var i in arr){
                if(val == arr[i]){
                    return true;
                }
            }
            return false;
        }
        
        for(var i in C2S_lists){
            if(!in_array(i, _C2S_lists_remove)){
                _C2S_lists.push(C2S_lists[i]);
            }
        }
        for(var i in S2C_lists){
            if(!in_array(i, _S2C_lists_remove)){
                _S2C_lists.push(S2C_lists[i]);
            }
        }
        
        return [_C2S_lists, _S2C_lists];
    },
    
    //修复，如果action=set但库中没有这条记录，则改为action=add，如果action=add但库中有这条记录则action=set
    //返回S2C_lists  ROW_lists[{_id, _rev}]
    repair: function(S2C_lists, ROW_lists){
        var _S2C_lists = [];
        var _S2C_lists_remove = [];
        
        for(var i in S2C_lists){
            if(S2C_lists[i].action == 'set' && this.isExists(S2C_lists[i].luid, ROW_lists, '_id') === false){
                S2C_lists[i].action = 'add';
            }else if(S2C_lists[i].action == 'add' && this.isExists(S2C_lists[i].luid, ROW_lists, '_id') !== false){
                S2C_lists[i].action = 'set';
            }else if(S2C_lists[i].action == 'del' && this.isExists(S2C_lists[i].luid, ROW_lists, '_id') === false){
                _S2C_lists_remove.push(i); //操作为删除，但库中没有，则去除
            }
        }
        
        function in_array(val, arr){
            for(var i in arr){
                if(val == arr[i]){
                    return true;
                }
            }
            return false;
        }
        
        for(var i in S2C_lists){
            if(!in_array(i, _S2C_lists_remove)){
                _S2C_lists.push(S2C_lists[i]);
            }
        }
        return _S2C_lists;
    }
});