enyo.kind({
    name: "Calendar",
    kind: enyo.Control,
    components: [
        //web
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        //db
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"},
        //ui
        {kind: "ModalDialog", name: "selectNum", caption: "日历恢复", lazy: false, components: [
            {flex: 1, name: "selectInfo", style: "font-size:16px; text-align:left;", content: ""},
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
        self.type = 'calendar';
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
                    self.is_first = self.prev_timestamp == 0 ? true : false; //版本列表,如果为空，表明是第一次同步
                    //####2:
                    self.getROW(function(data){
                        var ROW_lists = data;
                        var r;
                        for(var i = 0; i < ROW_lists.length; i++){
                            r = ROW_lists[i];
                            self.luids[r._id] = r._rev;
                        }
                        //####3:
                        self.getREV(function(data){
                            var REV_lists = data;
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
                                //enyo.log('C2S_lists:' + enyo.json.stringify(C2S_lists));
                                //enyo.log('S2C_lists:' + enyo.json.stringify(S2C_lists));
                                //return false;
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
    },
    
    /**
    * 恢复数据
    * 1、首先删除本地map表及数据, 主记录的时间戳也清空
    * 2、从远端拉取数据，写入本地，并写入map表
    */
    RES: function(args){
        SIGN = '';
        self = this;
        self.type = 'calendar';
        self.username = _G.username;
        self.status = 'RES'; //标识当前操作是恢复
        _G.bw = 0; //清空流量
        self.args = args;
        self.luids = {};
        self.is_first = true;
        self.prev_timestamp = 0;
        self.last_timestamp = 0;
        self.__RETRY__ = 0;
        self.LIMIT = 20;

        self.getTotal(function(total){
            var sTotal = total;
            if(sTotal == 0){
                ui.showMsg('服务器上没有记录');
                return false;
            }
            self.getCount(function(total){
                ui.waitingClose();
                var cTotal = total;
                self.$.selectInfo.setContent('即将用网站的'+ sTotal +'条记录替换本机的'+ cTotal +'条记录。是否开始恢复？');
                self.$.selectNum.openAtCenter();
                self.cancel = function(){
                    ui.waitingClose();
                    self.$.selectNum.close();
                };
            });
        });
    },
    
    __RES: function(){
        var self = this;
        ui.waitingClose();
        self.$.selectNum.close();
        ui.waitingOpen("正在恢复...");
        
        self.getS2C(function(data){
            var S2C_lists = data;
            self.getS2Crow(S2C_lists, function(data){
                var S2C_rows = data;
                self.clean(function(){
                    self.syncS2C(S2C_rows, function(){
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
                var data = rs.calendar_prev_timestamp ? rs.calendar_prev_timestamp : 0;
            }else{
                var data = 0;
            }
            return callback(data);
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "select": ["calendar_prev_timestamp"],
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
                var obj = {"calendar_prev_timestamp": last_timestamp, "calendar_last_res": util.timestamp()};
            }else{
                last_timestamp = Math.max(last_timestamp, self.prev_timestamp);
                var obj = {"calendar_prev_timestamp": last_timestamp, "calendar_last_sync": util.timestamp()};
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
    clean: function(callback){
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            //删记录
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                //更新last_timestamp
                self.setTimestamp(0, function(){
                    return callback();
                });
            };
            self.$.db.setMethod('del');
            var sql = {
                "query": {
                    "from": "com.palm.calendarevent:1"
                }
            };
            self.$.db.call(sql);
        };
        
        self.$.db.setMethod('del');
        var sql = {
            "query": {
                "from": "com.labi.map:1",
                "where": [{"prop": "type", "op": "=", "val": self.type}, {"prop": "username", "op": "=", "val": self.username}]
            }
        };
        self.$.db.call(sql);
    },
    
    /**
    * 获得本地数目
    */
    getCount: function(callback){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }

        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs){
                return callback(rs.count);
            }else{
                return callback(0);
            }
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_id"], 
                    "from": "com.palm.calendarevent:1"
                },
            "count": true
        };
        self.$.db.call(sql);
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
                    "select": ["_id", "_rev"], 
                    "from": "com.palm.calendarevent:1", 
                    "limit": 500,
                    "page": next
                }
        };
        self.$.db.call(sql);
    },
    
    /**
    * 获取服务器上的总数目
    */
    getTotal: function(callback){
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            //enyo.log(JSON.stringify(rs));
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
        
        var method = 'sync.CalendarEntryCount.get';
        var postdata = '<item>';
        //postdata += '<sDatetime>'+sDatetime+'</sDatetime>';
        //postdata += '<eDatetime>'+eDatetime+'</eDatetime>';
        if(self.args && self.args.sDatetime){
            postdata += '<sDatetime>'+ self.args.sDatetime +'</sDatetime>';
        }
        postdata += '</item>';
        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
    },
    
    /**
    * 服务器端要更新的数据列表
    * 须做分页判断
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
                //return callback(data);
                //ui.showMsg(L('pulling_failure')+JSON.stringify(inResponse)+',status='+inRequest.xhr.status);
                //inRequest.xhr.status == 0,重试抓取
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
        var method = 'sync.CalendarS2C.sync';
        var postdata = '<item>';
        postdata += self.is_first == true ? '<sync>all</sync>' : '<sync>new</sync>'; 
        postdata += next > 0 ? '<next>'+ next +'</next>' : '';
        postdata += '<prev>'+ self.prev_timestamp +'</prev>'; //业务在服务器最后操作的时间戳
        postdata += '<isDelLoc>0</isDelLoc>'; //是否删除服务器上的LOC数据
        //postdata += '<sDatetime>{20101102000000}</sDatetime>'; //sDatetime及eDatetime主要是为获取某个时间段数据时需要携带的参数
        //postdata += '<eDatetime>{20101231235959}</eDatetime>';
        if(self.status == 'RES' && self.args.sDatetime != ''){
            postdata += '<sDatetime>'+ self.args.sDatetime +'</sDatetime>';
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
                    data.push(row);
                    return self.getC2Srow(C2S_lists, callback, data);
                }else{
                    return self.getC2Srow(C2S_lists, callback, data);
                }
            }
            self.$.db.setMethod('find');
            var sql = {
                "query": 
                    {
                        "from": "com.palm.calendarevent:1",
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
        
        //取内容
        var func = function(rows, callback){
            var return_rows = [];
            if(rows.length == 0){
                return callback(return_rows);
            }
            var method = 'sync.CalendarS2C.get';
            var postdata = '';
            for(var i = 0; i < rows.length; i++){
                postdata += '<item><guid>'+ rows[i].guid +'</guid></item>';
            }
            var params = sync.getParams(method, postdata);
            self.$.web.call(params);
            
            self.onFailure = sync.webFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                if(rs){
                    self.__RETRY__ = 0;
                    return_rows = typeof(rs.data.query.item.length) == 'undefined' ? [rs.data.query.item] : rs.data.query.item;
                    return callback(return_rows);
                }else{
                    if(self.__RETRY__ < 5){
                        self.__RETRY__ += 1;
                        return func(rows, callback);
                    }else{
                        ui.showMsg(L('pulling_failure'));
                        return false;
                    }
                }
            }
        };

        //进度显示
        var __step__ = __step__ ? __step__ : 0;
        var __total__ = __total__ ? __total__ : S2C_lists.length;
        __step__ += S2C_lists.length < self.LIMIT ? S2C_lists.length : self.LIMIT;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("pulling_data") + progress);

        var rows = [];
        for(var i = 0; i < self.LIMIT; i++){
            if(S2C_lists.length == 0){
                break;
            }
            var row = S2C_lists.shift();
            if(row.action == 'add' || row.action == 'set'){
                rows.push(row);
            }else if(row.action == 'del'){
                data.push(row);
            }
        }
        
        return func(rows, function(return_rows){
            for(var k in return_rows){
                var return_row = return_rows[k];
                var guid = return_row['guid'] ? parseInt(return_row['guid']['#text']) : -1;
                var index = sync.isExists(guid, rows, 'guid');
                if(index !== false){
                    var row = rows[index];
                    row.data = return_row;
                    data.push(row);
                }
            }
            return self.getS2Crow(S2C_lists, callback, data, __step__, __total__);
        });
    },
    //同步到远端
    syncC2S: function(C2S_rows, callback, __step__, __total__){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        if(C2S_rows.length == 0){
            return callback();
        }
        //进度显示
        var __step__ = __step__ ? __step__ : 1;
        var __total__ = __total__ ? __total__ : C2S_rows.length;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("calendar_syncing") + progress);
        __step__ += 1;
        
        var row = C2S_rows.shift();
        if(row.action == 'add' || row.action == 'set'){
            self.onFailure = sync.webFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                //enyo.log("rs=" + enyo.json.stringify(rs));
                if(rs){
                    self.__RETRY__ = 0;
                    row.guid = row.action == 'add' ? parseInt(rs.data.query.item.guid['#text']) : row.guid; //获得guid并写入Map表
                    var actime = parseInt(rs.data.query.item['@attributes'].timestamp); //双向同步时用于回写
                    self.last_timestamp = Math.max(self.last_timestamp, actime);

                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        if(rs){
                            return self.syncC2S(C2S_rows, callback, __step__, __total__);
                        }else{
                            return self.syncC2S(C2S_rows, callback, __step__, __total__);//递归下一步
                        }
                    };
                    
                    if(row.action == 'add'){
                        self.$.db.setMethod('put');
                        var sql = {"objects": [{"_kind": "com.labi.map:1", "type": self.type, "username": self.username, "luid": row.luid, "lrev": row.lrev, "guid": row.guid, "erev": 0}]};
                    }else if(row.action == 'set'){
                        self.$.db.setMethod('merge');
                        var sql = {
                            "query": {
                                "from": "com.labi.map:1",
                                "where": [{"prop": "luid", "op": "=", "val": row.luid}, {"prop": "username", "op": "=", "val": self.username}]
                            },
                            "props": {"lrev": row.lrev, "erev": 0}
                        };
                    }
                    self.$.db.call(sql);
                }else{
                    if(self.__RETRY__ < 5){
                        C2S_rows.unshift(row);
                        __step__ -= 1;
                        self.__RETRY__ += 1;
                        return self.syncC2S(C2S_rows, callback, __step__, __total__);
                    }else{
                        return self.syncC2S(C2S_rows, callback, __step__, __total__);
                    }
                }
            }
            
            var method = row.action == 'add' ? 'sync.Calendar.add' : 'sync.Calendar.set';
            var postdata = self.convert(row, 'C2S');

            var params = sync.getParams(method, postdata);
            self.$.web.call(params);
        }else if(row.action == 'del'){
            self.onFailure = sync.webFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                //enyo.log("rs=" + enyo.json.stringify(rs));
                if(rs){
                    self.__RETRY__ = 0;
                    var last_timestamp = parseInt(rs.data.query['@attributes'].timestamp);
                    self.last_timestamp = Math.max(self.last_timestamp, last_timestamp);
                
                    //删除map表上的记录
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        return self.syncC2S(C2S_rows, callback, __step__, __total__);//递归下一步
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
                    if(self.__RETRY__ < 5){
                        C2S_rows.unshift(row);
                        __step__ -= 1;
                        self.__RETRY__ += 1;
                        return self.syncC2S(C2S_rows, callback, __step__, __total__);
                    }else{
                        return self.syncC2S(C2S_rows, callback, __step__, __total__);
                    }
                }
            }
            
            var method = 'sync.Calendar.del';
            var postdata = '<item>';
            postdata += '<luid>'+ row.luid +'</luid>';
            //postdata += '<imei>'+ _G.imei +'</imei>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>';
            postdata += '<guid>'+row.guid+'</guid>';
            postdata += '</item>';

            var params = sync.getParams(method, postdata);
            self.$.web.call(params);
        }
    },
    //同步到本地
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
            //如果是恢复，则action=set的也会等于add
            row.action = self.status == 'RES' ? 'add' : row.action;
            
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs){
                    var _id = row.luid ? row.luid : rs.results[0].id;
                    //求出lrev
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var map = sync.dbSuccess(inSender, inResponse, inRequest);
                        if(map){
                            map = map.results[0];
                            //成功后往远端回写数据主要是luid
                            self.onFailure = sync.dbFailure;
                            self.onSuccess = function(inSender, inResponse, inRequest){
                                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
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
                                        
                                        var method = 'sync.CalendarS2C.set';
                                        var postdata = '<item>';
                                        postdata += '<luid>'+ map._id +'</luid>';
                                        //postdata += '<imei>'+ _G.imei +'</imei>';
                                        postdata += '<clistamp>'+ map._rev +'</clistamp>';
                                        postdata += '<guid>'+row.guid+'</guid>';
                                        postdata += '<actime>'+row.timestamp+'</actime>';
                                        postdata += '</item>';

                                        var params = sync.getParams(method, postdata);
                                        self.$.web.call(params);
                                    };
                                    return func(0);
                                }else{
                                    return self.syncS2C(S2C_rows, callback, __step__, __total__);
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
                            "select": ["_id", "_rev"],
                            "from": "com.palm.calendarevent:1",
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
                        "from": "com.palm.calendarevent:1",
                        "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                    },
                    "props": _obj
                };
            }else{
                _obj._kind = "com.palm.calendarevent:1";
                _obj.accountId = "labi";
                if(row.luid){
                    _obj._id = row.luid;
                }
                self.$.db.setMethod('put');
                var sql = {"objects": [_obj]};
            }
            self.$.db.call(sql);
        }else if(row.action == 'del'){
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
                                var method = 'sync.CalendarS2C.set';
                                var postdata = '<item>';
                                postdata += '<luid>'+ row.luid +'</luid>';
                                //postdata += '<imei>'+ _G.imei +'</imei>';
                                postdata += '<clistamp>'+ row.lrev +'</clistamp>';
                                postdata += '<guid>'+ row.guid +'</guid>';
                                postdata += '<actime>'+ row.timestamp +'</actime>';
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
                    "from": "com.palm.calendarevent:1",
                    "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                }
            };
            self.$.db.call(sql);
        }
    },
    
    //循环规则转XML的repeat方法
    rrule2repeat: function(rrule){
        if(!rrule || !rrule.rules || typeof(rrule.rules.length) == 'undefined'){
            return '';
        }
        var byday_maps = {0: "SU", 1: "MO", 2: "TU", 3: "WE", 4: "TH", 5: "FR", 6: "SA"};
        
        var postdata = '<repeat>';
        
        if(rrule.freq == 'DAILY'){
            postdata += '<freq>DAY</freq>';
            //rrule.rules
        }else if(rrule.freq == 'WEEKLY'){ //周循环
            postdata += '<freq>WEE</freq>';
            
            for(var i = 0; i < rrule.rules.length; i++){
                var rule = rrule.rules[i];
                if(rule.ruleType == 'BYDAY' && rule.ruleValue.length > 0){ //每周星期几
                    var byday = '';
                    for(var j = 0; j < rule.ruleValue.length; j++){
                        var day = rule.ruleValue[j].day ? rule.ruleValue[j].day : '';
                        if(byday_maps[day]){
                            byday += byday == '' ? byday_maps[day] : ','+byday_maps[day];
                        }
                    }
                    postdata += byday == '' ? '' : '<byday>'+ byday +'</byday>'; //byday 实际上是星期几0-6
                }else if(0){ //未知其它方案
                
                }
            }
        }else if(rrule.freq == 'MONTHLY'){ //月循环
            postdata += '<freq>MON</freq>';
            
            for(var i = 0; i < rrule.rules.length; i++){
                var rule = rrule.rules[i];
                if(rule.ruleType == 'BYDAY' && rule.ruleValue.length > 0){ //"day": 1, "ord": 5 每月的第五个星期一
                    var byweekno = '';
                    var byday = '';
                    for(var j = 0; j < rule.ruleValue.length; j++){
                        var ord = rrule.ruleValue[i].ord ? rrule.ruleValue[i].ord : '';
                        var day = rule.ruleValue[i].day ? rule.ruleValue[i].day : '';
                        byweekno += byweekno == '' ? ord : ','+ord;
                        if(byday_maps[day]){
                            byday += byday == '' ? byday_maps[day] : ','+byday_maps[day];
                        }
                    }
                    postdata += byweekno == '' ? '' : '<byweekno>'+ byweekno +'</byweekno>'; //第几周
                    postdata += byday == '' ? '' : '<byday>'+ byday +'</byday>'; //byday 实际上是星期几0-6
                }else if(rule.ruleType == 'MONTHLY' && rule.ruleValue.length > 0){ //每月中第几天有效
                    var bymonthday = '';
                    for(var j = 0; j < rule.ruleValue.length; j++){
                        var day = rule.ruleValue[i].day ? rule.ruleValue[i].day : '';
                        bymonthday += bymonthday == '' ? day : ','+day;
                    }
                    postdata += bymonthday == '' ? '' : '<bymonthday>'+ bymonthday +'</bymonthday>'; //bymonthday每月几号
                }else if(0){ //未知其它方案
                
                }
            }
        }else if(rrule.freq == 'YEARLY'){
            postdata += '<freq>YEA</freq>';
            for(var i = 0; i < rrule.rules.length; i++){
                var rule = rrule.rules[i];
                if(rule.ruleType == 'BYDAY' && rule.ruleValue.length > 0){
                    var byyearday = '';
                    for(var j = 0; j < rule.ruleValue.length; j++){
                        var day = rule.ruleValue[i].day ? rule.ruleValue[i].day : '';
                        byyearday += byyearday == '' ? day : ','+day;
                    }
                    postdata += byyearday == '' ? '' : '<byyearday>'+ byyearday +'</byyearday>'; //每年的第几天生效
                }else if(0){ //未知其它方案
                
                }
            }
        }
        
        postdata +='<interval>'+ (rrule.interval ? rrule.interval : 1) +'</interval>';
        postdata += rrule.until ? '<until>'+ util.date(rrule.until) +'</until>' : '';
        postdata += '<exdate>';
        postdata += '<date t="EX"></date>'; //20101031{exceptions}包括哪天
        postdata += '<date t="IN"></date>'; //20101106{inclusions}不包括哪天
        postdata += '</exdate>';
        postdata += '</repeat>';
        return postdata;
    },
    
    //repeat的XML转JSON的rrule
    repeat2rrule: function(repeat){
        if(!repeat){
            return null;
        }
        var byday_maps = {"SU": 0, "MO": 1, "TU": 2, "WE": 3, "TH": 4, "FR": 5, "SA": 6};
        
        var _freq = repeat.freq['#text'];
        var _interval = repeat.interval['#text'];
        rrule = {"interval": parseInt(_interval)};
        if(repeat.until){
            rrule.until = util.str2time(repeat.until['#text']);
        }
        //多条重复规则
        rrule.rules = [];
        if(_freq == 'DAY'){
            rrule.freq = 'DAILY';
            
        }else if(_freq == 'WEE'){
            rrule.freq = 'WEEKLY';
            //每周的哪几天生效
            if(repeat.byday){
                var rule = {};
                rule.ruleType = 'BYDAY';
                rule.ruleValue = [];
                var days = repeat.byday['#text'].split(',');
                for(var i = 0; i < days.length; i++){
                    var day = days[i];
                    if(byday_maps[day]){
                        rule.ruleValue.push({"day": byday_maps[day]});
                    }
                }
                rrule.rules.push(rule);
            }
        }else if(_freq == 'MON'){
            rrule.freq = 'MONTHLY';
            
            //每月的哪几天生效
            if(repeat.byday){
                var rule = {};
                rule.ruleType = 'BYDAY';
                rule.ruleValue = [];
                var days = repeat.byday['#text'].split(',');
                var byweeknos = repeat.byweekno ? repeat.byweekno['#text'].split(',') : [];
                for(var i = 0; i < days.length; i++){
                    var day = days[i];
                    if(byday_maps[day]){
                        var _obj = {"day": byday_maps[day]};
                        if(byweeknos[i]){
                            _obj.ord = parseInt(byweeknos[i]);
                        }
                        rule.ruleValue.push(_obj);
                    }
                }
                rrule.rules.push(rule);
            }else if(repeat.bymonthday){
                var rule = {};
                rule.ruleType = 'MONTHLY';
                rule.ruleValue = [];
                var ords = repeat.bymonthday['#text'].split(',');
                for(var i = 0; i < ords.length; i++){
                    var ord = {"ord": parseInt(ords[i])};
                    rule.ruleValue.push(ord);
                }
                rrule.rules.push(rule);
            }
        }else if(_freq == 'YEA'){
            rrule.freq = 'YEARLY';
            if(repeat.byyearday){
                var rule = {};
                rule.ruleType = 'BYDAY';
                rule.ruleValue = [];
                var days = repeat.byyearday['#text'].split(',');
                for(var i = 0; i < days.length; i++){
                    var day = {"day": parseInt(days[i])};
                    rule.ruleValue.push(day);
                }
                rrule.rules.push(rule);
            }
        }
        //规则
        return rrule;
    },
    
    alarm2reminder: function(alarms){
        if(!alarms || typeof(alarms) != 'object' || typeof(alarms.length) == 'undefined'){
            return '';
        }
        //提醒，有多种方式
        var postdata = '';
        for(var i = 0; i < alarms.length; i++){
            var _alarm = alarms[i];
            var _method = _alarm.action == 'display' ? 'DISPLAY' : (_alarm.action == 'audio' ? 'AUDIO' : 'EMAIL');
            var _value = _alarm.alarmTrigger.value; //触发时间[NONE|-PT0M|-PT15M|-PT1H|-P1D] //-PT0M是0秒即事件开始时间
            var _valueType = _alarm.alarmTrigger.valueType; //DURATION

            var _match = _value.match(/^-PT([0-9]+)(M|H|D)$/);
            if(_match){
                var _v = {"M": 1, "H": 60, "D": 1440};
                var _t = parseInt(_match[1]);
                var _offset = _t * _v[_match[2]]; //分钟
                postdata += '<reminder>'; //可以多个
                postdata +=     '<method>'+ _method +'</method>'; //提醒方式：AUDIO|DISPLAY|EMAIL
                postdata +=     '<datetime></datetime>'; //该日程的提醒开始日期时间20101107023233}
                postdata +=     '<offset>'+ _offset +'</offset>'; //提醒边界偏移量，按分钟计算
                postdata +=     '<related>S</related>'; //醒边界选择标识，'S'=Start事件开始, 'E'=End事件结
                postdata +=     '<neg>0</neg>'; //0|1,提醒边界前后标识: 0在边界之前，1在边界之后
                postdata +=     '<repeats>0</repeats>'; //提醒的重复次数
                postdata +=     '<duration>0</duration>'; //重复提醒的间隔时间
                postdata +=     '<count>0</count>'; //{提醒的已经发生的次数}
                postdata += '</reminder>';
            }
        }
        return postdata;
    },
    
    //提醒转换为警报
    reminder2alarm: function(reminders){
        var alarms = [];
        if(!reminders){
            return alarms;
        }
        reminders = typeof(reminders.length) == 'undefined' ? [reminders] : reminders;
        for(var i = 0; i < reminders.length; i++){
            var reminder = reminders[i];
            var alarm = {};
            alarm.action = 'display'; //reminder.method['#text'] == 'DISPLAY' ? 'display' : (reminder.method['#text'] == 'AUDIO' ? 'audio' : 'email'); //目前只支持display?
            var _offset = reminder.offset['#text'] ? parseInt(reminder.offset['#text']) : 0;
            var _value = '';
            if(_offset < 60){
                _value = '-PT'+ _offset +'M';
            }else if(_offset < 1440){
                _value = '-PT'+ Math.floor(_offset / 60) +'H';
            }else{
                _value = '-PT'+ Math.floor(_offset / 1440) +'D';
            }
            alarm.alarmTrigger = {"value": _value, "valueType": "DURATION"}
            alarms.push(alarm);
        }
        
        return alarms;
    },
    
    convert: function(row, status){
        if(status == 'C2S'){
            var postdata = '';
            
            //calendar set add
            var _title = row.data.subject;
            var _notes = row.data.note;
            var _location = row.data.location;
            var _sDatetime = row.data.dtstart;
            var _eDatetime = row.data.dtend;
            var _allDay = row.data.allDay ? 1 : 0;
            var _tzId = row.data.tzId ? row.data.tzId : '-99999';
            var _timezone = util.timezone(_tzId);
            _timezone = _timezone ? _timezone * 60 : 28800; //秒数
            
            //如果是全天，转成时区的时间，修改于2012-08-31
            if(_allDay){
                _sDatetime += _timezone * 1000; //毫秒
                _eDatetime += _timezone * 1000;
            }
            
            postdata += '<item>';
            //postdata += '<imei>'+ _G.imei +'</imei>';
            postdata += '<luid>'+ row.luid +'</luid>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>'; //clistamp,此联系人上次同步的客户端版本号,必填
            postdata += '<guid>'+row.guid+'</guid>'; //和添加联系人一致，区别在于guid字段必须携带且不为0，并且type=set, guid不能=""而应=0
            postdata += '<title>'+ util.encode(util.str2xml(_title)) +'</title>'; //日程项的名称
            postdata += '<notes>'+ util.encode(util.str2xml(_notes)) +'</notes>'; //该日程项的完整描述
            postdata += '<type>E</type>'; //该日程项的类型{'E' = Event, 'T' = Task, 'A' = Anniversary, 'M' = Memo}
            postdata += '<location>'+ util.encode(util.str2xml(_location)) +'</location>'; //该日程项的地址
            postdata += '<timezone>'+ _timezone +'</timezone>'; //时区？？
            postdata += '<geo></geo>'; //该日程项的地址地理位置信息 lat:lon （浮点数：浮点数）
            postdata += '<sDatetime>'+ util.date(_sDatetime) +'</sDatetime>';
            postdata += '<duration></duration>';
            postdata += '<eDatetime>'+ util.date(_eDatetime) +'</eDatetime>';
            postdata += '<allDay>'+ _allDay +'</allDay>'; //0|1
            postdata += '<priority>4</priority>'; //默认是0，该日程项的优先级{（0-3）= High, （4-6）= Med, （7-9）= Low}
            postdata += '<class>P</class>'; //'P'|'R'|'C', 日程项的显示设置{'P'=Public(默认) 'R'=Private (其它人看不到该日程项), 'C' = Confidential
            postdata += '<url></url>'; //该日程项的URL链接
            postdata += '<commentUri></commentUri>'; //http://cal.gozap.com/comment/341243
            postdata += '<transparency></transparency>'; //'O'|'T', Opaque (default) or Transparent
            postdata += '<status></status>'; //"TENT|CONF|CANC|NEED|COMP|INPR|WAITING|DEFERRED"
            postdata += '<fb></fb>'; //"F|B|T|O"
            postdata += '<fba></fba>'; //"F|B|T|O"
            postdata += '<percent></percent>'; //日程项完成度，百分比
            postdata += '<completed></completed>'; //20101114000000{该日程项的结束时间}

            //重复项 row.data.rrule == null 是不重复
            postdata += self.rrule2repeat(row.data.rrule);
            postdata += self.alarm2reminder(row.data.alarm);
            
            if(row.data.attendees && typeof(row.data.attendees) == 'object' && typeof(row.data.attendees.length) != 'undefined'){
                for(var i = 0; i < row.data.attendees.length; i++){
                    var attendee = row.data.attendees[i];
                    if(!attendee){
                        continue;
                    }
                    if(attendee.organizer){
                        postdata += '<organizer>'; //可以多个
                        postdata += '<name>'+ util.encode(attendee.commonName) +'</name>';
                        postdata += '<email>'+ util.encode(attendee.email) +'</email>';
                        postdata += '</organizer>';
                    }else{
                        postdata += '<attendee>'; //可以多个
                        postdata += '<name>'+ util.encode(attendee.commonName) +'</name>';
                        postdata += '<email>'+ util.encode(attendee.email) +'</email>';
                        postdata += '</attendee>';
                    }
                }

            }

            postdata += '</item>';
            
            return postdata;
        }else if(status == 'S2C'){
            //初始化内容
            var _calendarId = '';
            var _allDay = (row.data.allDay && row.data.allDay['#text'] == '1') ? true : false;
            var _dtstart = row.data.sDatetime ? util.str2time(row.data.sDatetime['#text']) : 0;
            var _dtend = row.data.eDatetime ? util.str2time(row.data.eDatetime['#text']) : 0;
            var _subject = row.data.title ? row.data.title['#text'] : '';
            var _note = row.data.notes ? row.data.notes['#text'] : '';
            var _location = row.data.location ? row.data.location['#text'] : '';
            var _timezone = row.data.timezone ? parseInt(row.data.timezone['#text']) : -99999;
            //如果是全天，转成时区的时间，修改于2012-08-31
            if(_allDay && _timezone != -99999){
                _dtstart -= _timezone * 1000; //毫秒
                _dtend -= _timezone * 1000;
            }
            
            _timezone = util.timezone(_timezone); //timezone：秒数
            _timezone = _timezone ? _timezone : 'Asia/Shanghai';
            //enyo.log("**************"+JSON.stringify(row.data));
            //重复规则
            var _rrule = self.repeat2rrule(row.data.repeat);
            //日程提醒reminder
            var _alarm = self.reminder2alarm(row.data.reminder); //可能有多个
            //attendees
            var _attendees = [];
            var organizer = row.data.organizer ? row.data.organizer : [];
            organizer = typeof(organizer.length) != 'undefined' ? organizer : [organizer];
            for(var i = 0; i < organizer.length; i++){
                var o = organizer[i];
                if(!o){
                    continue;
                }
                var commonName = o.name ? util.decode(o.name['text']) : '';
                var email = o.email ? util.decode(o.email['text']) : '';
                _attendees.push({"commonName": commonName, "email": email, "organizer": true})
            }
            var attendee = row.data.attendee ? row.data.attendee : [];
            attendee = typeof(attendee.length) != 'undefined' ? attendee : [attendee];
            for(var i = 0; i < attendee.length; i++){
                var o = attendee[i];
                if(!o){
                    continue;
                }
                var commonName = o.name ? util.decode(o.name['text']) : '';
                var email = o.email ? util.decode(o.email['text']) : '';
                _attendees.push({"commonName": commonName, "email": email})
            }
            
            var obj = {
                "alarm": _alarm,
                "rrule": _rrule,
                "calendarId": _calendarId,
                "allDay": _allDay,
                "attendees": _attendees,
                "dtstart": _dtstart,
                "dtend": _dtend,
                "location": util.decode(_location),
                "note": util.decode(_note),
                "subject": util.decode(_subject),
                "tzId": _timezone
            };
            
            return obj;
        }
    }
});