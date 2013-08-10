enyo.kind({
    name: "Labi.Activate",
    kind: enyo.Control,
    components: [
        //UI
        {kind: "ModalDialog", name: "activateBox", caption: "短信激活", components: [
            {style: "margin-bottom:10px; font-size:14px;", content: "即将发送一条普通短信来绑定手机号码，用于日后找回密码，蜡笔同步不收取任何费用。是否激活？"},
            {layoutKind: "HFlexLayout", pack: "center", align: "center", components: [
                {kind: "Button", caption: L("confirm"), onclick: "doActivate"},
                {kind: "Button", caption: L("cancel"), onclick: "cancelActivate"}
            ]}
        ]}
    ],
    
    showActivate: function(showLogin){
        this.showLogin = showLogin;
        this.$.activateBox.openAtCenter();
    },
    cancelActivate: function(inSender){
        this.$.activateBox.close();
    },
    doActivate: function(inSender){
        var self = this;
        self.$.activateBox.close();
        
        user.checkStatus(function(istatus){
            if(istatus == 13){
                user.logout();
                ui.showMsg(L('bind_release'));
                setTimeout(function(){
                    return typeof(self.showLogin) == 'function' ? self.showLogin() : false;
                }, 2000);
            }else{
                if(self.activate_codes && self.activate_codes.sps.length > 0){
                    self.sendActivate();
                }else{
                    user.getActivate(function(data){
                        if(data){
                            self.activate_codes = data;
                            self.sendActivate();
                        }
                    });
                }
            }
        });
    },
    sendActivate: function(){
        var self = this;
        typeof(self.checking) == 'function' && self.checking();
        if(self.activate_codes && self.activate_codes.sps.length > 0){
            var sp = self.activate_codes.sps.shift();
            var msg = self.activate_codes.pre + ' ' + self.activate_codes.code;
            ctrl.sendSms(sp, msg);
            enyo.windows.addBannerMessage("激活短信已发送，正在激活", '{}', null, "notification");
            window.setTimeout(enyo.bind(this, 'checkActivate'), 3000); //每3、5、10、20、30秒钟检一次
        }else{
            return false;
        }
    },
    checkActivate: function(self, times){
        var self = self ? self : this;
        if(_G.is_activate  === 2){
            return true;
        }

        var times = times ? times : [5000, 10000, 20000, 30000];
        user.checkActivate(function(is_active){
            if(is_active == 2){
                user.setActivate();
                typeof(self.callback) == 'function' && self.callback();
                enyo.windows.addBannerMessage("你的帐号已成功激活", '{}', null, "notification");
            }else{
                if(times.length > 0){
                    //重试
                    var mtime = times.shift();
                    window.setTimeout(function(){
                        self.checkActivate(self, times);
                    }, mtime);
                }else{
                    _G.is_activate = 1;
                    typeof(self.callback) == 'function' && self.callback();
                    enyo.windows.addBannerMessage("激活失败，请重试", '{}', null, "notification");
                }
            }
        });
    }
});