enyo.kind({
	name: "Banner",
	kind: enyo.VFlexBox,
	components: [
        //{kind: "Image", src: "images/labi_logo_72.png", style: "height:100%; width:100%;"},
        {layoutKind: "VFlexLayout", flex:1, pack: "center", align: "center", style: "background: url(images/global-bg.png) center center no-repeat;", components: [
            {kind: "Image", src: "images/labi_logo_98_152.png"}
        ]}
	]
});