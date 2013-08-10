enyo.kind({
    name: "Contact",
    kind: enyo.Control,
    components: [
        //web
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        //db
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"},
        //palm
        {kind: "PalmService", name: "photo", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.labi.service/"},
        //ui
        {kind: "ModalDialog", name: "selectNum", caption: "联系人恢复", lazy: false, components: [
            {flex: 1, name: "selectInfo", style: "font-size:16px; text-align:left;", content: ""},
            {flex: 1, layoutKind: "HFlexLayout", pack: "center", align: "center", style: "margin-top:5px;", components: [
                {kind: "Button", caption: "确定", onclick: "__RES"},
                {kind: "Button", caption: "取消", onclick: "cancel"}
            ]}
        ]}
    ],
    
    create: function(){
        this.accountId = '';
        this.inherited(arguments);
    },
    
    /**
    * 双向同步
    * 1、获得本地更新
    * 2、获得远端更新
    * 3、本地与远端比较去重得到新的C2S_lists 和 S2C_lists
    */
    SCD: function(){
        SIGN = '';
        self = this;
        self.type = 'contact';
        self.username = _G.username;
        self.status = 'SYNC';
        _G.bw = 0; //清空流量
        self.__RETRY__ = 0;
        self.args = {};
        self.luids = {};
        self.LIMIT = 20;

        //####1:
        self.getAccountId(function(){
            self.getTotal(function(sTotal){
                self.checkFirst(sTotal, function(){ //服务器数据为0时清空本地表
                    self.is_first = sTotal == 0 ? true : false;
                    self.getTimestamp(function(data){
                        self.prev_timestamp = data;
                        self.last_timestamp = 0;
                        self.is_first = self.prev_timestamp == 0 ? true : self.is_first; //版本列表,如果为空，表明是第一次同步
                        //####2:
                        self.getROW(function(data){
                            var ROW_lists = data;
                            var r;
                            for(var i = 0; i < ROW_lists.length; i++){
                                r = ROW_lists[i];
                                self.luids[r._id] = r._rev;
                            }
                            self.is_first = ROW_lists.length == 0 ? true : self.is_first; //本地列表为空，则首次同步
                            self.prev_timestamp = self.is_first == true ? 0 : self.prev_timestamp;
                            self.checkFirst(ROW_lists.length, function(){ 
                                self.getPersonRev(ROW_lists, function(data){
                                    var ROW_lists = data;
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
                                            //####5:
                                            self.getC2Srow(C2S_lists, function(data){
                                                var C2S_rows = data; //完全的到服务器的数据列表
                                                //####6:
                                                self.getS2Crow(S2C_lists, function(data){
                                                    var S2C_rows = data; //完全的到本地的数据列表
                                                    //enyo.log('C2S_rows:' + enyo.json.stringify(C2S_rows));
                                                    //enyo.log('S2C_rows:' + enyo.json.stringify(S2C_rows));
                                                    //return false;
                                                    //####7:
                                                    self.syncC2S(C2S_rows, function(){
                                                        //####8:
                                                        self.syncS2C(S2C_rows, function(personRows){
                                                            //enyo.log('personRows:' + enyo.json.stringify(personRows));
                                                            self.setPerson(personRows, function(){
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
        self.type = 'contact';
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
        
        self.getAccountId(function(){
            self.getTotal(function(total){
                var sTotal = total;
                if(total == 0){
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
        });
    },
    
    __RES: function(){
        var self = this;
        ui.waitingClose();
        self.$.selectNum.close();
        ui.waitingOpen(L("contact_restoring"));
        
        self.getS2C(function(data){
            var S2C_lists = data;
            self.getS2Crow(S2C_lists, function(data){
                var S2C_rows = data;
                self.clean(function(){
                    self.syncS2C(S2C_rows, function(personRows){
                        self.setPerson(personRows, function(){
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
    },
    
    getAccountId: function(callback){
        var self = this;
        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "from": "com.palm.account:1",
                "where": [{"prop":"capabilityProviders.capability","op":"=","val":"CONTACTS"}, {"prop":"beingDeleted","op":"=","val":false}]
            }
        };
        self.$.db.call(sql);
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            //enyo.log(JSON.stringify(inResponse));
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            if(rs && rs.results && rs.results.length > 0){
                for(var i in rs.results){
                    var account = rs.results[i];
                    if(account.templateId == 'com.palm.palmprofile'){
                        self.accountId = account._id;
                        break;
                    }
                }
            }
            return callback();
        }
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
                var data = rs.contact_prev_timestamp ? rs.contact_prev_timestamp : 0;
            }else{
                var data = 0;
            }
            return callback(data);
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "select": ["contact_prev_timestamp"],
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
                var obj = {"contact_prev_timestamp": last_timestamp, "contact_last_res": util.timestamp()};
            }else{
                last_timestamp = Math.max(last_timestamp, self.prev_timestamp);
                var obj = {"contact_prev_timestamp": last_timestamp, "contact_last_sync": util.timestamp()};
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
                    "from": "com.palm.contact:1"
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

    //获得头象
    getPhoto: function(photos, callback){
        if(!photos || typeof(photos) != 'object' || typeof(photos.length) == 'undefined'){
            return callback('');
        }
        if(photos.length == 0){
            return callback('');
        }
        
        var file = '';
        for(var i = 0; i < photos.length; i++){
            if(!photos[i] || typeof(photos[i]) != 'object'){
                continue;
            }
            if(photos[i].type == 'type_square'){
                file = photos[i].localPath;
                break;
            }
        }
        
        if(file){
            self.onFailure = sync.palmFailure;
            self.onSuccess = function(inSender, inResponse){
                //enyo.log("get: inResponse=" + enyo.json.stringify(inResponse));
                var rs = sync.palmSuccess(inResponse);
                if(rs){
                    var base64 = rs.base64;
                }else{
                    var base64 = '';
                }
                return callback(base64);
            };
            
            self.$.photo.setMethod('read');
            self.$.photo.call({"file": file});
        }else{
            return callback('');
        }
    },
    //base64,写入成功后返回file
    setPhoto: function(base64, callback){
        if(base64){
            self.onFailure = sync.palmFailure;
            self.onSuccess = function(inSender, inResponse){
                //enyo.log("set: inResponse=" + enyo.json.stringify(inResponse));
                var rs = sync.palmSuccess(inResponse);
                if(rs){
                    var file = rs.file;
                }else{
                    var file = '';
                }
                return callback(file);
            };
            
            self.$.photo.setMethod('write');
            self.$.photo.call({"base64": base64});
        }else{
            return callback('');
        }
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
                    "from": "com.palm.contact:1"
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
                    "select": ["_id", "luid", "lrev", "guid", "erev"], 
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
                    "from": "com.palm.contact:1", 
                    "limit": 500,
                    "page": next
                }
        };
        self.$.db.call(sql);
    },
    
    /**
    * 获得person的Rev
    */
    getPersonRev: function(ROW_lists, callback, data){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        
        var data = data ? data : [];
        if(ROW_lists == 0){
            return callback(data);
        }
        
        var self = this;
        var row = ROW_lists.shift();
        
        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_rev", "favorite"], 
                    "from": "com.palm.person:1", 
                    "limit": 1,
                    "where": [{"prop": "contactIds", "op": "=", "val": row._id}]
                }
        };
        self.$.db.call(sql);
        
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            //enyo.log("rs=" + enyo.json.stringify(rs.results));
            if(rs && rs.results && rs.results.length > 0){
                row.erev = rs.results[0]['favorite']  == true ? 1 : 0;
            }else{
                row.erev = 0;
            }
            data.push(row);
            self.getPersonRev(ROW_lists, callback, data);
        };
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
                var data = parseInt(rs.data.query.item.count['#text']);
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
        
        var method = 'sync.contacts.count';
        var postdata = '<item>';
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
                    var _clistamp = _obj.clistamp['#text'] ? parseInt(_obj.clistamp['#text']) : 0;
                    var _createTime = _obj.createTime['#text'] ? parseInt(_obj.createTime['#text']) : 0;
                    
                    var _obj = {"action": _action, "luid": _luid, "lrev": parseInt(_clistamp), "guid": parseInt(_guid), "timestamp": _timestamp};
                    item_lists.push(_obj);
                    self.last_timestamp = Math.max(self.last_timestamp, _timestamp); //最后时间戳，用于回写
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
        var method = 'sync.contactsS2C.sync';
        var postdata = '<item>';
        postdata += self.is_first == true ? '<sync>all</sync>' : '<sync>new</sync>'; //首次同步时版本列表应该是空数组
        postdata += next > 0 ? '<next>'+ next +'</next>' : ''; //如果需要分页获取时需要发送多个请求， 第一个请求时next字段可以不携带， 第二请求时next字段填写回复协议中所有 item节点 timestamp属性的最大值. ，首次为空
        postdata += '<prev>'+ self.prev_timestamp +'</prev>'; //业务在服务器最后操作的时间戳
        postdata += '<isDelLoc>0</isDelLoc>'; //是否删除服务器上的LOC数据
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
                    self.getPerson(row.luid, function(person){
                        if(person){
                            person.erev = person.favorite == true ? 1 : 0;
                        }else{
                            var person = {"erev": 0};
                        }
                        row.person = person;
                        data.push(row);
                        return self.getC2Srow(C2S_lists, callback, data);
                    });
                }else{
                    return self.getC2Srow(C2S_lists, callback, data);
                }
            }
            self.$.db.setMethod('find');
            var sql = {
                "query": 
                    {
                        "from": "com.palm.contact:1",
                        "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                    }
            };
            self.$.db.call(sql);
        }else if(row.action == 'del'){
            data.push(row);
            return self.getC2Srow(C2S_lists, callback, data);
        }
    },
    
    getPerson: function(contactId, callback){
        var self = this;
        self.$.db.setMethod('find');
        var sql = {
            "query": 
                {
                    "select": ["_id", "_rev", "favorite"],
                    "from": "com.palm.person:1", 
                    "limit": 1,
                    "where": [{"prop": "contactIds", "op": "=", "val": contactId}]
                }
        };
        self.$.db.call(sql);
        
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            //enyo.log("rs=" + enyo.json.stringify(inResponse));
            if(rs && rs.results.length == 1){
                var data = rs.results[0];
            }else{
                var data = false;
            }
            return callback(data);
        };
    },
    
    //返回rev
    //非实时,首先返回
    setPerson: function(personRows, callback, __retry__){
        var self = this;
        var __retry__ = __retry__ ? __retry__ : 0;
        
        if(personRows.length == 0){
            return callback();
        }
        
        ui.waitingOpen("正在结束操作");
        
        var row = personRows.shift();

        self.getPerson(row.contactId, function(obj){
            if(!obj && __retry__ < 10){
                personRows.unshift(row);
                setTimeout(function(){
                    return self.setPerson(personRows, callback, __retry__ + 1);
                }, 1000);
            }else{
                row.obj._id = obj._id;
                row.obj._kind = 'com.palm.person:1';
                self.$.db.setMethod('merge');
                self.$.db.call({"objects": [row.obj]});
                self.onFailure = sync.dbFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                    //enyo.log("inResponse=" + enyo.json.stringify(row.obj));
                    if(rs && rs.results.length == 1){
                        var erev = row.obj.favorite == true ? 1 : 0;
                        self.setMap(row.contactId, erev, function(){
                            return self.setPerson(personRows, callback);
                        });
                    }else{
                        return self.setPerson(personRows, callback);
                    }
                };
            }
        });
    },
    
    setMap: function(luid, erev, callback){
        var self = this;

        self.$.db.setMethod('merge');
        var sql = {
            "query": 
                {
                    "from": "com.labi.map:1", 
                    "where": [{"prop": "luid", "op": "=", "val": luid}, {"prop": "username", "op": "=", "val": self.username}]
                },
            "props": {"erev": erev}
        };
        self.$.db.call(sql);
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            return callback();
        };
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
            var method = 'sync.contactsS2C.get';
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
        ui.waitingOpen(L('pulling_data') + progress);

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
        ui.waitingOpen(L('contact_syncing') + progress);
        __step__ += 1;
        
        var row = C2S_rows.shift();
        
        if(row.action == 'add' || row.action == 'set'){
            if(!row.luid){
                return self.syncC2S(C2S_rows, callback, __step__, __total__);
            }
            //头像
            var photo = (row.data.photos && row.data.photos.length > 0) ? row.data.photos : [];
            self.getPhoto(photo, function(data){
                row.base64 = data;
                self.onFailure = sync.webFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                    //enyo.log("rs=" + enyo.json.stringify(inResponse));
                    if(rs){
                        self.__RETRY__  = 0;
                        row.guid = row.action == 'add' ? parseInt(rs.data.query.item.guid['#text']) : row.guid; //获得guid并写入Map表
                        var actime = parseInt(rs.data.query.item['@attributes'].timestamp); //双向同步时用于回写
                        self.last_timestamp = Math.max(self.last_timestamp, actime);
                        //enyo.log('selftime='+self.last_timestamp+',actime='+actime);
                        self.onFailure = function(inSender, inResponse, inRequest){
                            ui.halt('测试出错=' + enyo.json.stringify(row));
                            return sync.dbFailure(inSender, inResponse, inRequest);
                        }
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
                            var sql = {"objects": [{"_kind": "com.labi.map:1", "type": self.type, "username": self.username, "luid": row.luid, "lrev": row.lrev, "guid": row.guid, "erev": row.person.erev}]};
                        }else if(row.action == 'set'){
                            self.$.db.setMethod('merge');
                            var sql = {
                                "query": {
                                    "from": "com.labi.map:1",
                                    "where": [{"prop": "luid", "op": "=", "val": row.luid}, {"prop": "username", "op": "=", "val": self.username}]
                                },
                                "props": {"lrev": row.lrev, "erev": row.person.erev}
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
                
                var method = row.action == 'add' ? 'sync.contacts.add' : 'sync.contacts.set';
                var postdata = self.convert(row, 'C2S');

                var params = sync.getParams(method, postdata);
                self.$.web.call(params);
            });
        }else if(row.action == 'del'){
            self.onFailure = sync.webFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                //enyo.log("rs=" + enyo.json.stringify(rs));
                if(rs){
                    self.__RETRY__  = 0;
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
            
            var method = 'sync.contacts.del';
            var postdata = '<item>';
            postdata += '<luid>'+ row.luid +'</luid>';
            postdata += '<imei>'+ _G.imei +'</imei>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>';
            postdata += '<guid>'+row.guid+'</guid>';
            postdata += '</item>';

            var params = sync.getParams(method, postdata);
            self.$.web.call(params);
        }
    },
    //同步到本地
    syncS2C: function(S2C_rows, callback, __step__, __total__, __data__){
        if(SIGN == 'back'){
            ui.stop('操作被取消');
            return false;
        }
        var __data__ = __data__ ? __data__ : [];
        if(S2C_rows.length == 0){
            return callback(__data__);
        }
        //进度显示
        var __step__ = __step__ ? __step__ : 1;
        var __total__ = __total__ ? __total__ : S2C_rows.length;
        var progress = __step__ + '/' + __total__;
        ui.waitingOpen(L("sync_to_local") + progress);
        __step__ += 1;

        var row = S2C_rows.shift();
        //enyo.log("rs=" + enyo.json.stringify(row));
        if(row.action == 'add' || row.action == 'set'){
            //如果是恢复，则action=set的也会等于add
            row.action = self.status == 'RES' ? 'add' : row.action;
            //头像
            var base64 = (row.data.photo && row.data.photo.buffer) ? row.data.photo.buffer['#text'] : '';
            self.setPhoto(base64, function(data){
                row.file = data;
                self.onFailure = sync.dbFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                    if(rs){
                        var _id = row.luid ? row.luid : rs.results[0].id;
                        //enyo.log("_ID: "+_id);
                        //求出lrev
                        self.onFailure = sync.dbFailure;
                        self.onSuccess = function(inSender, inResponse, inRequest){
                            var map = sync.dbSuccess(inSender, inResponse, inRequest);
                            if(map){
                                map = map.results[0];
                                //成功后往远端回写数据，主要是luid
                                self.onFailure = sync.dbFailure;
                                self.onSuccess = function(inSender, inResponse, inRequest){
                                    var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                                    if(rs){
                                        var func = function(__func_retry__){
                                            self.onFailure = sync.webFailure;
                                            self.onSuccess = function(inSender, inResponse, inRequest){
                                                var rs = sync.webSuccess(inSender, inResponse, inRequest);
                                                if(rs){
                                                    __data__.push({"contactId": map._id, "obj": personObj});
                                                    return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);//递归下一步
                                                }else{
                                                    if(__func_retry__ < 5){
                                                        return func(__func_retry__ + 1);
                                                    }else{
                                                        __data__.push({"contactId": map._id, "obj": personObj});
                                                        return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);//递归下一步
                                                    }
                                                }
                                            }
                                            
                                            var method = 'sync.contactsS2C.set';
                                            var postdata = '<item>';
                                            postdata += '<luid>'+ map._id +'</luid>';
                                            postdata += '<imei>'+ _G.imei +'</imei>';
                                            postdata += '<clistamp>'+ map._rev +'</clistamp>';
                                            postdata += '<guid>'+row.guid+'</guid>';
                                            postdata += '<actime>'+row.timestamp+'</actime>';
                                            postdata += '</item>';
                                            var params = sync.getParams(method, postdata);
                                            self.$.web.call(params);
                                        };
                                        return func(0);
                                    }else{
                                        return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);
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
                                return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);
                            }
                        };
                        
                        self.$.db.setMethod('find');
                        var sql = {
                            "query": {
                                "select": ["_id", "_rev"],
                                "from": "com.palm.contact:1",
                                "where": [{"prop": "_id", "op": "=", "val": _id}]
                            }
                        };
                        self.$.db.call(sql);
                    }else{
                        return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);//递归下一步
                    }
                };
                
                var _obj = self.convert(row, 'S2C');
                personObj = {"favorite": _obj.favorite}
                delete _obj.favorite;
                
                if(self.luids.hasOwnProperty(row.luid)){
                    self.$.db.setMethod('merge');
                    var sql = {
                        "query": {
                            "from": "com.palm.contact:1",
                            "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                        },
                        "props": _obj
                    };
                }else{
                    _obj._kind = "com.palm.contact.palmprofile:1";
                    _obj.accountId = self.accountId;//"++HmuXw3_F8MRmfj";//"labi";
                    if(row.luid){
                        _obj._id = row.luid;
                    }
                    self.$.db.setMethod('put');
                    var sql = {"objects": [_obj]};
                }
                self.$.db.call(sql);
            });
        }else if(row.action == 'del'){
            self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs){
                    //删除map表上的记录
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        //回写服务器端
                        if(rs){
                            var func = function(__func_retry__){
                                self.onFailure = sync.webFailure;
                                self.onSuccess = function(inSender, inResponse, inRequest){
                                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                                    if(rs){
                                        return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);
                                    }else{
                                        if(__func_retry__ < 5){
                                            return func(__func_retry__ + 1);
                                        }else{
                                            return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);
                                        }
                                    }
                                }
                                
                                var method = 'sync.contactsS2C.set';
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
                            return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);//递归下一步
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
                    return self.syncS2C(S2C_rows, callback, __step__, __total__, __data__);//递归下一步
                }
            };
            
            self.$.db.setMethod('del');
            var sql = {
                "query": {
                    "from": "com.palm.contact:1",
                    "where": [{"prop": "_id", "op": "=", "val": row.luid}]
                }
            };
            self.$.db.call(sql);
        }
    },
    
    convert: function(row, action){
        if(action == 'C2S'){
            var postdata = '';
            //数据
            
            
            var _nts = row.data.note ? row.data.note : '';
            var _nick = row.data.nickname ? row.data.nickname : '';
            // name can be undefined from google sync data
            if(typeof(row.data.name) == 'undefined'){
                var _name = _nick;
                var _prefix = '';
                var _suffix = '';
                var _fn = '';
                var _ln = '';
                var _mn = '';
            }else{
                var _name = row.data.name.givenName ? row.data.name.givenName : '';
                var _prefix = row.data.name.honorificPrefix ? row.data.name.honorificPrefix : '';
                var _suffix = row.data.name.honorificSuffix ? row.data.name.honorificSuffix : '';
                var _fn = row.data.name.givenName ? row.data.name.givenName : '';
                var _ln = row.data.name.familyName ? row.data.name.familyName : '';
                var _mn = row.data.name.middleName ? row.data.name.middleName : '';
            }
            
            var _organizations = (row.data.organizations && typeof(row.data.organizations.length) != 'undefined' && row.data.organizations.length > 0) ? row.data.organizations[0] : {};
            var _jt = _organizations.title ? _organizations.title : '';
            var _com = _organizations.name ? _organizations.name : '';
            var _dep = _organizations.department ? _organizations.department: '';
            _birth = row.data.birthday ? util.str2time(row.data.birthday+' 00:00:00') : '';
            _birth = _birth === '' ? 0 : Math.round(_birth/1000); //to sec

            
            postdata += '<item>';
            postdata += '<luid>'+ row.luid +'</luid>';
            //postdata += '<imei>'+ _G.imei +'</imei>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>'; //clistamp,此联系人上次同步的客户端版本号,必填
            postdata += '<guid>'+row.guid+'</guid>'; //和添加联系人一致，区别在于guid字段必须携带且不为0，并且type=set, guid不能=""而应=0
            postdata += '<src>'+(_ln != '' ? 1 : 0)+'</src>';
            postdata += '<prefix>'+ util.encode(util.str2xml(_prefix)) +'</prefix>';
            postdata += '<suffix>'+ util.encode(util.str2xml(_suffix)) +'</suffix>';
            postdata += '<fn>'+ util.encode(util.str2xml(_fn)) +'</fn>';
            postdata += '<ln>'+ util.encode(util.str2xml(_ln)) +'</ln>';
            postdata += '<mn>'+ util.encode(util.str2xml(_mn)) +'</mn>';
            postdata += '<name>'+ util.encode(util.str2xml(_name)) +'</name>';
            postdata += '<jt>'+ util.encode(util.str2xml(_jt)) +'</jt>';
            postdata += '<com>'+ util.encode(util.str2xml(_com)) +'</com>';
            postdata += '<dep>'+ util.encode(util.str2xml(_dep)) +'</dep>';
            if(_birth > 0){
                postdata += '<birth>'+ _birth +'</birth>';
            }
            postdata += '<nts>'+ util.encode(util.str2xml(_nts)) +'</nts>';
            postdata += '<nick>'+ util.encode(util.str2xml(_nick)) +'</nick>';
            
            if(row.base64){
                postdata += '<photo><buffer>'+ row.base64 +'</buffer></photo>';
            }
            if(row.person && row.person.favorite == true){
                postdata += '<favorite>1</favorite>';
            }else{
                postdata += '<favorite>0</favorite>';
            }
            //email
            var email_maps = {"type_work": "WE", "type_home": "HE", "type_mobile": "ME", "type_other": "OE"};
            for(var i in row.data.emails){
                var email = row.data.emails[i];
                var _em = email.value;
                var _t = typeof(email_maps[email.type]) != 'undefine' ? email_maps[email.type] : "";
                _t = _t == '' ? _t : ' t="'+ _t +'"';
                postdata += '<em'+ _t +'>'+ _em +'</em>';
            }
            //im
            var im_maps = {"type_aim": "AIM", "type_gtalk": "GTA", "type_irc": "", "type_yjp": "", "type_lcs": "", 
                            "type_dotmac": "", "type_icq": "ICQ", "type_xmpp": "", "type_msn": "MSN", "type_skype": "SKY", 
                            "type_qq": "QQ", "type_jabber": "JAB", "type_yahoo": "YAH", "type_default": ""};
            for(var i in row.data.ims){
                var im = row.data.ims[i];
                var _im = im.value;
                var _t = typeof(im_maps[im.type]) != 'undefine' ? im_maps[im.type] : "";
                _t = _t == '' ? _t : ' t="'+ _t +'"';
                postdata += '<im'+ _t +'>'+ _im +'</im>';
            }
            //phone numbers
            var ph_maps = {"type_mobile": "MP", "type_home": "HP", "type_work": "WP", "type_work_fax": "FX", "type_other": "OP"};
            for(var i in row.data.phoneNumbers){
                var ph = row.data.phoneNumbers[i];
                var _ph = ph.value;
                var _t = typeof(ph_maps[ph.type]) != 'undefine' ? ph_maps[ph.type] : "";
                _t = _t == '' ? _t : ' t="'+ _t +'"';
                postdata += '<ph'+ _t +'>'+ _ph +'</ph>';
            }
            //url
            var url_maps = {"type_home": "HW", "type_work": "WW"};
            for(var i in row.data.urls){
                var url = row.data.urls[i];
                var _wp = url.value;
                var _t = typeof(url_maps[url.type]) != 'undefine' ? url_maps[url.type] : "";
                _t = _t == '' ? _t : ' t="'+ _t +'"';
                postdata += '<wp'+ _t +'>'+ _wp +'</wp>';
            }
            //address
            var address_maps = {"type_home": "HA", "type_work": "WA", "type_other": "OA"};
            if(row.data.addresses){
                for(var i in row.data.addresses){
                    var address = row.data.addresses[i];
                    var _t = typeof(address_maps[address.type]) != 'undefine' ? address_maps[address.type] : "";
                    _t = _t == '' ? _t : ' t="'+ _t +'"';
                    var _zip = address.postalCode ? address.postalCode : '';
                    var _address = address.country + address.locality + address.region + address.streetAddress;

                    postdata += '<addr'+ _t +'>';
                    postdata += '<src>0</src>'; //非结构化
                    postdata += '<zip>'+ _zip +'</zip>'; //{邮编}
                    postdata += '<address>'+ util.encode(util.str2xml(_address)) +'</address>'; //{非结构化地址，映射到street}
                    postdata += '</addr>';
                }
            }
            
            postdata += '</item>';
            return postdata;
        }else if(action == 'S2C'){
            //src = 0|1结构化名字
            var _src = row.data.src ? parseInt(row.data.src['#text']) : 0; 
            var _givenName = row.data.name ? row.data.name['#text'] : ''; //这个实际是first name
            var _firstName = row.data.fn ? row.data.fn['#text'] : ''; //first name
            var _middleName = row.data.mn ? row.data.mn['#text'] : ''; //middle name
            var _familyName = row.data.ln ? row.data.ln['#text'] : ''; //last name
            var _honorificPrefix = row.data.prefix ? row.data.prefix['#text'] : '';
            var _honorificSuffix = row.data.suffix ? row.data.suffix['#text'] : '';
            _givenName = util.decode(_givenName);
            _firstName = util.decode(_firstName);
            _middleName = util.decode(_middleName);
            _familyName = util.decode(_familyName);
            _honorificPrefix = util.decode(_honorificPrefix);
            _honorificSuffix = util.decode(_honorificSuffix);
            if(_src == 1){
                _givenName = _firstName;
            }else{
                _givenName = _givenName == '' ? _firstName : _givenName;
            }
            var _name = {"givenName": _givenName, "middleName": _middleName, "familyName": _familyName, "honorificPrefix": _honorificPrefix, "honorificSuffix": _honorificSuffix};

            var _birthday = row.data.birth ? parseInt(row.data.birth['#text']) : '';
            _birthday = _birthday ? util.date(_birthday) : '';
            _birthday = _birthday ? _birthday.split(' ')[0] : '';
            
            //email
            var email_maps = {"WE": "type_work", "HE": "type_home", "ME": "type_mobile", "OE": "type_other"};
            var _emails = [];
            if(row.data.em){
                var ems = typeof(row.data.em.length) == 'undefined' ? [row.data.em] : row.data.em;
                for(var i in ems){
                    var em = ems[i];
                    var _type = em["@attributes"] ? em["@attributes"].t : '';
                    _type = email_maps[_type] ? email_maps[_type] : '';
                    var _value = em["#text"];
                    var _email = {"type": _type, "value": _value};
                    _emails.push(_email);
                }
            }
            //im
            var im_maps = {"AIM": "type_aim", "GTA": "type_gtalk", "x": "type_irc", "x": "type_yjp", "x": "type_lcs", 
                            "x": "type_dotmac", "ICQ": "type_icq", "x": "type_xmpp", "MSN": "type_msn", "SKY": "type_skype", 
                            "QQ": "type_qq", "JAB": "type_jabber", "YAH": "type_yahoo", "x": "type_default"};
            var _ims = [];
            if(row.data.im){
                var ims = typeof(row.data.im.length) == 'undefined' ? [row.data.im] : row.data.im;
                for(var i in ims){
                    var im = ims[i];
                    var _type = im["@attributes"] ? im["@attributes"].t : '';
                    _type = im_maps[_type] ? im_maps[_type] : '';
                    var _value = im["#text"];
                    var _im = {"type": _type, "value": _value};
                    _ims.push(_im);
                }
            }
            //phone
            var ph_maps = {"MP": "type_mobile", "HP": "type_home", "WP": "type_work", "FX": "type_work_fax", "OP": "type_other"};
            var _phoneNumbers = [];
            if(row.data.ph){
                var phs = typeof(row.data.ph.length) == 'undefined' ? [row.data.ph] : row.data.ph;
                for(var i in phs){
                    var ph = phs[i];
                    var _type = ph["@attributes"] ? ph["@attributes"].t : '';
                    _type = ph_maps[_type] ? ph_maps[_type] : '';
                    var _value = ph["#text"];
                    var _ph = {"type": _type, "value": _value};
                    _phoneNumbers.push(_ph);
                }
            }
            //url
            var url_maps = {"HW": "type_home", "WW": "type_work"};
            var _urls = [];
            if(row.data.wp){
                var wps = typeof(row.data.wp.length) == 'undefined' ? [row.data.wp] : row.data.wp;
                for(var i in wps){
                    var wp = wps[i];
                    var _type = wp["@attributes"] ? wp["@attributes"].t : '';
                    _type = url_maps[_type] ? url_maps[_type] : '';
                    var _value = wp["#text"];
                    var _wp = {"type": _type, "value": _value};
                    _urls.push(_wp);
                }
            }

            
            //address
            var address_maps = {"HA": "type_home", "WA": "type_work", "OA": "type_other"};
            var _addresses = [];
            if(row.data.addr){
                var addrs = typeof(row.data.addr.length) == 'undefined' ? [row.data.addr] : row.data.addr;
                for(var i in addrs){
                    var addr = addrs[i];
                    var _type = addr["@attributes"] ? addr["@attributes"].t : '';
                    _type = address_maps[_type] ? address_maps[_type] : '';
                    var _streetAddress = addr.address ? addr.address["#text"] : '';
                    _streetAddress = _streetAddress == '' ? (addr.ctry ? addr.ctry['#text'] : '') + (addr.prov ? addr.prov['#text'] : '') + (addr.cty ? addr.cty['#text'] : '') + (addr.nbh ? addr.nbh['#text'] : '') + (addr.str ? addr.str['#text'] : '') + (addr.ad ? addr.ad['#text'] : '') : _streetAddress;
                    var _postalCode = addr.zip ? addr.zip['#text'] : '';
                    var _addr = {"type": _type, "country": "", "locality": "", "region": "", "streetAddress": util.decode(_streetAddress), "postalCode": _postalCode};
                    _addresses.push(_addr);
                }
            }
            
            //org
            var _organizations = [];
            var _org_name = row.data.com ? row.data.com['#text'] : '';
            var _org_title = row.data.jt ? row.data.jt['#text'] : '';
            _organizations.push({"name": util.decode(_org_name), "title": util.decode(_org_title)});
            //notes
            var _note = '';
            if(row.data.nts){
                if(row.data.nts.length){
                    _note = row.data.nts[0]['#text'];
                }else{
                    _note = row.data.nts['#text'];
                }
                _note = util.decode(_note);
            }
            //
            var _nickname = '';
            if(row.data.nick){
                var nick = typeof(row.data.nick.length) == 'undefined' ? row.data.nick : row.data.nick[0];
                _nickname = util.decode(nick['#text']);
            }
            //favorite
            var _favorite = row.data.favorite ? parseInt(row.data.favorite['#text']) : 0;
            _favorite = _favorite == 0 ? false : true;
            
            var obj = {"name": _name, "birthday": _birthday, "emails": _emails, "ims": _ims, "organizations": _organizations, "phoneNumbers": _phoneNumbers, 
                        "note": _note, "addresses": _addresses, "urls": _urls, "nickname": _nickname,
                        "favorite": _favorite
                        };
            if(row.file){
                obj.photos = [{"localPath": row.file, "primary": false, "type": "type_square", "value": row.file}];
            }
            
            return obj;
        }
    }
});