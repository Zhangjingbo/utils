enyo.kind({
    name: "Labi.Tos", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "服务条款", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, components: [
            {kind: "HtmlContent", name: "tos", style:"padding:0 10px; font-size:14px;", value: ""}
        ]}    
    ],
    
    create: function(){
        var self = this;
        this.inherited(arguments);
        enyo.xhrGet({url: 'tos.html', load: function(responseText){
            self.$.tos.setContent(responseText);
        }});
    }
});