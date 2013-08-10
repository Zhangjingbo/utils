enyo.kind({
    name: "Labi.Sms.Sync",
    kind: "Control", 
    events: {
        onDone: "",
        onShowLogin: ""
    },
    published:{
        msg: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", align: "center", pack: "center", onclick: "showTask", components: [
            {kind: "Image", src: IMAGE_DIR+"sms_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "短信 - 手动同步", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},

        {kind: "ModalDialog", name: "Dialog", caption: "短信同步", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "立即同步短信？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doTask"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelTask"}
            ]}
        ]}
    ],

    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //SMS
    showTask: function(inSender){
        this.$.Dialog.openAtCenter();
    },
    cancelTask: function(inSender){
        this.$.Dialog.close();
    },
    doTask: function(inSender){
        var self = this;
        self.$.Dialog.close();

        sync.setCallback({onSuccess: self.onSuccess, onFailure: self.onFailure, "self": self});
        
        user.checkStatus(function(istatus){
            if(istatus == 13){
                user.logout();
                ui.showMsg(L('bind_release'));
                setTimeout(function(){
                    self.doShowLogin();
                }, 2000);
            }else{
                sync.sms('SCD');
            }
        });
        
        ui.waitingOpen(L('initializing'));
    },
    onSuccess: function(self, data){
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('sync_done'));
        self.doDone(); //完成后调用rsync.js中的init
    },
    
    onFailure: function(self, data){
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('sync_failure'));
    }
});


enyo.kind({
    name: "Labi.Sms.Restore",
    kind: "Control", 
    events: {
        onDone: "",
        onShowLogin: ""
    },
    published:{
        msg: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", align: "center", pack: "center", onclick: "showTask", components: [
            {kind: "Image", src: IMAGE_DIR+"sms_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "短信恢复", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},
        
        {kind: "ModalDialog", name: "Dialog", caption: "短信恢复", lazy: false, components: [
            {kind: "RadioGroup", flex: 1, name: "selectType", onclick: "selectType", components:[
                {name: "pnumRadio", kind: "RadioButton", caption: "按号码恢复", value: "pnum", depressed: true},
                {name: "floderRadio", kind: "RadioButton", caption: "按文件夹恢复", value: "folder"}
            ]},
            {name: "pnumLayer", style: "height:50px;", layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                {flex: 1, kind: "Input", name: "pnum", hint: "输入要恢复短信的电话号码", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"}
            ]},
            {name: "folderLayer", style: "height:50px; font-size:12px;", showing: false, layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                {layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                    {kind: "CheckBox", name: "inbox", checked: true},
                    {style: "margin-left:5px;", content: "收件箱"}
                ]},
                {layoutKind: "HFlexLayout", style: "margin-left:15px;", align: "center", pack: "center", components:[
                    {kind: "CheckBox", name: "outbox", checked: true},
                    {style: "margin-left:5px;", content: "发件箱"}
                ]}
            ]},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "doTask"},
                {kind: "Button", caption: "取消", onclick: "cancelTask"}
            ]}
        ]}
    ],
    
    create: function(){
        this.inherited(arguments);
    },
    
    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //SMS
    showTask: function(inSender){
        var self = this;
        self.res_type = 'pnum';
        self.$.pnumRadio.setDepressed(true);
        self.$.pnumLayer.show();
        self.$.floderRadio.setDepressed(false);
        self.$.folderLayer.hide();
        self.$.Dialog.openAtCenter();
    },
    cancelTask: function(inSender){
        this.$.Dialog.close();
    },
    doTask: function(inSender){
        var self = this;
        self.$.Dialog.close();
        
        sync.setCallback({onSuccess: self.onSuccess, onFailure: self.onFailure, "self": self});
        if(self.res_type == 'pnum'){
            var pnum = self.$.pnum.getValue();
            if(pnum == ''){
                ui.showMsg('请输入号码');
                return false;
            }
            var args = {"res_type": "pnum", "pnum": pnum};
        }else if(self.res_type == 'folder'){
            var inbox = self.$.inbox.getChecked();
            var outbox = self.$.outbox.getChecked();
            inbox = inbox ? 'inbox' : '';
            outbox = outbox ? 'outbox' : '';
            if(inbox == '' && outbox == ''){
                ui.showMsg('请选择文件夹');
                return false;
            }
            var args = {"res_type": "folder", "inbox": inbox, "outbox": outbox};
        }else{
            ui.showMsg('请选择恢复方式');
            return false;
        }

        user.checkStatus(function(istatus){
            if(istatus == 13){
                user.logout();
                ui.showMsg(L('bind_release'));
                setTimeout(function(){
                    self.doShowLogin();
                }, 2000);
            }else{
                sync.sms('RES', args);
            }
        });
        ui.waitingOpen(L('initializing'));
    },
    onSuccess: function(self, data){
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('restore_done'));
        self.doDone(); //完成后调用rsync.js中的init
        //self.log("results=" + enyo.json.stringify(data));
    },
    
    onFailure: function(self, data){
        //self.log("results=" + enyo.json.stringify(data));
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('restore_failure'));
    },
    
    selectType: function(inSender, e){
        var value = inSender.getValue();
        if(value == 'pnum'){
            this.res_type = 'pnum';
            this.$.floderRadio.setDepressed(false);
            this.$.folderLayer.hide();
            this.$.pnumLayer.show();
        }else if(value == 'folder'){
            this.res_type = 'folder';
            this.$.pnumRadio.setDepressed(false);
            this.$.pnumLayer.hide();
            this.$.folderLayer.show();
        }
    }
});