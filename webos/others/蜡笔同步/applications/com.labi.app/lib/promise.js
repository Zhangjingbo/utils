var Promise = function(){
    this.queue = [];
};
Promise.prototype.add = function(func){
    this.queue.push(func);
    return this;
};
Promise.prototype.resolve = function(){
    if(this.queue.length == 0){
        this.done();
    }else{
        var func = this.queue.shift();
        return func.apply(this, arguments);
    }
};
Promise.prototype.start = function(){
    if(this.queue.length == 0){
        console.log('Queue empty');
        return false;
    }else{
        return this.resolve();
    }
};
Promise.prototype.done = function(func){
    return typeof(func) == 'function' ? func() : true;
}