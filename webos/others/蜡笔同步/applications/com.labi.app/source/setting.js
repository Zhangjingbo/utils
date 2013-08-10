enyo.kind({
    name: "Labi.Setting", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    components: [
        {kind: "PageHeader", style: "height:24px; font-size:14px;", components: [
            {kind: "Image", src: "images/labi_logo_72.png", style: "height:20px;"},
            {content: "系统设置", flex: 1, style: "margin-left:5px;"}
        ]},
        
        //{kind: "Group", caption: "用户设置", components: []},
        
        {kind: "Button", caption: "退出登录", onclick: "logout", style: "margin-top:10px; padding:5px;"}
    ],
    
    logout: function(inSender){
        user.logout();
        this.doShowView('Labi.Main');
    }
});