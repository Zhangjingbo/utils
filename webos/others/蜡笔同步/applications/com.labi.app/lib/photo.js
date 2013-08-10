enyo.kind({
    name: "Photo",
    kind: enyo.Control,
    components: [
        //web
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        //db
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"}, 
        //palm
        {kind: "PalmService", name: "file", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.labi.service/"},
        //right,要先取多媒体的读取权限
        {kind: "PalmService", name: "permission", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.mediapermissions/", method: "request"}
    ],
    
    getPermission: function(callback){
        self.onFailure = sync.palmFailure;
        self.onSuccess = function(inSender, inResponse){
            //enyo.log("inResponse=" + enyo.json.stringify(inResponse));
            var rs = sync.palmSuccess(inResponse);
            if(rs && rs.isAllowed == true){
                callback();
            }else{
                //error: show无权限
            }
        };
    
        var params = {"read":["com.palm.media.image.file:1", "com.palm.media.image.album:1"]};
        this.$.permission.call({ "rights":params});
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
        self.type = 'photo';
        self.username = _G.username;
        self.status = 'SYNC';
        _G.bw = 0; //清空流量
        self.__RETRY__ = 0;
        self.luids = {};
        self.LIMIT = 20;
        
        //####0:
        self.getPermission(function(){
            //####1:
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
                            var rs = data[i];
                            if(rs.path && rs.path.match(/^\/media\/internal\/DCIM\//g)){
                                delete rs['path'];
                                ROW_lists.push(rs);
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
    },
    
    //[1]获得上次最大时间戳
    getTimestamp: function(callback){
        self.onFailure = sync.dbFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
            //enyo.log("rs: " + enyo.json.stringify(rs));
            if(rs && rs.results.length > 0){
                rs = rs.results[0];
                var data = rs.photo_prev_timestamp ? rs.photo_prev_timestamp : 0;
            }else{
                var data = 0;
            }
            return callback(data);
        };

        self.$.db.setMethod('find');
        var sql = {
            "query": {
                "select": ["photo_prev_timestamp"],
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
                var obj = {"photo_prev_timestamp": last_timestamp, "photo_last_res": util.timestamp()};
            }else{
                last_timestamp = Math.max(last_timestamp, self.prev_timestamp);
                var obj = {"photo_prev_timestamp": last_timestamp, "photo_last_sync": util.timestamp()};
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

    //传入photo的file内容,先查出文件信息，然后检查服务器上是否存在此文件
    //把图片等上传到服务器返回URL组装后返回
    upload: function(file, callback){
        if(!file){
            return callback('');
        }
        self.onFailure = sync.palmFailure;
        self.onSuccess = function(inSender, inResponse){
            var rs = sync.palmSuccess(inResponse);
            if(rs && rs.path){
                var fileinfo = rs;
                var md5Key = fileinfo.md5;
                //checkMd5
                self.onFailure = sync.webFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                    if(rs && rs.data.query && rs.data.query.curCap){
                        var filesize = fileinfo.size / 1024;
                        var curCap = parseInt(rs.data.query.curCap['#text']);
                        var maxCap = parseInt(rs.data.query.maxCap['#text']);
                        if((curCap + filesize) > maxCap){
                            ui.stop('您的相册容量已满');
                            return false;
                        }
                    }
                    
                    if(rs && rs.data && rs.data.query && rs.data.query.item && rs.data.query.item.url){
                        var url = rs.data.query.item.url;
                        fileinfo.url = url;
                        return callback(fileinfo);
                    }else{
                        self.onFailure = sync.palmFailure;
                        self.onSuccess = function(inSender, inResponse){
                            //enyo.log("upload: inResponse=" + enyo.json.stringify(inResponse));
                            var rs = sync.palmSuccess(inResponse);
                            if(rs){
                                var url = rs.data;
                                fileinfo.url = url;
                                return callback(fileinfo);
                            }else{
                                return callback('');
                            }
                        }
                        //上传file
                        self.$.file.setMethod('upload');
                        self.$.file.call({"url": "http://file.gozap.com/upload!mobileClient.action", "file": file, "name": "upload"});
                        //统计上传内容大小
                        _G.bw += fileinfo.size;
                    }
                }
            
                //检测MD5
                var method = 'sync.Photo.check';
                var postdata = '<item>';
                postdata += '<isCompress>0</isCompress>';
                postdata += '<md5Key>'+ md5Key +'</md5Key>';
                postdata += '</item>';

                var params = sync.getParams(method, postdata);
                self.$.web.call(params);
            }else{
                return callback('');
            }
        };
        self.$.file.setMethod('fileinfo');
        self.$.file.call({"file": file});
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
                    "select": ["_id", "_rev", "path"], 
                    "from": "com.palm.media.image.file:1", 
                    "limit": 500,
                    "page": next
                }
        };
        self.$.db.call(sql);
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
                    var _guid = _obj.guid ? _obj.guid['#text'] : 0;
                    var _luid = _obj.luid ? _obj.luid['#text'] : "";
                    var _createTime = _obj.createTime ? parseInt(_obj.createTime['#text']) : 0;
                    var _path = _obj.path ? _obj.path['#text'] : '';
                    
                    var _obj = {"action": _action, "luid": _luid, "lrev": 0, "guid": parseInt(_guid), "timestamp": _timestamp, "path": _path};
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
        var method = 'sync.Photo.sync';
        var postdata = '<item>';
        //postdata += '<sync>new</sync>';
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
                        "from": "com.palm.media.image.file:1",
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
        
        //图片没有修改，从主服务器端过来的只有删除的可能性
        if(row.action == 'add' || row.action == 'set'){
            return self.getS2Crow(S2C_lists, callback, data, __step__, __total__);
        }else if(row.action == 'del'){
            data.push(row);
            return self.getS2Crow(S2C_lists, callback, data, __step__, __total__);
        }
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
        ui.waitingOpen(L("photo_syncing") + progress);
        __step__ += 1;
        
        var row = C2S_rows.shift();
        if(row.action == 'add' || row.action == 'set'){
            //图片需上传, 成功后返回内容为Url
            self.upload(row.data.path, function(data){
                row.fileinfo = data; 
                if(!row.fileinfo){ //无法获得文件信息，进入下一步
                    //ui.halt("1---上传异常，请记录此信息: "+JSON.stringify(row.fileinfo));
                    return self.syncC2S(C2S_rows, callback, __step__, __total__);
                }
                if(typeof(row.fileinfo.url) != 'string'){
                    //ui.halt("2---上传异常，请记录此信息: "+JSON.stringify(row.fileinfo));
                    return self.syncC2S(C2S_rows, callback, __step__, __total__);
                }
                
                self.onFailure = sync.webFailure;
                self.onSuccess = function(inSender, inResponse, inRequest){
                    var rs = sync.webSuccess(inSender, inResponse, inRequest);
                    //enyo.log("rs=" + enyo.json.stringify(rs));
                    if(rs){
                        self.__RETRY__ = 0;
                        row.guid = row.action == 'add' ? parseInt(rs.data.query.item.guid['#text']) : row.guid; //获得guid并写入Map表
                        var actime = parseInt(rs.data.query.item['@attributes'].timestamp);
                        self.last_timestamp = Math.max(self.last_timestamp, actime);

                        self.onFailure = sync.dbFailure;
                        self.onSuccess = function(inSender, inResponse, inRequest){
                            var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                            //#######不需要回写到server端
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
                
                //图片上传，这里实际只有add，没有set
                var method = 'sync.Photo.add';
                var postdata = self.convert(row, 'C2S');

                var params = sync.getParams(method, postdata);
                self.$.web.call(params);
            });
        }else if(row.action == 'del'){
            //删除map表上的记录, 本地的删除，不会删除服务器上的
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
        }
    },
    //同步到本地，这里只有删除（恢复的再另行处理）
    syncS2C: function(S2C_rows, callback){
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
            return self.syncS2C(S2C_rows, callback, __step__, __total__);
        }else if(row.action == 'del'){ //网站删除会导致手机的删除
            self.onFailure = sync.palmFailure; //self.onFailure = sync.dbFailure;
            self.onSuccess = function(inSender, inResponse){ //self.onSuccess = function(inSender, inResponse, inRequest){
                var rs = sync.palmSuccess(inResponse); //var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                if(rs){
                    //删除map表上的记录
                    self.onFailure = sync.dbFailure;
                    self.onSuccess = function(inSender, inResponse, inRequest){
                        var rs = sync.dbSuccess(inSender, inResponse, inRequest);
                        if(rs){
                            //############不需要回写服务器端
                            return self.syncS2C(S2C_rows, callback, __step__, __total__);
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
            
            //删除Photo文件 可以inotify会自动删除db8中的记录
            self.$.file.setMethod('delete');
            self.$.file.call({"file": util.decode(row.path)}); //row.path 是在取得变更列表syncS2C中加入的, path有可能是中文所以decode一下
        }
    },

    convert: function(row, status){
        if(status == 'C2S'){
            var postdata = '';
                
            //内容
            var _name = row.fileinfo['name'];
            var _path = row.fileinfo['path'];
            var _size = row.fileinfo['size'];
            var _md5Key = row.fileinfo['md5'];
            var _url = row.fileinfo['url'];
            
            postdata += '<item>';
            postdata += '<luid>'+ row.luid +'</luid>';
            postdata += '<clistamp>'+ row.lrev +'</clistamp>';
            postdata += '<guid>'+ row.guid +'</guid>'; //guid=0实际上
            postdata += '<name>'+ util.encode(util.str2xml(_name)) +'</name>'; //{照片名称，带后缀：必须携带}
            postdata += '<title></title>'; //{照片名称}
            postdata += '<path>'+ util.encode(util.str2xml(_path)) +'</path>'; //{本地存储路径，必须携带}
            postdata += '<size>'+ _size +'</size>'; //{照片大小：字节数，必须携带}
            postdata += '<latitude></latitude>'; //{经度：double类型}
            postdata += '<longitude></longitude>'; //{纬度：double类型}
            //postdata += '<maker>0</maker>'; //{摄像头信息}
            //postdata += '<datetaken>0</datetaken>'; //{拍摄时间：10位时间戳}
            postdata += '<description>0</description>'; //{照片名称}
            postdata += '<url>'+ _url +'</url>'; //{照片的URL：/group1/M00/aaa.jpg， 必须携带}
            postdata += '<isCompress>0</isCompress>'; //{是否压缩同步：0:1}
            postdata += '<md5Key>'+ _md5Key +'</md5Key>'; //{33位的文件MD5值，全部大写，必须携带}
            postdata += '</item>';
                
            return postdata;
        }else if(status == 'S2C'){
            
            return obj;
        }
    }
});