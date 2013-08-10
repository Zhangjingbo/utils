enyo.kind({
    name: "Labi.Register", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    style: "background: url(images/global-bg.png) center center no-repeat",
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", align: "center", pack: "center", components: [
            {kind: "Image", src: "images/labi_logo_162_32.png", style: "margin-top:20px; height:32px; text-align:center; font-size:0;"},
        ]},
        {style:"padding:5px 25px; color:#77a9f7; margin-top:10px;", components: [
            {kind: "Input", name: "username", autoCapitalize: "lowercase", hint: "用户名 5-20位", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"},
            {content: "@gozap.com", style: "text-align:right; height:34px;"},
            {kind: "Input", name: "email", hint: "保密邮箱", autoCapitalize: "lowercase", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"},
            {kind: "PasswordInput", name: "password", hint: "密码 6-16位", style: "margin-top:5px; -webkit-border-image: url(images/input-focus.png) 14 14;"},
            {kind: "Control", content: "注册", style: "margin-top:20px;", onclick: "doRegister", onmousedown: "btnDown", onmouseup: "btnUp", onmouseout: "btnUp", className:"btn"},
            {layoutKind: "HFlexLayout", align: "center", pack: "center", style:"margin-top:10px;", components:[
                {kind: "CheckBox", name: "agree", checked: true},
                {kind: "HtmlContent", style: "text-align:left; font-size:14px; margin-left:5px;", onLinkClick: "linkClick", 
                    content: '我已仔细阅读并接受<a href="/Labi.Tos">服务条款</a>和<a href="/Labi.Privacy">隐私政策</a>'
                }
            ]}
        ]}
    ],

    init: function(){
        if(user.checkLogin()){
            ui.showMsg('您已登录');
            this.doShowView('Labi.Main');
        }
    },

    linkClick: function(inSender, inUrl){
        inUrl = inUrl.split('/');
        inUrl = inUrl[inUrl.length-1];
        if(inUrl == 'Labi.Tos'){
            this.doShowView('Labi.Tos');
        }else if(inUrl == 'Labi.Privacy'){
            this.doShowView('Labi.Privacy');
        }
    },
    
    doRegister: function(inSender){
        var is_agree = this.$.agree.getChecked();
        var username = this.$.username.getValue();
        var email = this.$.email.getValue();
        var password = this.$.password.getValue();

        user.setCallback({onSuccess: this.onSuccess, onFailure: this.onFailure, "self": this});
        user.register(is_agree, username, email, password);
    },
    onSuccess: function(self, result){//这里的result实际是登录返回的result，因为在注册后即进行登录
        self.doShowView('Labi.Main');
    },
    onFailure: function(self, status){
        return false;
    },
    
    btnDown: function(inSender, e){
        inSender.addClass('btn-hot');
    },
    btnUp: function(inSender, e){
        inSender.removeClass('btn-hot');
    }
});