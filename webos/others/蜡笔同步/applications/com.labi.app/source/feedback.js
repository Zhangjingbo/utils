enyo.kind({
    name: "Labi.Feedback", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "意见反馈", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, style: "margin: 10px;", components: [
            {flex: 1, kind: "RichText", name: "content", hint: "期待您的意见", value: "", style: "min-height:120px; -webkit-border-image: url(images/input-focus.png) 14 14;"},
            {layoutKind: "VFlexLayout", flex: 1, kind: "BasicInput", name: "email", hint: "取系邮箱（选填）", style: "width:100%; padding:5px; border:1px solid #999; border-radius:5px;"},
            {kind: "Button", caption: "发送", onclick: "send"}
        ]},

        {kind: "WebService", name: "web", onSuccess: "onSuccess", onFailure: "onFailure", method: "POST", url: "http://www.labi.com/mobileFeedback!addUserMainFeedback.action"}        
    ],
    
    send: function(inSender){
        var content= this.$.content.getHtml();
        var email = this.$.email.getValue();
        if(content == ''){
            ui.showMsg('请填写内容');
            return false;
        }
        
        var destJid = _G.username + "@gozap.com/mobile_" + _G.imei;
        var obj = {"umb.type": "Labi WebOS feedback", "umb.destJid": destJid, "umb.content": content, "umb.mail": email};
        //enyo.log(util.toQueryString(obj));
        this.$.web.call(obj);
    },
    
    onSuccess: function(inSender, inResponse, inRequest){
        var self = this;
        if(inResponse == '9999'){
            ui.showMsg('感谢您提供的宝贵意见');
            this.$.content.setValue('');
            this.$.email.setValue('');
            setTimeout(function(){
                self.doShowView('Labi.Main');
            }, 2000);
        }else{
            ui.showMsg('提交出错，请稍后重试');
        }
    },
    
    onFailure: function(inSender, inResponse, inRequest){
        ui.showMsg('提交出错，请稍后重试');
    }
});