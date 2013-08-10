enyo.kind({
    name: "Labi.Share", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "分享蜡笔", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, style: "margin: 10px;", components: [
            {kind: "Input", name: "pnum", hint: "接收者", style: "-webkit-border-image: url(images/input-focus.png) 14 14;"},
            {flex: 1, kind: "RichText", name: "content", value: "向你推荐一款手机软件-蜡笔同步：双向实时同步联系人，在线收发短信，无线发送文件到手机，更可以方便安排日程。赶快试试吧！下载地址：http://e.labi.com", style: "margin-top:10px; min-height:120px; -webkit-border-image: url(images/input-focus.png) 14 14;"},
            {kind: "Button", caption: "发送", onclick: "send"}
        ]}    
    ],
    
    send: function(inSender){
        var self = this;
        var content= this.$.content.getHtml();
        var pnum = this.$.pnum.getValue();
        if(!pnum.match(/^\+?[0-9]{3,15}$/g)){
            ui.showMsg('请填写接收者手机号码');
            return false;
        }
        if(content == ''){
            ui.showMsg('请填写内容');
            return false;
        }

        ctrl.sendSms(pnum, content);
        ui.showMsg('短信已发送');
        this.$.pnum.setValue('');
        setTimeout(function(){
            self.doShowView('Labi.Main');
        }, 2000);
    }
});