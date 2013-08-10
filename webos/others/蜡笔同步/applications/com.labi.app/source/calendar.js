enyo.kind({
    name: "Labi.Calendar.Sync",
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
            {kind: "Image", src: IMAGE_DIR+"calendar_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "日历 - 手动同步", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},

        {kind: "ModalDialog", name: "Dialog", caption: "日历同步", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "立即同步日历？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doTask"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelTask"}
            ]}
        ]}
    ],

    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //calendar
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
                sync.calendar('SCD');
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
    name: "Labi.Calendar.Restore",
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
            {kind: "Image", src: IMAGE_DIR+"calendar_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "日历恢复", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},
        
        {kind: "ModalDialog", name: "Dialog", caption: "日历恢复", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "手机蜡笔将首先清空本地日历记录，然后从网站下载记录到本机"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "showRange"},
                {kind: "Button", caption: "取消", onclick: "cancelTask"}
            ]}
        ]},
        
        {kind: "ModalDialog", name: "DialogRange", caption: "恢复范围", components: [
            {kind: "VirtualList", onSetupRow: "setupRow", style: "border-top:1px solid #999; height:240px;", components: [
                {kind: "Item", layoutKind: "HFlexLayout", tapHighlight: true, onclick: "itemClick", components: [
                    {name: "caption", flex: 1},
                    {name: "checkmark", kind: "Image", src: "images/checkmark.png", showing: false}
                ]}
            ]},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "doTask"},
                {kind: "Button", caption: "取消", onclick: "cancelRange"}
            ]}
        ]}
    ],
    
    create: function(){
        this.inherited(arguments);
        this.range = ['过去两周以来', '过去一个月以来', '过去三个月以来', '过去六个月以来', '所有'];
        this.rangeValue = [86400*14,   86400*30,         86400*90,         86400*180,        0];
        this.selectedRow = 0;
    },
    
    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    setupRow: function(inSender, inIndex){
        var rs = this.range[inIndex];
        if (rs){
            this.$.caption.setContent(rs);
            if(inIndex == this.selectedRow){
                this.$.checkmark.show();
            }else{
                this.$.checkmark.hide();
            }
            return true;
        }
    },
    itemClick: function(inSender, e){
        this.selectedRow = e.rowIndex;
        this.$.virtualList.refresh();
    },
    
    //calendar
    showTask: function(inSender){
        this.$.Dialog.openAtCenter();
    },
    cancelTask: function(inSender){
        this.$.Dialog.close();
    },
    
    //Range
    showRange: function(inSender){
        this.selectedRow = 0;
        this.$.Dialog.close();
        this.$.DialogRange.openAtCenter();
    },
    cancelRange: function(inSender){
        this.$.DialogRange.close();
    },
    
    doTask: function(inSender){
        var self = this;
        self.cancelRange();
        var rangTime = self.rangeValue[self.selectedRow];
        if(rangTime == 0){
            var args = {"sDatetime": 0}
        }else{
            var sDatetime = util.date(util.time() - rangTime, _G.timezone / 60);
            var args = {"sDatetime": sDatetime.replace(/-|\s|:/g, '')}
        }
        sync.setCallback({onSuccess: self.onSuccess, onFailure: self.onFailure, "self": self});
        
        user.checkStatus(function(istatus){
            if(istatus == 13){
                user.logout();
                ui.showMsg(L('bind_release'));
                setTimeout(function(){
                    self.doShowLogin();
                }, 2000);
            }else{
                sync.calendar('RES', args);
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