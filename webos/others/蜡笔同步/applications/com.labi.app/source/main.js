enyo.kind({
    name: "Labi.Main",
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1, 
    events:{
        onShowView: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "蜡笔同步", flex: 1, style: "margin-left:5px;"}
        ]},
        {name: "mainbox", kind: "Scroller", flex: 1, components: [
            {kind: "Control", className:"item-first"},
            {name: "login", kind: "Control", layoutKind: "HFlexLayout", showing: false, className: "item", align: "center", pack: "center", onclick: "showView", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout", viewName: "Labi.Login", components: [
                {kind: "Image", name:"online1", src: IMAGE_DIR+"3G.png"},
                {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                    {content: "未登录", className: "box-title"},
                    {content: "点此登录或注册", className: "box-info"}
                ]},
                {kind: "Image", src: "images/arrow-right.png"}
            ]},
            {name: "logined", kind: "Control", layoutKind: "HFlexLayout", showing: false, className: "item", align: "center", pack: "center", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout", components: [
                {kind: "Image", name:"online2", src: IMAGE_DIR+"3G.png"},
                {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                    {name: "username", content: "已登录", className: "box-title"},
                    {name: "info", content: "", className: "box-info"}
                ]},
                {name: "arrow", kind: "Image", src: "images/arrow-right.png"}
            ]},
            {kind: "Control", layoutKind: "HFlexLayout", className: "item", align: "center", pack: "center", onclick: "showView", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout", viewName: "Labi.Sync", components: [
                {kind: "Image", src: IMAGE_DIR+"synchronous.png"},
                {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                    {content: "数据同步", className: "box-title"},
                    {content: "让手机与网站的数据保持同步", className: "box-info"}
                ]},
                {kind: "Image", src: "images/arrow-right.png"}
            ]},
            {kind: "Control", layoutKind: "HFlexLayout", className: "item", align: "center", pack: "center", onclick: "showView", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout", viewName: "Labi.Restore", components: [
                {kind: "Image", src: IMAGE_DIR+"recovery.png"},//, style: IMAGE_STYLE
                {layoutKind: "VFlexLayout", flex: 1, className: "box", components: [
                    {content: "数据恢复", className: "box-title"},
                    {content: "把网站上的数据恢复到手机上", className: "box-info"}
                ]},
                {kind: "Image", src: "images/arrow-right.png"}
            ]},
            {kind: "Control", className:"item-last"}
        ]},
        
        {kind: "AppMenu", onBeforeOpen: "menuOpen",
            components: [
                {caption: "我的蜡笔", onclick: "my"},
                //{caption: "系统设置", onclick: "setting"},
                //{caption: "帮助", onclick: "help"},
                {caption: "软件更新", onclick: "upgrade"},
                {caption: "分享蜡笔", onclick: "share"},
                {caption: "意见反馈", onclick: "feedback"}
            ]
        },
        
        {kind: "ModalDialog", name: "checkActivateBox", caption: "重新获取激活状态", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "系统将再次向服务器请求重新获取激活状态"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "checkActivate"},
                {kind: "Button", caption: "取消", onclick: "cancelActivate"}
            ]}
        ]},
        
        {kind: "ModalDialog", name: "logoutBox", caption: "退出登录", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "是否退出登录状态？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: "确定", onclick: "__logout"},
                {kind: "Button", caption: "取消", onclick: "cancelLogout"}
            ]}
        ]}
    ],
    
    mousedown: function(inSender, e){
        inSender.addClass('highlight');
    },
    mouseup: function(inSender, e){
        inSender.removeClass('highlight');
    },
    mouseout: function(inSender, e){
        inSender.removeClass('highlight');
    },

    //每次select时均会执行
    init: function(msg){
        var self = this;

        var icon = 'online.png';
        if(_G.net == 'offline'){
            icon = 'offline.png';
        }else if(_G.net == 'wifi'){
            icon = 'WIFI.png';
        }else if(_G.net == 'umts' || _G.net == 'hsdpa' || _G.net == 'evdo'){
            icon = '3G.png';
        }
        self.$.online1.src = IMAGE_DIR+icon;
        self.$.online2.src = IMAGE_DIR+icon;
        self.$.online1.setSrc(IMAGE_DIR+icon);
        self.$.online2.setSrc(IMAGE_DIR+icon);
        if(user.checkLogin()){
            self.$.login.hide();
            var activate = '(未能获取状态)';
            if(_G.is_activate == 3){
                self.$.logined.onclick = null;
                activate = '(正在激活)';
            }else if(_G.is_activate == 2){
                //self.$.arrow.hide();
                self.$.logined.onclick = null;
                activate = '';
            }else if(_G.is_activate == 1){
                self.$.arrow.show();
                self.$.logined.onclick = 'activate';
                activate = '(未激活)';
            }else if(_G.is_activate == 0){
                self.$.arrow.show();
                self.$.logined.onclick = 'showCheckActivate';
                activate = '(未能获取状态)';
            }
            self.$.username.setContent(_G.username + activate);
            self.$.logined.show();
            self.$.info.setContent('接入点：' + _G.net);
            sys.getBw(function(bw){
                self.$.info.setContent('接入点：' + _G.net + '，本月流量：' + bw); //（不含WIFI）
            });
        }else{
            self.$.logined.hide();
            self.$.login.show();
        }
    },
    
    create: function(){
        var self = this;
        self.inherited(arguments);
        self.init();
    },

    showView: function(inSender, e){
        if(!user.checkLogin() && inSender.viewName != 'Labi.Login'){
            this.doShowView('Labi.Login');
            return false;
        }
        var viewName = inSender.viewName;
        this.doShowView(viewName);
    },
    
    //Appmenu
    menuOpen: function(){
        var m = this.$.appMenu;
        if(user.checkLogin()){
            !this.$.logout && m.createComponent({caption: "退出登录", onclick: "logout", name: "logout", owner: this});
        }else{
            this.$.logout && this.$.logout.destroy();
        }
        m.render();
    },

    upgrade: function(inSender){
        if(user.checkLogin()){
            var upgrade = new Labi.Upgrade();
            upgrade.check();
        }else{
            var self = this;
            ui.showMsg('请先登录或注册');
            setTimeout(function(){
                self.doShowView('Labi.Login');
            }, 2000);
        }
    },

    my: function(inSender){
        sys.browse('http://m.labi.com/');
    },

    help: function(inSender){
        this.doShowView('Labi.Help');
    },
    
    activate: function(inSender){
        if(!user.checkLogin()){
            ui.showMsg('请先登录');
            return false;
        }
        
        self.activate_obj = typeof(self.activate_obj) == 'object' ? self.activate_obj : new Labi.Activate();
        self.activate_obj.callback = enyo.bind(this, "init");
        self.activate_obj.checking = enyo.bind(this, "checking");
        self.activate_obj.showActivate(enyo.bind(this, "showLogin"));
    },
    
    checking: function(){
        _G.is_activate = 3;
        this.init();
    },
    
    showCheckActivate: function(){
        this.$.checkActivateBox.openAtCenter();
    },
    
    checkActivate: function(){
        this.$.checkActivateBox.close();
        var self = this;
        user.checkActivate(function(){
            self.init();
        });
    },
    
    cancelActivate: function(){
        this.$.checkActivateBox.close();
    },
    
    exitApp: function(){
        window.close();
    },
    
    share: function(inSender){
        this.doShowView('Labi.Share');
    },
    
    feedback: function(inSender){
        this.doShowView('Labi.Feedback');
        /*
        if(!user.checkLogin()){
            var self = this;
            ui.showMsg('请先登录或注册');
            setTimeout(function(){
                self.doShowView('Labi.Login');
            }, 2000);
        }else{
            this.doShowView('Labi.Feedback');
        }
        */
    },
    
    setting: function(inSender){
        if(!user.checkLogin()){
            var self = this;
            ui.showMsg('请先登录或注册');
            setTimeout(function(){
                self.doShowView('Labi.Login');
            }, 2000);
        }else{
            this.doShowView('Labi.Setting');
        }
    },
    
    logout: function(inSender){
        this.$.logoutBox.openAtCenter();
    },
    cancelLogout: function(inSender){
        this.$.logoutBox.close();
    },
    __logout: function(inSender){
        this.$.logoutBox.close();
        user.logout();
        this.doShowView('Labi.Main');
    },
    
    showLogin: function(){
        this.doShowView('Labi.Login');
    }
});