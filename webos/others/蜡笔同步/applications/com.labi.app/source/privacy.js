enyo.kind({
    name: "Labi.Privacy", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "隐私政策", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, components: [
            {name: "privacy", kind: "HtmlContent", style:"padding:0 10px; font-size:14px;", content: ''}
        ]}    
    ],
    
    create: function(){
        var self = this;
        this.inherited(arguments);
        enyo.xhrGet({url: 'privacy.html', load: function(responseText){
            self.$.privacy.setContent(responseText);
        }});
    }
});