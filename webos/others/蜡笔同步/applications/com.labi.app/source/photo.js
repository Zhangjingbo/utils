enyo.kind({
    name: "Labi.Photo.Sync",
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
            {kind: "Image", src: IMAGE_DIR+"images_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "照片 - 手动同步", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},

        {kind: "ModalDialog", name: "Dialog", caption: "照片同步", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "立即同步照片？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doTask"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelTask"}
            ]}
        ]}
    ],

    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //photo
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
                sync.photo('SCD');
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