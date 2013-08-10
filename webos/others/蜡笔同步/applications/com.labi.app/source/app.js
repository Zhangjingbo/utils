var app = {};

app.run = function(){
    new Banner().renderInto(document.body);
    sys.startup(function(){
        if(typeof(__OBJ__) == 'undefined'){
            __OBJ__ = new Labi();
            __OBJ__.renderInto(document.body);
        }
    });
};