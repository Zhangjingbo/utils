enyo.kind({
    name: "Labi.Upgrade",
    kind: enyo.Control,
    components: [
        //UI
        {kind: "ModalDialog", name: "noneBox", caption: "暂无版本更新", lazy: false, components: [
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "关闭", onclick: "closeNone"}
            ]}
        ]},

        {kind: "ModalDialog", flext: 1, name: "upgradeBox", caption: "当前有可用更新", lazy: false, components: [
            {kind: "Scroller", flex: 1, style: "height:120px;", components: [
                {kind: "HtmlContent", flext: 1, name: "upgradeInfo", style: "margin-bottom:10px; font-size:14px; text-align:left;", content: ""},
            ]},
            {layoutKind: "HFlexLayout", flext: 1, pack: "center", align: "center", components: [
                {kind: "Button", caption: "下载更新", onclick: "doUpgrade"},
                {kind: "Button", caption: "取消更新", onclick: "closeUpgrade"}
            ]}
        ]},
        
        {kind: "ModalDialog", name: "downloadBox", lazy: false, components: [
            {layoutKind: "VFlexLayout", pack: "center", align: "center", components: [
                {name: "ProgressText", style: "margin-bottom:10px; font-size:14px; text-align:center;", content: "正在下载更新包"},
                {kind: "ProgressBar", name: "ProgressBar", style: "width: 200px", position: 0}
            ]}
        ]},
        
        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: gozapHost+"/service/ngsync"},
        {kind: "PalmService", name: "download", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.downloadmanager/", method: "download", subscribe: true},
        {kind: "PalmService", name: "labi", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.labi.service/"},
        {kind: "PalmService", name: "alarm", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.power/timeout/", method: "set"}
    ],
    
    create: function(){
        this.inherited(arguments);
        this.describe  = ''; //更新消息
        this.url = ''; //下载更新地址
    },
    
    check: function(){
        if(!_G.is_online){
            ui.showMsg('当前没有网络连接');
        }

        var self = this;
        
        self.onFailure = sync.webFailure;
        self.onSuccess = function(inSender, inResponse, inRequest){
            var rs = sync.webSuccess(inSender, inResponse, inRequest);
            //enyo.log(JSON.stringify(rs));
            if(rs && rs.data && rs.data.query && rs.data.query.item){ //有版本，需对比version
                var versionId = rs.data.query.item.versionId ? rs.data.query.item.versionId['#text'] : '0';
                var version = rs.data.query.item.version ? rs.data.query.item.version['#text'] : '0.0.0';
                var buildno = rs.data.query.item.buildno ? rs.data.query.item.buildno['#text'] : '0';
                var ssize = rs.data.query.item.ssize ? rs.data.query.item.ssize['#text'] : '0';
                var describe = rs.data.query.item.describe ? rs.data.query.item.describe['#text'] : '';
                var url = rs.data.query.item.url ? rs.data.query.item.url['#text'] : '';
                var wurl = rs.data.query.item.wurl ? rs.data.query.item.wurl['#text'] : '';

                var is_upgrade = version != VERSION ? true : false;
                
                self.describe = describe;
                self.url = url;
            }else{
                var is_upgrade = false;
            }
            // 供测试
            /*
            is_upgrade = true;
            self.describe = "修复了一些功能";
            self.url = 'http://192.168.2.100/labi/com.labi_1.0.0_all.ipk';
            */
            sys.saveBw(function(){
                if(is_upgrade){
                    return self.showUpgrade();
                }else{
                    return self.showNone();
                }
            });
        };
        
        var method = 'sys.versionCtl.get';
        var postdata = '<item>';
        postdata += '<name>Labi</name>';
        postdata += '<type>webos</type>';
        postdata += '<page>1</page>';
        postdata += '<pages>1</pages>';
        postdata += '<version order="1"></version>';
        postdata += '</item>';
        var params = sync.getParams(method, postdata);
        self.$.web.call(params);
		ui.waitingOpen('正在检测更新');
    },
    
    showNone: function(msg){
        ui.waitingClose(); //关闭等待如果存在的话
        this.$.noneBox.openAtCenter()
    },
    closeNone: function(){
        this.$.noneBox.close()
    },
    
    showUpgrade: function(){
        ui.waitingClose(); //关闭等待如果存在的话
        this.$.upgradeInfo.setContent(this.describe);
        this.$.upgradeBox.openAtCenter();
    },
    closeUpgrade: function(){
        this.$.upgradeBox.close()
    },
    
    //调用系统下载
    doUpgrade: function(){
        var self = this;
        self.$.upgradeBox.close()
        
        self.onFailure = sync.palmFailure;
        self.onSuccess = function(inSender, inResponse){
            //enyo.error(JSON.stringify(inResponse));
            var amountReceived = inResponse.amountReceived ? inResponse.amountReceived : 0;
            var amountTotal = inResponse.amountTotal ? inResponse.amountTotal : 0;
            
            if(amountTotal > 0){
                var progress = '正在下载更新包：'+ parseInt(amountReceived/1024) +'/'+ parseInt(amountTotal/1024) +'kb';
                var position = amountReceived / amountTotal * 100;
                self.$.ProgressText.setContent(progress);
                self.$.ProgressBar.setPosition(position);
            }
            if(inResponse.completed){ //download completed
                var file = inResponse.target;
                //enyo.log('file:'+file);
                if(file){
                    setTimeout(function(){
                        self.$.downloadBox.close();
                        self.serviceUpgrade(file);
                    }, 1000);
                }
            }
        };
        var url = self.url;
        var args = {"target": url};
        self.$.download.call(args);
        //enyo.windows.addBannerMessage("正在下载升级包", '{}', null, "notification");
        self.$.downloadBox.openAtCenter();
    },
    
    serviceUpgrade: function(file){
        var self = this;
        self.$.labi.onFailure = 'palmFailure';
        self.$.labi.onSuccess = 'upgradeSuccess';
        self.$.labi.setMethod('upgrade');
        self.$.labi.call({"file": file});
        self.upgradeSuccess = function(inSender, inResponse){
            //enyo.log(JSON.stringify(inResponse));
            if(inResponse && inResponse.status == 'ok'){
                ui.showMsg('请重新启动蜡笔软件'); //参看升级说明，你可能需要重启手机
                //self.setAlarm();
            }else{
                //升级升败
                ui.halt('升级升败');
            }
        };
    },
    
    setAlarm: function(){
        var self = this;
        self.$.alarm.onFailure = 'palmFailure';
        self.$.alarm.onSuccess = 'alarmSuccess';
        self.$.alarm.setMethod('set');
        var params = {
            "in": "00:00:3",
            "key": "com.labi.upgrade.timer", 
            "uri": "palm://com.palm.applicationManager/launch", 
            "params": {"id": APPID, "params":{"action":"upgrade"}}
        };
        self.$.alarm.call(params);
        self.alarmSuccess = function(inSender, inResponse){
            enyo.log("alarmSuccess: " + JSON.stringify(inResponse));
            //window.close();
        };
    },
    
    palmFailure: function(inSender, inError){
        enyo.log("inError=" + enyo.json.stringify(inError));
        return false;
    }
});