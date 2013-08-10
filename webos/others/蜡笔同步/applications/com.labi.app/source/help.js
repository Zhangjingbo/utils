enyo.kind({
    name: "Labi.Help", 
    kind: "Control", 
    layoutKind: "VFlexLayout", 
    flex: 1,
    components: [
        {kind: "Control", layoutKind: "HFlexLayout", className: "nav", components: [
            {kind: "Image", src: "images/labi_logo_72.png", className: "nav-logo"},
            {content: "帮助中心", flex: 1, style: "margin-left:5px;"}
        ]},
        {kind: "Scroller", flex: 1, components: [
            {kind: "HtmlContent", style:"padding:5px; font-size:14px;", 
                content: '帮助中心帮助中心帮助中心帮助中心帮助中心帮助中心帮助中心帮助中心'
            }
        ]}    
    ]
});