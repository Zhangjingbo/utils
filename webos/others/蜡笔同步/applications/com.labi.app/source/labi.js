enyo.kind({
	name: "Labi",
	kind: enyo.VFlexBox,
	components: [
        {kind: "ApplicationEvents", onBack: "backHandler", onApplicationRelaunch: "relaunch", onUnload: "appClose", onWindowRotated: "rotated"},
        //enyo.transitions.Simple | enyo.transitions.LeftRightFlyin
		{name: "pane", kind: "Pane", transitionKind: "enyo.transitions.LeftRightFlyin", flex: 1, onCreateView: "createView", onSelectView: "selectView", components: [
            //{name: "Labi.Login", kind: "Labi.Login", onShowView: "showView"},//testing
            {name: "Labi.Main", kind: "Labi.Main", onShowView: "showView"}
		]}
	],
    
    //Application events
    //inSender: This argument refers to the object that generated the event.即发起event的对象的引用
    backHandler: function(inSender, e){
        SIGN = 'back';
        if(this.$.pane.getViewIndex() > 0 && WAITING == false){
            this.$.pane.back(e);
        }else{
            if(this.$.pane.getViewName() == 'Labi.Main'){
            
            }else{
                e.stopPropagation();
                e.preventDefault();
            }
        }
    },
    showView: function(inSender, viewName){
        //when validateView viewName, will fire the onCreateView
        if(this.$.pane.validateView(viewName)){
            this.$.pane.selectViewByName(viewName, true);
        }
    },
    createView: function(inSender, inName){
        var obj = {name: inName, kind: inName, onShowView: "showView"};
        return obj;
    },
    selectView: function(inSender, inView, inPreviousView){
        if(typeof(inView.init) == 'function'){
            inView.init();
        }
    },

    constructor: function(){
        this.inherited(arguments);
    },
    
    create: function(){
        this.inherited(arguments);
    },
    
    relaunch: function(sender, event){
        //this.inherited(arguments);
        //var params = enyo.windowParams;
        //enyo.log('params='+JSON.stringify(params));
    },
    
    appClose: function(sender, event){
        var params = enyo.windowParams;
        //enyo.log('params='+JSON.stringify(params));
        //enyo.log("window close");
    },
    
    rotated: function(sender, e){
        //enyo.log("window rotated" + enyo.getWindowOrientation());
        //enyo.setAllowedOrientation('up');
    }
});