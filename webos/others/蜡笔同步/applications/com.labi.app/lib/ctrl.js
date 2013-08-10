/**
SMS会话表：com.palm.chatthread:1
SMS内容表：com.palm.message:1
//ctrl.sendSms('10086', "10086");
//ctrl.sendTel('18978074458');
*/
enyo.kind({
    name: "Ctrl",
    kind: enyo.Component,
    components: [
        //db
        {kind: "DbService", name: "db", onSuccess: "onSuccess", onFailure: "onFailure"},
        //palm
        {kind: "PalmService", name: "app", onSuccess: "onSuccess", onFailure: "onFailure", service: "palm://com.palm.applicationManager/"},
    ],
    
    //will remove from version1.0.0
    sendSms: function(addr, msg){
        this.onFailure = this.dbFailure;
        this.onSuccess = function(inSender, inResponse){
            //enyo.log("inResponse=" + enyo.json.stringify(inResponse));
            if(inResponse && inResponse.returnValue){ //导步的这里，so不需要callback了
                return true;
            }else{
                return false;
            }
        };
        
        /**
            "conversations": [], conversations不要设置，否则watch不会主动更新会话，会话表是 com.palm.chatthread:1
            timestamp是必须的否则status=pending时不会发出去 成功发送后会回写 networkMsgId
        */
        var timestamp = util.timestamp();
        var localTimestamp = timestamp + _G.timezone * 60 * 1000; //微秒
        var obj = {"_kind": "com.palm.smsmessage:1", "folder": 'outbox', "status": "pending", "timestamp": timestamp, "localTimestamp": localTimestamp,
                    "flags": {"read": true, "visible": true, "deliveryReport": false},
                    "to": [{"addr": addr, "name": addr}],
                    "serviceName": "sms", "messageText": msg
                  };
        this.$.db.setMethod('put');
        var sql = {"objects": [obj]};
        this.$.db.call(sql);
    },
    
    sendSms2: function(addr, msg){
        this.onFailure = this.palmFailure;
        this.onSuccess = function(inSender, inResponse){
            enyo.log("inResponse=" + enyo.json.stringify(inResponse));
        };

        this.$.app.setMethod('launch');
        var args = {"id": "com.palm.app.messaging", "params": {"composeRecipients": [{"address": addr, "serviceName": "sms"}], "messageText": msg}};
        this.$.app.call(args);
    },
    
    //will remove from version1.0.0
    sendTel: function(addr){
        this.onFailure = this.palmFailure;
        this.onSuccess = function(inSender, inResponse){
            //enyo.log("inResponse=" + enyo.json.stringify(inResponse));
        };

        this.$.app.setMethod('launch');
        var args = {"id": "com.palm.app.phone", "params": {"action": "dial", "address":addr}};
        this.$.app.call(args);
    },

    dbFailure: function(inSender, inError, inRequest){
        //enyo.log("dbFailure, results=" + enyo.json.stringify(inError));
        //ui.showMsg('数据库操作失败, 错误信息：' + enyo.json.stringify(inError));
		ui.showMsg('数据库操作出错');
        return false;
    },
    
    palmFailure: function(inSender, inError){
        //enyo.log("inError=" + enyo.json.stringify(inError));
        return false;
    }
});