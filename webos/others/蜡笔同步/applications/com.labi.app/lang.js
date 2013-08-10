LANG = {
"initializing": "正在初始化...",
"sync_done": "同步完成",
"sync_failure": "同步失败",
"restore_done": "恢复完成",
"restore_failure": "恢复失败",

"pulling_data": "正在拉取数据",
"pulling_failure": "拉取数据失败，请重试",
"sync_to_local": "正在同步到本地",

"contact_syncing": "正在同步联系人",
"contact_restoring": "正在恢复联系人",

"calendar_syncing": "正在同步日历",
"calendar_restoring": "正在恢复日历",

"crc_syncing": "正在同步通话记录",
"crc_restoring": "正在恢复通话记录",

"sms_syncing": "正在同步短信",
"sms_restoring": "正在恢复短信",

"photo_syncing": "正在同步相片",

//global
"confirm": "确定",
"cancel": "取消",
"bind_release": "绑定被解除，请重新登录",
};

function L(name){
    return name in LANG ? LANG[name] : name;
}