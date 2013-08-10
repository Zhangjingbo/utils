if(typeof require === "undefined"){
    require = IMPORTS.require;
}
var writeAssistant = function(){};

writeAssistant.prototype.run = function(future){
    var fs = require('fs');
    var path = require('path');
    
    var dir = '/media/internal/.labi/';
    var file = dir + new Date().getTime() + Math.random() + '.jpg';
    if(!path.existsSync(dir)){
        fs.mkdirSync(dir, 0777);
    }
    
    var base64 = this.controller.args.base64;
    fs.writeFileSync(file, base64, 'base64');
    future.result = {"file": file};
};

/*
luna-send -n 1  palm://com.labi.service/write '{"base64":"iVBORw0KGgoAAAANSUhEUgAAADAAAAAw
CAYAAABXAvmHAAADLklEQVR42u2YXUhTYRzGNeqmiyAvoi+IpoWRddFFlGnpKBDJUKmsxCLya6mZDpNw
mUy3RIsMZ21azW3qTJeEMiullMr8KJcFUs40a2p+FMrapgvd0zlTx4osJKzzmg88vO95xzk8v/3P/uc9
czCc3QGS7TDMWQeS7UC8rGUgWXOjDCRr/d5klFa34OCZIvhzSxCYWAH1Ux05VdkZKsWuMCm8wylHSMGO
lGI3R0oOQEDiPRxLuYuckiZ4heXBOzQHm/enkQMQcbEVQbwa7IlSYluICK77krHMI4wcgDdDRrQPG9E2
bEL7kAmvBw149HYQHUYzGRCVrf24/ewj6rq+oLhOh55xQDc6jrSrYjIAmjreQ6Prw4vufvSMWtDSM4CK
5k40durmnw9/RbU1NfPf9D8VuA5kVwDTiDgAlUqFhoYG8gBqa2thb2IrQOwt9N+oO3ZN19cMZ4xJXDBe
yMy3OMdpbP/ZAnOqM36y7viLa8y6VlPeqlAo7lDjdsqL6fecuLi4LL1eD7VanU4dO9Fz04m11vBsNjuB
Gt3pcwUCwWORSGSk1yUSCexNrW2Z9fR0sClLpVINDTAwMGC0X1cqldlVVVXsSbildDgOh6OiRxaLJaZh
fgi+gvKqyTlj5MbIH2dBQYF7R6+W3LaZq7oCeYWAXABPT08fmUxGLgDxT+INwelwjbwJ34Q83G/+AN+k
HLIAXPx5WOSRZA293JeHhW5ROJKqmN/MMQbkd/LiZoKRABX1L787fq7tgh8v2xr4sDAX4ZflzAGoTjWg
JlWPSr4JLbdGyKqAmt8PC18BsyUaBks8LIJ8Wzgul2u1vcRisXXUarXMACg73wXL55Ow9EZNOIY/LQA9
FwqFKC0tta0z4hYqTG418eML0X6cA49NfvQWmDUDL2FMJ5Kd0"}'
{"file":"/media/internal/labi/13352837048580.28745131101459265.jpg","returnValue":true}
*/