enyo.kind({
    name: "Labi.Contact.Sync",
    kind: "Control",
    events: {
        onDone: "",
        onShowLogin: ""
    },
    published: {
        msg: ""
    },
    components: [
        {kind: "Control",layoutKind: "HFlexLayout", align: "center", pack: "center", onclick: "showTask", components: [
            {kind: "Image", src: IMAGE_DIR+"contacts_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "联系人 - 手动同步", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},

        {kind: "ModalDialog", name: "Dialog", caption: "联系人同步", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "立即同步联系人？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doTask"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelTask"}
            ]}
        ]}
    ],
    
    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //Contacts
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
                sync.contact('SCD');
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
        //self.log("results=" + enyo.json.stringify(data));
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('sync_failure'));
    }
});



enyo.kind({
    name: "Labi.Contact.Restore",
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
            {kind: "Image", src: IMAGE_DIR+"contacts_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "联系人恢复", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},
        
        {kind: "ModalDialog", name: "Dialog", caption: "联系人恢复", components: [
            {style: "margin-bottom:10px; font-size:16px;", content: "手机蜡笔将首先清空本地联系人记录，然后从网站下载记录到本机"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "doTask"},
                {kind: "Button", caption: "取消", onclick: "cancelTask"}
            ]}
        ]}        
    ],
    
    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //Contacts
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
                sync.contact('RES');
            }
        });

        ui.waitingOpen(L('initializing'));
    },
    onSuccess: function(self, data){
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('restore_done'));
        self.doDone(); //完成后调用rsync.js中的init
    },
    
    onFailure: function(self, data){
        //self.log("results=" + enyo.json.stringify(data));
        ui.waitingClose(); //关闭提示
        ui.showMsg(L('restore_failure'));
    }
});