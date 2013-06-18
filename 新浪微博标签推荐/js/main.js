/*
 * 文件作用：网站sinatag.bikouchan.org中用到的JavaScript代码的主要文件
 * 作者：班玉都(banyudu@gmail.com)
 */

/* ******************************* API ***************************** */

// 登录
$('#wb_login').click(function() {
    WB2.login(function() {
	alert('已登录');
    });
});

// 退出登录
$('#wb_logout').click(function() {
    WB2.logout(function() {
	alert('已经退出登录');
    });
});

// 查询登录状态
$('#wb_checkLogin').click(function() {
    alert('您当前的登录状态：' + WB2.checkLogin());
});