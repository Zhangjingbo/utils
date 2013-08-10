enyo.kind({
    name: "Ui",
    kind: enyo.Component,
    components: [
        //UI
        {kind: "ModalDialog", name: "Dialog", caption: "提示信息", lazy: false, components: [
            {name: "DialogText", style: "margin-bottom:10px; font-size:14px; text-align:center;"}
        ]},

        {kind: "ModalDialog", name: "waiting", layoutKind: "HFlexLayout", lazy: false, onClose: "closeHandler", align: "center", pack: "center", components: [
            {kind: "Control", layoutKind: "HFlexLayout", align: "center", pack: "center", style: "margin-bottom:10px;", components: [
                {kind: "Spinner", name: "waitingSpinner", showing: true, style: "margin-top:5px;"},
                {name: "waitingText", style: "color:#999999;"}
            ]}
        ]}
    ],
    
    closeHandler: function(inSender, e){
        WAITING && this.waitingOpen();
        //enyo.log("BACK");
        //e.stopPropagation();
        //e.preventDefault();
        return -1;
    },
    
    stop: function(msg){
        SIGN = '';
        this.waitingClose();
        this.showMsg(msg);
    },
    
    waitingOpen: function(msg){
        WAITING = true;
        msg && this.$.waitingText.setContent(msg);
        this.$.waiting.openAtCenter();
    },
    waitingClose: function(){
        WAITING = false;
        this.$.waiting.close();
    },
    
    showMsg: function(msg){
        this.waitingClose();
        this.$.DialogText.setContent(msg); //must be set property lazy: false in the Dialog kind
        this.$.Dialog.openAtCenter()
        var that = this;
        var time = DEBUG ? 10000 : 2000;
        window.setTimeout(function(){that.$.Dialog.close()}, time);
    },
    
    halt: function(msg){
        this.waitingClose();
        this.$.DialogText.setContent(msg); //must be set property lazy: false in the Dialog kind
        this.$.Dialog.openAtCenter()
        var that = this;
        var time = DEBUG ? 10000 : 3000;
        window.setTimeout(function(){that.$.Dialog.close()}, time);
        
        throw new Error(msg); //终止整个程序执行
    }
});