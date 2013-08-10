//GLOBAL VAR
WAITING = false;
SIGN = '';

_G = {}
_G.access_token = '';
_G.is_login = false;
_G.is_online = false;
_G.timezone = 480;
_G.username = '';
_G.lang = 'zh_CN';
_G.net = 'unknown';
_G.bw = 0;
_G.imei = '';
_G.iccid = '';
_G.model = '';
_G.is_activate = 0; //0 unknow, 1 not activate, 2 ok


ui = new Ui();
sys = new Sys();
ctrl = new Ctrl();
sync = new Sync();
user = new User();
user.checkLogin();