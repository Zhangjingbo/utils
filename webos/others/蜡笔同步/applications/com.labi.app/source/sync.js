enyo.kind({
    name: "Labi.Sync", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    events:{
        onShowView: ""
    },
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "数据同步", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, components: [
            {kind: "Control", className:"item-first"},
            {kind: "Labi.Contact.Sync", name: "contact", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Sms.Sync", name: "sms", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Crc.Sync", name: "crc", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Calendar.Sync", name: "calendar", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
            {kind: "Labi.Photo.Sync", name: "photo", onShowLogin: "showLogin", onDone: "init", className: "item", onmousedown: "mousedown", onmouseup: "mouseup", onmouseout: "mouseout"},
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
            var contact = rs.contact_last_sync ? util.date(parseInt(rs.contact_last_sync), _G.timezone / 60) : '';
            contact = contact ? '上次同步于' + contact : '点击立即同步';
            self.$.contact.setMsg(contact);
            
            var sms = rs.sms_last_sync ? util.date(parseInt(rs.sms_last_sync), _G.timezone / 60) : '';
            sms = sms ? '上次同步于' + sms : '点击立即同步';
            self.$.sms.setMsg(sms);
            
            var crc = rs.crc_last_sync ? util.date(parseInt(rs.crc_last_sync), _G.timezone / 60) : '';
            crc = crc ? '上次同步于' + crc : '点击立即同步';
            self.$.crc.setMsg(crc);
            
            var calendar = rs.calendar_last_sync ? util.date(parseInt(rs.calendar_last_sync), _G.timezone / 60) : '';
            calendar = calendar ? '上次同步于' + calendar : '点击立即同步';
            self.$.calendar.setMsg(calendar);
            
            var photo = rs.photo_last_sync ? util.date(parseInt(rs.photo_last_sync), _G.timezone / 60) : '';
            photo = photo ? '上次同步于' + photo : '点击立即同步';
            self.$.photo.setMsg(photo);
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