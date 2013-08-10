enyo.kind({
    name: "Labi.Crc.Sync",
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
            {kind: "Image", src: IMAGE_DIR+"call_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "通话记录 - 手动同步", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},

        {kind: "ModalDialog", name: "Dialog", caption: "通话记录同步", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "立即同步通话记录？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doTask"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelTask"}
            ]}
        ]}
    ],

    msgChanged: function(){
        this.$.msg.setContent(this.msg);
    },
    
    //crc
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
                sync.crc('SCD');
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
    name: "Labi.Crc.Restore",
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
            {kind: "Image", src: IMAGE_DIR+"call_online.png"},
            {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                {content: "通话记录恢复", className: "box-title"},
                {name: "msg", content: "", className: "box-info"}
            ]},
            {kind: "Image", src: "images/arrow-right.png"}
        ]},
        
        {kind: "ModalDialog", name: "Dialog", caption: "通话记录恢复", lazy: false, components: [
            {kind: "RadioGroup", flex: 1, name: "selectType", onclick: "selectType", components:[
                {name: "pnumRadio", kind: "RadioButton", caption: "按号码恢复", value: "pnum", depressed: true},
                {name: "typeRadio", kind: "RadioButton", caption: "按通话类型恢复", value: "type"}
            ]},
            {name: "pnumLayer", style: "height:50px;", layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                {flex: 1, kind: "Input", name: "pnum", hint: "输入要恢复通话记录的电话号码", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"}
            ]},
            {name: "typeLayer", style: "height:50px; font-size:12px;", showing: false, layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                {layoutKind: "HFlexLayout", align: "center", pack: "center", components:[
                    {kind: "CheckBox", name: "missed", checked: true},
                    {style: "margin-left:5px;", content: "未接电话"}
                ]},
                {layoutKind: "HFlexLayout", style: "margin-left:5px;", align: "center", pack: "center", components:[
                    {kind: "CheckBox", name: "incoming", checked: true},
                    {style: "margin-left:5px;", content: "已接电话"}
                ]},
                {layoutKind: "HFlexLayout", style: "margin-left:5px;", align: "center", pack: "center", components:[
                    {kind: "CheckBox", name: "outgoing", checked: true},
                    {style: "margin-left:5px;", content: "已拔电话"}
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
    
    //crc
    showTask: function(inSender){
        var self = this;
        self.res_type = 'pnum';
        self.$.pnumRadio.setDepressed(true);
        self.$.pnumLayer.show();
        self.$.typeRadio.setDepressed(false);
        self.$.typeLayer.hide();
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
        }else if(self.res_type == 'type'){
            var missed = self.$.missed.getChecked();
            var incoming = self.$.incoming.getChecked();
            var outgoing = self.$.outgoing.getChecked();
            missed = missed ? 'missed' : '';
            incoming = incoming ? 'incoming' : '';
            outgoing = outgoing ? 'outgoing' : '';
            if(missed == '' && incoming == '' && outgoing == ''){
                ui.showMsg('请选择通话记录类型');
                return false;
            }
            var args = {"res_type": "type", "missed": missed, "incoming": incoming, "outgoing": outgoing};
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
                sync.crc('RES', args);
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
    },
    
    selectType: function(inSender, e){
        var value = inSender.getValue();
        if(value == 'pnum'){
            this.res_type = 'pnum';
            this.$.typeRadio.setDepressed(false);
            this.$.typeLayer.hide();
            this.$.pnumLayer.show();
        }else if(value == 'type'){
            this.res_type = 'type';
            this.$.pnumRadio.setDepressed(false);
            this.$.pnumLayer.hide();
            this.$.typeLayer.show();
        }
    }
});