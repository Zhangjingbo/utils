enyo.kind({
    name: "Labi.Login", 
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
            {kind: "Input", name: "username", autoCapitalize: "lowercase", hint: "用户名", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"},
            {content: "@gozap.com", style: "text-align:right; height:34px;"},
            {kind: "PasswordInput", name: "password", hint: "密码", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"},
            {kind: "Control", content: "登录", align: "center", pack: "center", style: "margin-top:20px;", onclick: "doLogin", onmousedown: "btnDown", onmouseup: "btnUp", onmouseout: "btnUp", className:"btn"},
            {kind: "HtmlContent", style: "margin-top:15px; text-align:right; font-size:14px;", onLinkClick: "linkClick", 
                content: '没有帐号？<a href="/Labi.Register">立即注册</a>'
            }
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
        if(inUrl == 'Labi.Register'){
            this.doShowView('Labi.Register');
        }
    },
    //login Action
    doLogin: function(inSender){
        var username = this.$.username.getValue();
        var password = this.$.password.getValue();

        user.setCallback({onSuccess: this.onSuccess, onFailure: this.onFailure, "self": this});
        user.login(username, password);
        this.$.username.setValue('');
        this.$.password.setValue('');
    },
    onSuccess: function(self, result){//self为自身对象
        //now the result is json object of the remote output.
        //alert(JSON.stringify(result));
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