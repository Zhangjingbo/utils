enyo.kind({
    name: "Sms",
    kind: enyo.Control,
    components: [
        //web
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        //db
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"}, 
        //palm
        {kind: "PalmService", name: "file", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.labi.service/"},
        //ui
        {kind: "ModalDialog", name: "selectNumSms", caption: "短信恢复", lazy: false, components: [
            {flex: 1, name: "selectInfoSms", style: "font-size:16px; text-align:left;", content: ""},
            {flex: 1, kind: "Input", name: "resNumSms", hint: "", style: "margin-top:10px; -webkit-border-image: url(images/input-focus.png) 14 14;"},
            {flex: 1, layoutKind: "HFlexLayout", pack: "center", align: "center", style: "margin-top:5px;", components: [
                {kind: "Button", caption: "确定", onclick: "__RES"},
                {kind: "Button", caption: "取消", onclick: "cancel"}
            ]}
        ]}
    ],
    
    /**
    * 双向同步
    * 1、获得本地更新
    * 2、获得远端更新
    * 3、本地与远端比较去重得到新的C2S_lists 和 S2C_lists
    */
    SCD: function(){
        SIGN = '';
        self = this;
        self.type = 'sms';
        self.username = _G.username;
        self.status = 'SYNC';
        _G.bw = 0; //清空流量
        self.__RETRY__ = 0;
        self.args = {};
        self.luids = {};
        self.LIMIT = 20;
        
        //####1:
        self.getTotal(function(sTotal){
            self.checkFirst(sTotal, function(){ //服务器数据为0时清空本地表
                self.getTimestamp(function(data){
                    self.prev_timestamp = data;
                    self.last_timestamp = 0;
                    //####2:
                    self.getREV(function(data){
                        var REV_lists = data;
                        self.is_first = self.prev_timestamp == 0 ? true : false; //版本列表,如果为空，表明是第一次同步
                        //####3:
                        self.getROW(function(data){
                            var ROW_lists = [];
                            for(var i = 0; i < data.length; i++){
                                var row = data[i];
                                var visible = true;
                                visible = (typeof(row.flags.visible) !== 'undefined' && row.flags.visible == false) ? false : true;
                                if(visible && row.status != 'failed'){
                                    ROW_lists.push(row);
                                }
                            }
                            var r;
                            for(var i = 0; i < ROW_lists.length; i++){
                                r = ROW_lists[i];
                                self.luids[r._id] = r._rev;
                            }
                            var C2S_lists = sync.getChangedList(ROW_lists, REV_lists); //将更新到服务器的
                            //####4:
                            self.getS2C(function(data){
                                var S2C_lists = data;
                                //根据优先级去重，检查冲突
                                var _tmp_list = sync.unique(C2S_lists, S2C_lists);
                                C2S_lists = _tmp_list[0];
                                S2C_lists = _tmp_list[1];
                                S2C_lists = sync.repair(S2C_lists, ROW_lists); //修复，如果action=set但库中没有这条记录，则改为action=add，如果action=add但库中有这条记录则action=set
                                //S2C_lists为服务器到本地的更新，C2S_lists为本地到服务器的更新，均不包含数据
                                //C2S列表中不是add的去掉，guid>0的都要去掉
                                var _C2S_lists = [];
                                for(var i = 0; i < C2S_lists.length; i++){
                                    if(C2S_lists[i].action == 'add' && C2S_lists[i].guid == 0){
                                        _C2S_lists.push(C2S_lists[i]);
                                    }
                                }
                                C2S_lists = _C2S_lists;
                                //enyo.log('C2S_lists:' + enyo.json.stringify(C2S_lists));
                                //enyo.log('S2C_lists:' + enyo.json.stringify(S2C_lists));
                                
                                //####5:
                                self.getC2Srow(C2S_lists, function(data){
                                    var C2S_rows = data; //完全的到服务器的数据列表
                                    //####6:
                                    self.getS2Crow(S2C_lists, function(data){
                                        var S2C_rows = data; //完全的到本地的数据列表
                                        //enyo.log('C2S_rows:' + enyo.json.stringify(C2S_rows));
                                        //enyo.log('S2C_rows:' + enyo.json.stringify(S2C_rows));
                                        //####7:
                                        self.syncC2S(C2S_rows, function(){
                                            //####8:
                                            self.syncS2C(S2C_rows, function(){
                                                //####9:
                                                self.checkSession(function(){ //清理会话信息
                                                    self.setTimestamp(self.last_timestamp, function(){
                                                        //####10:
                                                        sys.saveBw(function(){
                                                            enyo.log('onSuccess');
                                                            sync.callback('onSuccess');
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    },
    
    /**
    * 恢复数据
    * 1、首先删除本地map表及数据, 主记录的时间戳也清空
    * 2、从远端拉取数据，写入本地，并写入map表
    * 3、非双向同步有单独的获取内容的方法，所以要使用getRES来获得数据
    */
    RES: function(args){
        SIGN = '';
        self = this;
        self.type = 'sms';
        self.username = _G.username;
        self.status = 'RES'; //标识当前操作是恢复
        _G.bw = 0; //清空流量
        //同步的数据参数
        self.args = args;
        self.luids = {};
        self.is_first = true;
        self.prev_timestamp = 0;
        self.last_timestamp = 0;
        self.__RETRY__ = 0;
        self.LIMIT = 20;
        
        self.getTotal(function(total){
            self.resTotal = total;
            if(self.resTotal == 0){
                ui.showMsg('服务器上没有记录');
                return false;
            }else{ //选择数量
                ui.waitingClose();
                var resNum = self.resTotal > 500 ? 500 : self.resTotal;
                self.$.selectInfoSms.setContent('网站上有'+self.resTotal+'条记录，默认将恢复最近'+resNum+'条，或请输入恢复数量');
                self.$.resNumSms.setValue(resNum);
                self.$.selectNumSms.openAtCenter();
                self.cancel = function(){
                    ui.waitingClose();
                    self.$.selectNumSms.close();
                };
            }
        });
    },
    
    __RES: function(){
        var self = this;
        ui.waitingClose();
        self.$.selectNumSms.close();
        ui.waitingOpen("正在恢复...");

        self.resNum = parseInt(self.$.resNumSms.getValue());
        self.resNum = self.resNum > self.resTotal ? self.resTotal : self.resNum;
        self.getRES(function(data){
            RES_rows = data;
            self.clean(RES_rows, function(RES_rows){
                self.syncS2C(RES_rows, function(){
                    self.setTimestamp(self.last_timestamp, function(){
                        //####10:
                        sys.saveBw(function(){
                            enyo.log('onSuccess');
                            sync.callback('onSuccess');
                        });
                    });
                });
            });
        });
    },
    
    checkFirst: function(sTotal, callback){
        if(sTotal > 0){
            return callback();
        }
        self.$.db.setMethod('del');
        var sql = {
            "query": {
                "from": "com.labi.map:1",
                "where": [{"prop": "type", "op": "=", "val": self.type}, {"prop": "username", "op": "=", "val": self.username}]
            }
        };
        self.$.db.call(sql);
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            return callback();
        }
    },
    
    //[1]获得上次最大时间戳
    getTimestamp: function(callback){
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            //enyo.log("rs: " + enyo.json.stringify(rs));
            if(rs && rs.results.length > 0){
                rs = rs.results[0];
                var data = rs.sms_prev_timestamp ? rs.sms_prev_timestamp : 0;
            }else{
                var data = 0;
            }
            return callback(data);
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "select": ["sms_prev_timestamp"],
                "from": "com.labi:1", 
                "where": [{"prop": "username", "op": "=", "val": self.username}],
                "limit": 1
            }
        };
        self.$.db.call(sql);
    },
    //更新最后操作的时间戳
    //last_timestamp 变成下一次的prev_timestamp
    setTimestamp: function(last_timestamp, callback){
        var callback = typeof(callback) == 'function' ? callback : function(){};
        
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(self.status == 'RES'){
                var obj = {"sms_prev_timestamp": last_timestamp, "sms_last_res": util.timestamp()};
            }else{
                last_timestamp = Math.max(last_timestamp, self.prev_timestamp);
                var obj = {"sms_prev_timestamp": last_timestamp, "sms_last_sync": util.timestamp()};
            }
            if(rs && rs.results.length > 0){
                self.$.db.setMethod('merge');
                var sql = {
                    "query": {"from": "com.labi:1", "where": [{"prop": "username", "op": "=", "val": self.username}]},
                    "props": obj
                };
            }else{
                self.$.db.setMethod('put');
                obj._kind = "com.labi:1";
                obj.username = self.username;
                var sql = {"objects": [obj]};
            }
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                return callback();
            };
            self.$.db.call(sql);
        };
        
        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "select": ["_id"], 
                "from": "com.labi:1", 
                "where": [{"prop": "username", "op": "=", "val": self.username}],
                "limit": 1
            }
        };
        self.$.db.call(sql);
    },

    //清空map表，删除记录，更新last_timestamp为0
    //CRC & SMS 不会清空整个表，只删除RES记录
    clean: function(RES_rows, callback, __data__){
        var __data__ = __data__ ? __data__ : [];
        if(RES_rows.length == 0){
            return callback(__data__);
        }

        var row = RES_rows.shift();
        
        self.$.db.setMethod('del');
        var sql = {
            "query": {
                "from": "com.labi.map:1",
                "where": [{"prop": "luid", "op": "=", "val": row.luid}, {"prop": "username", "op": "=", "val": self.username}]
            }
        };
        self.$.db.call(sql);
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            self.$.db.setMethod('del');
            var sql = {
                "query": {
                    "from": "com.palm.message:1",
                    "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                }
            };
            self.$.db.call(sql);
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                row.action = 'add';
                __data__.push(row);
                return self.clean(RES_rows, callback, __data__);
            };
        };
    },

    //传入sms内容数组
    //如果是SMS直接返回内容，如果是MMS则把图片等上传到服务器返回URL组装后返回
    checkMMS: function(smsdata, callback){
        if(!smsdata){
            return callback('');
        }

        //取MMS内容，递归
        function getPart(parts, callback, body){
            var body = body ? body : '';
            if(typeof(parts.length) == 'undefined' || parts.length == 0){
                return callback(body);
            }
            part = parts.shift();
            if(part.mimeType == 'text/plain'){
                var partText = part.partText ? part.partText : '';
                partText = partText.replace(/\r\n/g, "<br />\r\n");
                body += "<p>"+ partText +"</p>\r\n";
                
                return getPart(parts, callback, body);
            }else if(part.mimeType == 'application/smil'){
                return getPart(parts, callback, body);
            }else{
                var file = part.path ? part.path : '';
                if(file){
                    self.onFailure = sync.palmFailure;
                    self.onSuccess = function(inSender, inResponse){
                        var rs = sync.palmSuccess(inResponse);
                        if(rs){
                            var base64 = rs.base64;
                        }else{
                            var base64 = '';
                        }
                        if(base64){
                            if(part.mimeType == 'image/gif' || part.mimeType == 'image/jpg' || part.mimeType == 'image/jpeg' || part.mimeType == 'image/png' || part.mimeType == 'image/bmp'){
                                body += '<img src="data:'+ part.mimeType +';base64,'+ base64 +'" border="0"'+" /><br />\r\n";
                            }else{
                                body += '<a href="data:'+ part.mimeType +';base64,'+ base64 +'" border="0" />'+ (part.contentLoc ? part.contentLoc : 'Unknown MMS File Name') +"</a><br />\r\n";
                            }
                        }
                        return getPart(parts, callback, body);
                    };
                    
                    self.$.file.setMethod('read');
                    self.$.file.call({"file": file});
                }else{
                    return getPart(parts, callback, body);
                }
            }
        }
        
        //取第一段文本
        function getBlock(parts){
            var txt = '';
            if(!parts){
                return txt;
            }
            for(var i = 0; i < parts.length; i++){
                var part = parts[i];
                if(part.mimeType == 'text/plain'){
                    txt = part.partText ? part.partText : '';
                    break;
                }
            }
            return txt;
        }
        
        //sms
        if(smsdata._kind == 'com.palm.smsmessage:1'){
            var data = smsdata.messageText ? smsdata.messageText : '';
            return callback(data);
        }else if(smsdata._kind == 'com.palm.mmsmessage:1'){//MMS
            //MMS也有可能没有附件，只有文本
            if(smsdata.messageText){
                return callback(smsdata.messageText);
            }
            //以下才是真正的MMS
            var subject = smsdata.subject ? util.encode(smsdata.subject) : ''; //MMS title
            var partText = getBlock(smsdata.parts); //首先取得，否则getPart会shift()弹出数据后为parts空
            getPart(smsdata.parts, function(data){
                var body = data;
                if(body == ''){
                    var filedata = '';
                }else{
                    var filedata = "<html>\r\n";
                    filedata += "<head>\r\n";
                    filedata += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\r\n";
                    filedata += "<title>"+ (subject ? subject : '') +"</title>\r\n";
                    filedata += "<link href=\"../css.css\" rel=\"stylesheet\" type=\"text/css\" />\r\n";
                    filedata += "</head>\r\n";
                    filedata += "<body>\r\n";
                    filedata += "<table width=\"600\" align=\"center\"><tr><td>\r\n";
                    filedata += body;
                    filedata += "</td></tr></table>\r\n";
                    filedata += "</body>\r\n";
                    filedata += "</html>";
                }
                
                if(filedata){ //上传文件到服务器
                    self.onFailure = sync.palmFailure;
                    self.onSuccess = function(inSender, inResponse){
                        //enyo.log("upload: inResponse=" + enyo.json.stringify(inResponse));
                        var rs = sync.palmSuccess(inResponse);
                        if(rs){
                            var url = rs.data;
                            var cont = subject == '' ? '' : subject;
                            cont += partText == '' ? '' : (cont == '' ? partText : " :"+partText);
                            cont += url == '' ? '' : (cont == '' ? url : " :"+ url);
                            return callback(cont);
                        }else{
                            return callback(cont);
                        }
                    }
                    //上传filedata
                    self.$.file.setMethod('upload');
                    self.$.file.call({"url": "http://file.gozap.com/upload/mms", "filedata": filedata, "contentType": "text/plain", "name": "upload", "filename": "mms.html"});
                    //统计上传内容大小
                    _G.bw += filedata.length;
                }else{
                    return callback(cont);
                }
            });
        }else{
            return callback('');
        }
    },
    
    /**
    * 获得版本库列表(用来与本地记录列表判断哪个新增修改删除)
    * next: 下一个分页
    */
    getREV: function(callback, next, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var data = data ? data : [];
        var next = next ? next : "";

        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs && rs.results.length > 0){
                data = util.mergeList(data, rs.results);
                //enyo.log("rs=" + enyo.json.stringify(rs.results));
                if(rs.next){
                    self.getREV(callback, rs.next, data);
                }else{
                    callback(data);
                }
            }else{
                callback(data);
            }
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_id", "luid", "lrev", "guid"], 
                    "from": "com.labi.map:1",
                    "where": [{"prop": "type", "op": "=", "val": self.type}, {"prop": "username", "op": "=", "val": self.username}],
                    "limit": 500,
                    "page": next
                }
        };
        self.$.db.call(sql);
    },
    /**
    * 获得本地列表(仅取_id, _rev以用来判断)
    * next: 下一个分页
    */
    getROW: function(callback, next, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var data = data ? data : [];
        var next = next ? next : "";

        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs){
                data = util.mergeList(data, rs.results);
                //enyo.log("rs=" + enyo.json.stringify(rs.results));
                if(rs.next){
                    self.getROW(callback, rs.next, data);
                }else{
                    callback(data);
                }
            }else{
                callback(data);
            }
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_id", "_rev", "flags", "status"], 
                    "from": "com.palm.message:1", 
                    "limit": 500,
                    "page": next
                }
        };
        self.$.db.call(sql);
    },
    
    /**
    * 获取服务器上的总数目
    * 如果是按电话号码获取，则不管这个数目
    */
    getTotal: function(callback){
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            //enyo.log(JSON.stringify(rs));return false;
            if(rs){
                self.__RETRY__ = 0;
                var items = typeof(rs.data.query.item.length) == 'undefined' ? [rs.data.query.item] : rs.data.query.item;
                var data = 0;
                for(var i = 0; i < items.length; i++){
                    data += parseInt(items[i]['count']['#text']);
                }
                return callback(data);
            }else{
                if(self.__RETRY__ < 5){
                    self.__RETRY__ += 1;
                    return self.getTotal(callback);
                }else{
                    ui.showMsg(L('pulling_failure'));
                    return false;
                }
            }
        }
        
        var method = 'sync.SmsCount.get';
        if(self.args['res_type'] == 'pnum'){
            var postdata = '<item><pnum>'+ self.args['pnum'] +'</pnum></item>';
        }else if(self.args['res_type'] == 'folder'){
            var postdata = '';
            if(self.args['inbox'] == 'inbox'){
                postdata += '<item><box>1</box></item>';
            }
            if(self.args['outbox'] == 'outbox'){
                postdata += '<item><box>2</box></item>';
            }
            if(self.args['otherbox'] == 'otherbox'){
                postdata += '<item><box>8</box></item>';
            }
        }else{
            var postdata = '<item></item>';
        }
        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    
    /**
    * 服务器端要更新的数据列表
    * 须做分页判断
    * 这里只有删除，要恢复需另外的方法：sync.Sms.get
    */
    getS2C: function(callback, next, page, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var pagesize = 20;
        var next = next ? next : 0; //分页时用
        var page = page ? page : 1;
        var data = data ? data : [];
        
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            if(rs){
                self.__RETRY__ = 0;
                var items = parseInt(rs.data.query['@attributes'].items);
                next = next > 0 ? next : parseInt(rs.data.query['@attributes'].timestamp); //next为空第一页时,第二个请求包开始设置为第一个请求包的timestamp属性
                
                //木有记录内容，执行下一步操作
                if(items == 0){
                    return callback(data);
                }
                
                var item_lists = [];
                //只有一条XML记录时并不以数组形式出现
                rs.data.query.item = typeof(rs.data.query.item.length) == 'undefined' ? [rs.data.query.item] : rs.data.query.item;
                
                for(var k in rs.data.query.item){
                    var _obj = rs.data.query.item[k];
                    var _action = _obj['@attributes'].action ? _obj['@attributes'].action : "";
                    var _timestamp = _obj['@attributes'].timestamp ? parseInt(_obj['@attributes'].timestamp) : 0;
                    var _guid = _obj.guid['#text'] ? _obj.guid['#text'] : 0;
                    var _luid = _obj.luid['#text'] ? _obj.luid['#text'] : "";
                    var _createTime = _obj.createTime['#text'] ? parseInt(_obj.createTime['#text']) : 0;

                    var _obj = {"action": _action, "luid": _luid, "lrev": 0, "guid": parseInt(_guid), "timestamp": _timestamp};
                    item_lists.push(_obj);
                    self.last_timestamp = Math.max(self.last_timestamp, _timestamp); //item中timestamp中的最大值,用作下次prev
                }
                data = util.mergeList(data, item_lists);

                if(pagesize * page < items && item_lists.length > 0){//不止一页,且item_lists已不为空
                    return self.getS2C(callback, next, page+1, data);
                }else{
                    return callback(data);
                }
            }else{
                if(self.__RETRY__ < 5){
                    self.__RETRY__ += 1;
                    return self.getS2C(callback, next, page, data);
                }else{
                    ui.showMsg(L('pulling_failure'));
                    return false;
                }
            }
        };
        
        //发起数据请求服务器到客户端的数据
        //须判断是否是第一次
        var method = 'sync.Sms.sync';
        var postdata = '<item>';
        postdata += next > 0 ? '<next>'+ next +'</next>' : '';
        if(self.is_first){
            postdata += '<prev>2</prev>'; //首次是2
        }else{
            postdata += '<prev>'+ self.prev_timestamp +'</prev>'; //业务在服务器最后操作的时间戳
        }
        postdata += '<page>'+ page +'</page>'; //当前页
        postdata += '<pages>'+ pagesize +'</pages></item>'; //单次取数据记录数目

        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    //db
    getC2Srow: function(C2S_lists, callback, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var data = data ? data : [];
        if(C2S_lists.length == 0){
            return callback(data);
        }
        var row = C2S_lists.shift();
        
        if(row.action == 'add' || row.action == 'set'){
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs && rs.results.length > 0){
                    var result = rs.results[0];
                    row.luid = result._id;
                    row.lrev = result._rev;
                    row.data = result;
                    if(result.conversations && result.conversations.length > 0){
                        var conversation_id = result.conversations[0];
                        self.$.db.setMethod('find');
                        var sql = {
                            "query": 
                                {
                                    "select": ["displayName"],
                                    "from": "com.palm.chatthread:1",
                                    "where": [{"prop": "_id", "op": "=", "val": conversation_id}]
                                }
                        };
                        self.$.db.call(sql);
                        self.onFailure = sync.dbFailure;
                        self.onSuccess = function(inSender, inResponse, inRequest){
                            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                            if(rs && rs.results.length > 0){
                                row.data.displayName = rs.results[0].displayName;
                            }
                            data.push(row);
                            return self.getC2Srow(C2S_lists, callback, data);
                        };
                    }else{
                        data.push(row);
                        return self.getC2Srow(C2S_lists, callback, data);
                    }
                }else{
                    return self.getC2Srow(C2S_lists, callback, data);
                }
            }
            self.$.db.setMethod('find');
            var sql = {
                "query": 
                    {
                        "from": "com.palm.message:1",
                        "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                    }
            };
            self.$.db.call(sql);
        }else if(row.action == 'del'){
            data.push(row);
            return self.getC2Srow(C2S_lists, callback, data);
        }
    },
    //web
    getS2Crow: function(S2C_lists, callback, data, __step__, __total__){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        
        var data = data ? data : [];
        if(S2C_lists.length == 0){
            return callback(data);
        }
        
        //进度显示
        var __step__ = __step__ ? __step__ : 1;
        var __total__ = __total__ ? __total__ : S2C_lists.length;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("pulling_data") + progress);
        __step__ += 1;
        
        var row = S2C_lists.shift();
        
        //短信没有修改，从主服务器端过来的只有删除的可能性
        if(row.action == 'add' || row.action == 'set'){
            return self.getS2Crow(S2C_lists, callback, data, __step__, __total__);
        }else if(row.action == 'del'){
            data.push(row);
            return self.getS2Crow(S2C_lists, callback, data, __step__, __total__);
        }
    },
    
    //获得恢复列表
    getRES: function(callback, page, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var pagesize = 20;
        var page = page ? page : 1;
        var data = data ? data : [];
        
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            if(rs){
                self.__RETRY__ = 0;
                var items = parseInt(rs.data.query['@attributes'].items);
                //木有记录内容，执行下一步操作
                if(items == 0){
                    return callback(data);
                }
                
                var item_lists = [];
                //只有一条XML记录时并不以数组形式出现
                rs.data.query.item = typeof(rs.data.query.item.length) == 'undefined' ? [rs.data.query.item] : rs.data.query.item;
                
                for(var k in rs.data.query.item){
                    var _obj = rs.data.query.item[k];
                    var _action = _obj['@attributes'].action ? _obj['@attributes'].action : "";
                    var _timestamp = _obj['@attributes'].timestamp ? parseInt(_obj['@attributes'].timestamp) : 0;
                    var _guid = _obj.guid['#text'] ? _obj.guid['#text'] : 0;
                    var _luid = _obj.luid['#text'] ? _obj.luid['#text'] : "";
                    var _createTime = _obj.createTime['#text'] ? parseInt(_obj.createTime['#text']) : 0;

                    var _obj = {"action": _action, "luid": _luid, "lrev": 0, "guid": parseInt(_guid), "timestamp": _timestamp, "data": _obj};
                    item_lists.push(_obj);
                    self.last_timestamp = Math.max(self.last_timestamp, _timestamp); //item中timestamp中的最大值,用作下次prev
                }
                data = util.mergeList(data, item_lists);

                //进度显示
                var __step__ = data.length > self.resNum ? self.resNum : data.length;
                var __total__ = self.resNum;
                var progress = __step__ + '/' + __total__;
                ui.waitingOpen(L("pulling_data") + progress);

                //记录数多于设定的数目
                if(data.length >= self.resNum){
                    var num = data.length - self.resNum;
                    for(var i = 0; i < num; i++){
                        data.pop();
                    }
                    return callback(data);
                }

                if(pagesize * page < items && item_lists.length > 0){//不止一页,且item_lists已不为空
                    return self.getRES(callback, page+1, data);
                }else{
                    return callback(data);
                }
            }else{
                if(self.__RETRY__ < 5){
                    self.__RETRY__ += 1;
                    return self.getRES(callback, page, data);
                }else{
                    ui.showMsg(L('pulling_failure'));
                    return false;
                }
            }
        };
        
        //发起数据请求服务器到客户端的数据
        //self.getType = ''
        var method = 'sync.Sms.get';
        var postdata = '<item>';
        
        if(self.args['res_type'] == 'pnum' && self.args['pnum'] != ''){ //通过短信号码的短信获取
            postdata += '<pnum>'+ self.args['pnum'] +'</pnum>'; //13801030190 13811653438{多个号码用空格分离}
        }else if(self.args['res_type'] == 'folder'){ //通过文件夹的短信获取
            //postdata += '<class>'+ self.params['class'] +'</class>'; //{1:SMS{短信},2:MMS{彩信}}
            var boxs = [];
            if(self.args['inbox'] == 'inbox'){
                boxs.push('1');
            }
            if(self.args['outbox'] == 'outbox'){
                boxs.push('2');
            }
            if(boxs.length > 0){
                postdata += '<box>'+ boxs.join(" ") +'</box>'; //{1:收件箱, 2:Outbox, 8:OtherBox，多个box用空格分离}
            }
        }
        postdata += '<page>'+ page +'</page>'; //当前页
        postdata += '<pages>'+ pagesize +'</pages></item>'; //单次取数据记录数目

        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    
    //同步到远端
    syncC2S: function(C2S_rows, callback, data){
        var data = data ? data : [];
        if(C2S_rows.length == 0){
            return self.__syncC2S(data, callback);
        }
        
        var row = C2S_rows.shift();
        if(row.action == 'del'){
            data.push(row);
            return self.syncC2S(C2S_rows, callback, data);
        }else{
            return self.checkMMS(row.data, function(cont){
                row.cont = cont;
                data.push(row);
                return self.syncC2S(C2S_rows, callback, data);
            });
        }
    },
    
    //同步到远端
    __syncC2S: function(C2S_rows, callback, __step__, __total__){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        if(C2S_rows.length == 0){
            return callback();
        }
        
        var funcAdd = function(rows, callback){
            //通话记录上传，这里实际只有add，没有set
            var return_rows = [];
            if(rows.length == 0){
                return callback();
            }
            var method = 'sync.Sms.add';
            var postdata = '';
            for(var i = 0; i < rows.length; i++){
                postdata += self.convert(rows[i], 'C2S');
            }
            var params = sync.getParams(method, postdata);
            self.$.web.call(params);
        
            self.onFailure = sync.webFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                //enyo.log("rs=" + enyo.json.stringify(rs));
                if(rs){//<item timestamp="1339778106518454"><guid>28211847</guid></item><item timestamp="1339778106518456"><guid>28211848</guid></item>仅返回guid，按顺序？
                    self.__RETRY__ = 0;
                    return_rows = typeof(rs.data.query.item.length) == 'undefined' ? [rs.data.query.item] : rs.data.query.item;
                    var objects = [];
                    var postdata = '';
                    for(var i = 0; i < return_rows.length; i++){
                        var luid = rows[i].luid;
                        var lrev = rows[i].lrev;
                        var guid = parseInt(return_rows[i].guid['#text'])
                        var actime = parseInt(return_rows[i]['@attributes'].timestamp);
                        self.last_timestamp = Math.max(self.last_timestamp, actime);
                        
                        objects.push({"_kind": "com.labi.map:1", "type": self.type, "username": self.username, "luid": luid, "lrev": lrev, "guid": guid, "erev": 0});
                        postdata += '<item><luid>'+ luid +'</luid><guid>'+ guid +'</guid></item>';
                    }
                    self.$.db.setMethod('put');
                    var sql = {"objects": objects};
                    self.$.db.call(sql);
                    
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        //回写到server端
                        if(rs){
                            var func = function(__func_retry__){
                                var method = 'sync.SmsLuid.set';
                                var params = sync.getParams(method, postdata);
                                self.$.web.call(params);
                                self.onFailure = sync.webFailure;
                                self.onSuccess = function(inSender, inResponse, inRequest){
                                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                                    if(rs){
                                        return callback();
                                    }else{
                                        if(__func_retry__ < 5){
                                            return func(__func_retry__ + 1);
                                        }else{
                                            return callback();
                                        }
                                    }
                                }
                            };
                            return func(0);
                        }else{
                            return callback();//递归下一步
                        }
                    };
                }else{
                    if(self.__RETRY__ < 5){
                        self.__RETRY__ += 1;
                        return funcAdd(rows, callback);
                    }else{
                        ui.showMsg('上传数据失败，请重试');
                        return false;
                    }
                }
            }
        };
        
        
        //return self.__syncC2S(C2S_rows, callback, __step__, __total__);
        var funcDel = function(luids, callback){//删除map表上的记录, 本地的删除，不会删除服务器上的
            if(luids.length == 0){
                return callback();
            }
            luid = luids.shift();
            self.$.db.setMethod('del');
            var sql = {
                "query": {
                    "from": "com.labi.map:1",
                    "where": [{"prop": "luid", "op": "=", "val": luid}, {"prop": "username", "op": "=", "val": self.username}]
                }
            };
            self.$.db.call(sql);
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                return funcDel(luids, callback);
            };
        };

        
        //进度显示
        var __step__ = __step__ ? __step__ : 0;
        var __total__ = __total__ ? __total__ : C2S_rows.length;
        __step__ += C2S_rows.length < self.LIMIT ? C2S_rows.length : self.LIMIT;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("sms_syncing") + progress);

        var rows = [];
        var luids = [];
        for(var i = 0; i < self.LIMIT; i++){
            if(C2S_rows.length == 0){
                break;
            }
            var row = C2S_rows.shift();
            if(row.action == 'add' || row.action == 'set'){
                if(row.guid > 0){
                    continue;
                }
                rows.push(row);
            }else if(row.action == 'del'){
                luids.push(row.luid);
            }
        }

        return funcDel(luids, function(){
            return funcAdd(rows, function(){
                return self.__syncC2S(C2S_rows, callback, __step__, __total__);
            });
        });
    },
    
    
    //同步到本地，这里SMS只有删除（恢复的再另行处理）
    syncS2C: function(S2C_rows, callback, __step__, __total__){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        
        if(S2C_rows.length == 0){
            return callback();
        }
        
        //进度显示
        var __step__ = __step__ ? __step__ : 1;
        var __total__ = __total__ ? __total__ : S2C_rows.length;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("sync_to_local") + progress);
        __step__ += 1;
        
        var row = S2C_rows.shift();

        if(row.action == 'add' || row.action == 'set'){
            //这里实际上是恢复
            row.action = self.status == 'RES' ? 'add' : row.action;
            self.onFailure = function(inSender, inResponse, inRequest){
                if(inResponse && inResponse.errorCode && inResponse.errorCode == -3960){
                    return self.syncS2C(S2C_rows, callback, __step__, __total__);//递归下一步
                }else{
                    return sync.dbFailure(inSender, inResponse, inRequest);
                }
            };
            self.onSuccess = function(inSender, inResponse, inRequest){
                //enyo.log("inResponse: "+ JSON.stringify(inResponse));
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs){
                    var _id = (row.luid && isNaN(row.luid) && row.luid.length > 10) ? row.luid : rs.results[0].id;
                    //enyo.log("_ID: "+_id);
                    //求出lrev
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        //enyo.log("inResponse: "+ JSON.stringify(inResponse));
                        var map = sync.dbSuccess(inSender, inResponse, inRequest);
                        if(map){
                            map = map.results[0];
                            self.onFailure = sync.dbFailure;
                            self.onSuccess = function(inSender, inResponse, inRequest){
                                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                                //回写到server端
                                if(rs){
                                    var func = function(__func_retry__){
                                        self.onFailure = sync.webFailure;
                                        self.onSuccess = function(inSender, inResponse, inRequest){
                                            var rs = sync.webSuccess(inSender, inResponse, inRequest);
                                            if(rs){
                                                return self.syncS2C(S2C_rows, callback, __step__, __total__);
                                            }else{
                                                if(__func_retry__ < 5){
                                                    return func(__func_retry__ + 1);
                                                }else{
                                                    return self.syncS2C(S2C_rows, callback, __step__, __total__);
                                                }
                                            }
                                        }
                                        
                                        var method = 'sync.SmsLuid.set';
                                        var postdata = '<item>';
                                        postdata += '<luid>'+ map._id +'</luid>'; //不管恢复还是更新，都要用map._id这个以确保最新的rev
                                        postdata += '<guid>'+ row.guid +'</guid>';
                                        postdata += '</item>';

                                        var params = sync.getParams(method, postdata);
                                        self.$.web.call(params);
                                    };
                                    return func(0);
                                }else{
                                    return self.syncS2C(S2C_rows, callback, __step__, __total__);//递归下一步
                                }
                            };

                            if(row.action == 'add'){
                                self.$.db.setMethod('put');
                                var sql = {"objects": [{"_kind": "com.labi.map:1", "type": self.type, "username": self.username, "luid": map._id, "lrev": map._rev, "guid": row.guid, "erev": 0}]};
                            }else if(row.action == 'set'){
                                self.$.db.setMethod('merge');
                                var sql = {
                                    "query": {
                                        "from": "com.labi.map:1",
                                        "where": [{"prop": "luid", "op": "=", "val": map._id}, {"prop": "username", "op": "=", "val": self.username}]
                                    },
                                    "props": {
                                        "lrev": map._rev,
                                        "guid": row.guid,
                                        "erev": 0
                                    }
                                };
                            }
                            self.$.db.call(sql);
                        }else{
                            return self.syncS2C(S2C_rows, callback, __step__, __total__);
                        }
                    };
                    
                    self.$.db.setMethod('find');
                    var sql = {
                        "query": {
                            "select": ["_id", "_rev"], //readRevSet一开始和_rev一样，但一读出来_rev就变了
                            "from": "com.palm.message:1",
                            "where": [{"prop": "_id", "op": "=", "val": _id}]
                        }
                    };
                    self.$.db.call(sql);
                }else{
                    return self.syncS2C(S2C_rows, callback, __step__, __total__);//递归下一步
                }
            };
            
            var _obj = self.convert(row, 'S2C');
            if(self.luids.hasOwnProperty(row.luid)){
                self.$.db.setMethod('merge');
                var sql = {
                    "query": {
                        "from": "com.palm.message:1",
                        "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                    },
                    "props": _obj
                };
            }else{
                _obj.accountId = "labi";
                if(row.luid && isNaN(row.luid) && row.luid.length > 10){ //这里极有可能是从别的机子上过来的uid是纯数字
                    _obj._id = row.luid;
                }
                self.$.db.setMethod('put');
                var sql = {"objects": [_obj]};
            }
            self.$.db.call(sql);
        }else if(row.action == 'del'){ //网站删除短信会导致手机短信删除
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs){
                    //删除map表上的记录
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        if(rs){
                            var func = function(__func_retry__){
                                //回写服务器端
                                self.onFailure = sync.webFailure;
                                self.onSuccess = function(inSender, inResponse, inRequest){
                                    //enyo.log("syncS2C: results=" + enyo.json.stringify(inResponse));
                                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                                    if(rs){
                                        return self.syncS2C(S2C_rows, callback, __step__, __total__);
                                    }else{
                                        if(__func_retry__ < 5){
                                            return func(__func_retry__ + 1);
                                        }else{
                                            return self.syncS2C(S2C_rows, callback, __step__, __total__);
                                        }
                                    }
                                }
                                //回写
                                var method = 'sync.SmsLuid.set';
                                var postdata = '<item>';
                                postdata += '<luid>'+ row.luid +'</luid>';
                                postdata += '<guid>'+ row.guid +'</guid>';
                                postdata += '</item>';

                                var params = sync.getParams(method, postdata);
                                self.$.web.call(params);
                            };
                            return func(0);
                        }else{
                            return self.syncS2C(S2C_rows, callback, __step__, __total__);//递归下一步
                        }
                    };
                    
                    self.$.db.setMethod('del');
                    var sql = {
                        "query": {
                            "from": "com.labi.map:1",
                            "where": [{"prop": "luid", "op": "=", "val": row.luid}, {"prop": "username", "op": "=", "val": self.username}]
                        }
                    };
                    self.$.db.call(sql);
                }else{
                    return self.syncS2C(S2C_rows, callback, __step__, __total__);//递归下一步
                }
            };
            
            self.$.db.setMethod('del');
            var sql = {
                "query": {
                    "from": "com.palm.message:1",
                    "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                }
            };
            self.$.db.call(sql);
        }
    },
    
    //同步完成后检测会话组，不存在记录则删除
    checkSession: function(callback, next){
        var self = this;
        var next = next ? next : "";
        
        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_id"], 
                    "from": "com.palm.chatthread:1",
                    "limit": 1,
                    "page": next
                }
        };
        self.$.db.call(sql);
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs && rs.results.length == 1){
                var conversation_id = rs.results[0]['_id'];
                var next = rs.next;
                self.$.db.setMethod('find');
                var sql = {"query": {"select": ["_id"], "from": "com.palm.message:1", "where":[{"prop": "conversations", "op": "=", "val": conversation_id}], "desc": true}, "count":true};
                self.$.db.call(sql);
                self.onFailure = sync.dbFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                    if(rs && rs.count > 0){
                        return self.checkSession(callback, next);
                    }else{
                        self.$.db.setMethod('del');
                        var sql = {"ids":[conversation_id]};
                        self.$.db.call(sql);
                        self.onFailure = sync.dbFailure;
                        self.onSuccess = function(inSender, inResponse, inRequest){
                            return self.checkSession(callback, next);
                        };
                    }
                };
            }else{
                return callback();
            }
        };
    },
    
    convert: function(row, status){
        if(status == 'C2S'){
            var postdata = '';
            //enyo.log(JSON.stringify(row));
            var _class = row.data._kind == 'com.palm.smsmessage:1' ? '1' : '2'; //SMS/MMS
            if(row.data.folder == 'inbox'){
                var _box = 1;
                var _pnum = row.data.from.addr ? row.data.from.addr : '';
                var _alias = row.data.from.name ? row.data.from.name : '';
                var _typ = 1;
            }else if(row.data.folder == 'outbox'){//发出去的地址是数组因为可能有多个
                var _box = 2;
                var _pnum = row.data.to[0] ? row.data.to[0].addr : '';
                _pnum = _pnum ? _pnum : '';
                var _alias = row.data.to[0] ? row.data.to[0].name : '';
                _alias = _alias ? _alias : '';
                var _typ = 2;
            }else if(row.data.folder == 'drafts'){ //草稿箱, from没有，to为[]
                var _box = 8;
                var _pnum = row.data.to.length > 0 ? row.data.to[0].addr : '';
                _pnum = _pnum ? _pnum : '';
                var _alias = row.data.to.length > 0 ? row.data.to[0].name : '';
                _alias = _alias ? _alias : '';
                var _typ = 2;
            }else{
                var _box = 8;
                var _pnum = '';
                var _alias = '';
                var _typ = 2;
            }
            _alias = _alias ? _alias : (row.data.displayName ? row.data.displayName : '');
            
            var _ir = row.data.flags.read ? 1 : 0;
            var _dt = row.data.timestamp ? row.data.timestamp : row.data.localTimestamp;
            _dt = _dt > 10000000000 ? Math.round(_dt/1000) : _dt;
            var _cont = row.cont;
            
            _pnum = _pnum.replace(/\s+/g, '');
            _alias = _alias.replace(/\s+/g, '');
            
            postdata += '<item>';
            postdata += '<luid>'+ row.luid +'</luid>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>';
            postdata += '<guid>'+ row.guid +'</guid>'; //guid=0实际上
            postdata += '<class>'+ _class +'</class>'; //{1:SMS{短信},2:MMS{彩信}}
            postdata += '<box>'+ _box +'</box>'; //{1:收件箱, 2:Outbox, 8:OtherBox}
            postdata += '<pnum>'+ _pnum +'</pnum>';
            postdata += '<alias>'+ util.encode(util.str2xml(_alias)) +'</alias>'; //{姓名}
            postdata += '<cont>'+ util.encode(util.str2xml(_cont)) +'</cont>'; //内容
            postdata += '<dt>'+ _dt +'</dt>';//time
            postdata += '<typ>'+ _typ +'</typ>'; //{类型,1:接收到的消息，2:发出去的消息}
            postdata += '<ir>'+ _ir +'</ir>'; //1{是否已读：0为未读，1为已读}
            postdata += '</item>';

            return postdata;
        }else if(status == 'S2C'){
            var class_maps = {1: "com.palm.smsmessage:1", 2: "com.palm.mmsmessage:1"};
            var _class = row.data['class'] ? parseInt(row.data['class']['#text']) : 1; //1:SMS, 2:MMS
            var _dbkind = class_maps[_class] ? class_maps[_class] : 'com.palm.smsmessage:1';
            var _serviceName = _dbkind == 'com.palm.mmsmessage:1' ? "mms" : "sms";

            var folder_maps = {1: "inbox", 2: "outbox", 8: "otherbox"};
            var _folder = row.data.box ? parseInt(row.data.box['#text']) : 8;
            _folder = folder_maps[_folder] ? folder_maps[_folder] : 'otherbox';
            var _timestamp = row.data.dt ? parseInt(row.data.dt['#text']) : 0;
            _timestamp = _timestamp < 10000000000 ? _timestamp * 1000 : _timestamp;
            var _localTimestamp = _timestamp;
            var _messageText = row.data.cont['#text'];

            var _addr = row.data.knum ? row.data.knum['#text'] : '';//row.data.pnum ? row.data.pnum['#text'] : '';
            var _name = row.data.alias ? row.data.alias['#text'] : '';
            var _from_to = {"addr": _addr, "name": util.decode(_name)};
            
            var _read = row.data.ir ? parseInt(row.data.ir['#text']) : 0;
            _read = _read == 1 ? true : false;
            var _flags = {"read": _read, "visible": true, "deliveryReport": false};
            
            var obj = {"folder": _folder, "localTimestamp": _localTimestamp, "timestamp": _timestamp, "flags": _flags,
                        "messageText": util.decode(_messageText), "_kind": _dbkind, "serviceName": _serviceName, "status": "successful"};
            if(_folder == 'inbox'){
                obj.from = _from_to;
            }else if(_folder == 'outbox'){
                obj.to = [_from_to]; //to 是数组
            }else{
                obj.from = _from_to;
            }
            
            return obj;
        }
    }
});