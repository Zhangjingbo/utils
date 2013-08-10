function Util(){

    this.signature = function(base_string, oauth_consumer_secret){
        var hmacBytes = Crypto.HMAC(Crypto.SHA1, base_string, oauth_consumer_secret+'&', {asBytes: true});
        return Crypto.util.bytesToBase64(hmacBytes);
    };
    
    this.xml2json = function(xmlcode){
        var parser = new DOMParser();
        var xmlobj = parser.parseFromString(xmlcode, "text/xml");
        return xmlToJson(xmlobj);
    };
    
    this.urlencode = function(str){
        str = encodeURIComponent(str); //escape(str);
        str = str.replace('!', '%21');
        return str;
    };
    this.urldecode = function(str){
        str = decodeURIComponent(str); //unescape(str);
        str = str.replace('%21', '!');
        return str;
    };
    
    this.toQueryString2 = function(obj){
        if(!obj){
            return '';
        }
        var q = [];
        for(i in obj){
            q.push(this.urlencode(i)+'='+this.urlencode(obj[i]));
        }
        return q.join('&');
    }
    
    this.toQueryString = function(obj){
        return enyo.objectToQuery(obj)
    }
    
    this.ksort = function(obj){
        var sorted = {};
        var k_array = [];
        
        for(k in obj){
            if(obj.hasOwnProperty(k)){
                k_array.push(k);
            }
        }
        
        k_array.sort();
        for(var i = 0; i < k_array.length; i++){
            sorted[k_array[i]] = obj[k_array[i]];
        }
        //alert(JSON.stringify(sorted));
        return sorted;
    };
    
    this.random = function(n, m){
        return Math.round(Math.random() * (n-m) + m);
    };
    
    this.time = function(){
        return Math.round(new Date().getTime() / 1000);
    };
    
    this.timestamp = function(){
        return new Date().getTime();
    };
    
    this.date = function(timestamp, timezone){
        var timestamp = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        var timezone = timezone ? timezone : 0;
        timestamp += timezone * 3600 * 1000;
        var dt = new Date(timestamp);
        var Y = dt.getUTCFullYear();
        var m = dt.getUTCMonth() + 1; 
        var d = dt.getUTCDate();
        var H = dt.getUTCHours();
        var i = dt.getUTCMinutes();
        var s = dt.getUTCSeconds();
        return Y+'-'+(m > 9 ? m : '0'+m)+'-'+(d > 9 ? d : '0'+d)+' '+(H > 9 ? H : '0'+H)+':'+(i > 9 ? i : '0'+i)+':'+(s > 9 ? s : '0'+s);
    };
    this.str2time = function(date, timezone){
        var timezone = timezone ? timezone : 0;
        var dt = date.match(/(\d+)/g);
        var timestamp = +new Date(Date.UTC(dt[0], dt[1] - 1, dt[2], dt[3], dt[4], dt[5]));
        return timestamp - timezone * 3600 * 1000;
    };
    this.encode = function (str){
        if(!str){
            return '';
        }
        var str = str.replace(/[\x00-\x1f]/g, '');
        var uni = '';
        for(var i = 0; i < str.length; i++){
            var code = str.charCodeAt(i);
            if(code < 0x80){
                uni += String.fromCharCode(code);
            }else{
                uni += '&#x'+ code.toString(16) + ';';
            }
        }
        return uni;
    };

    this.decode = function (str){
        if(!str){
            return '';
        }
        var str = str.replace(/&#x([0-9a-z]+);/gi, function(x, code){
            return String.fromCharCode(parseInt(code, 16));
        });
        return str;
    };
    
    this.mergeList = function(list1, list2){
        if(typeof(list1) != 'object' || typeof(list1.length) != 'number'){
            list1 = [];
        }
        for(var i in list2){
            list1.push(list2[i]);
        }
        return list1;
    };
    
    this.timezone = function(val){
        var result = false;
        for(var i in TIMEZONE){
            if(isNaN(val)){ //not a number
                if(TIMEZONE[i].timezone == val){
                    result = TIMEZONE[i].offset;
                    break;
                }
            }else{
                if(TIMEZONE[i].offset == val){
                    result = TIMEZONE[i].timezone;
                    break;
                }
            }
        }
        return result;
    };
    
    this.str2xml = function(str){
        if(typeof(str) != 'string'){
            return '';
        }
        var str = str.replace(/</gi, '&lt;');
        str = str.replace(/>/gi, '&gt;');
        str = str.replace(/&/gi, '&amp;');
        str = str.replace(/'/gi, '&apos;');
        str = str.replace(/"/gi, '&quot;');
        return str;
    };
    this.xml2str = function(str){
        var str = str.replace(/&lt;/gi, '<');
        str = str.replace(/&gt;/gi, '>');
        str = str.replace(/&amp;/gi, '&');
        str = str.replace(/&apos;/gi, '\'');
        str = str.replace(/&quot;/gi, '"');
        return str;
    };
    
}

util = new Util();
/*
alert(JSON.stringify(util.xml2json('<xm a="m">mason中国.@＠＃）．ｓ</xm>')));
alert(JSON.stringify(util.ksort({"b": "2", "a":"1"})));
*/