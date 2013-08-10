enyo.kind({
    name: "Labi.Restore", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "数据恢复", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, components: [
            {kind: "Control", className:"item-first"},
            {kind: "Labi.Contact.Restore", name: "contact", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Sms.Restore", name: "sms", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Crc.Restore", name: "crc", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Calendar.Restore", name: "calendar", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Control", className:"item-last"}
        ]}
    ],
    
    
    showLogin: function(inSender, e){
        this.doShowView('Labi.Login');
    },
    
    init: function(){
        if(!user.checkLogin()){
            return false;
        }
        var self = this;
        sys.getTimestamp(function(rs){
            var contact = rs.contact_last_res ? util.date(parseInt(rs.contact_last_res), _G.timezone / 60) : '';
            contact = contact ? '上次恢复于' + contact : '把网站的数据恢复到手机';
            self.$.contact.setMsg(contact);

            var sms = rs.sms_last_res ? util.date(parseInt(rs.sms_last_res), _G.timezone / 60) : '';
            sms = sms ? '上次恢复于' + sms : '把网站的数据恢复到手机';
            self.$.sms.setMsg(sms);

            var crc = rs.crc_last_res ? util.date(parseInt(rs.crc_last_res), _G.timezone / 60) : '';
            crc = crc ? '上次恢复于' + crc : '把网站的数据恢复到手机';
            self.$.crc.setMsg(crc);

            var calendar = rs.calendar_last_res ? util.date(parseInt(rs.calendar_last_res), _G.timezone / 60) : '';
            calendar = calendar ? '上次恢复于' + calendar : '把网站的数据恢复到手机';
            self.$.calendar.setMsg(calendar);
        });
    },

    mousedown: function(inSender, e){
        inSender.addClass('highlight');
    },
    mouseup: function(inSender, e){
        inSender.removeClass('highlight');
    },
    mouseout: function(inSender, e){
        inSender.removeClass('highlight');
    }
});