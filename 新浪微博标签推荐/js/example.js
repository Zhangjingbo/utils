/**
 * @description js widget example
 * @author jianqiang3@staff.sina.com.cn
 */

(function() {
	// side bar
	$('.bs-docs-sidenav').affix({
	  offset: {
	    top: function () { return $(window).width() <= 980 ? 290 : 210 }
	  , bottom: 270
	  }
	});
	
	var title = document.title.split('-');
	if(title[0]) {
		$('#overview .lead').html(title[0])
	}
	
	var url = document.location.href,
		uri = document.location.href.substring(url.lastIndexOf('/') + 1);
		
	$('#leftnav').find('a').each(function(i, v) {
		if($(v).attr('href').indexOf(uri) != -1) {
			$(v).parent().addClass('active');
		}
	});
	
	if(uri == '') {
		//home
		$('.nav').find('a').eq(0).parent().addClass('active');
		return;
	}
	$('#topnav').find('a[href!=#]').each(function(i, v) {
		if($(v).attr('href').indexOf(uri) != -1) {
			if($(v).parent().parent().attr('class') == 'dropdown-menu') {
				// sub menu
				$(v).parent().parent().parent().addClass('active');
				
			} else {
				$(v).parent().addClass('active');
				
			}
		}
	});
	
	SyntaxHighlighter.all();
})();

/*
 * *************************登录按钮*******************************/
if($('#wb_connect_btn').length) {
	WB2.anyWhere(function (W) {
	    W.widget.connectButton({
	        id: "wb_connect_btn",
	        type: '3,2',
	        callback: {
	            login: function (o) { //登录后的回调函数
	                alert("login: " + o.screen_name)
	            },
	            logout: function () { //退出后的回调函数
	                alert('logout');
	            }
	        }
	    });
	});
}

/*
 * *************************关注按钮*******************************/
if($('#wb_follow_btn').length) {
	WB2.anyWhere(function (W) {
	    W.widget.followButton({
			'nick_name': '姚晨',	//用户昵称
			'id': "wb_follow_btn",
			'show_head' : true,	//是否显示头像
			'show_name' : true,	//是否显示名称
			'show_cancel': true,	//是否显示取消关注按钮
			'callback' : function(type, result) {
				console.log(type);
				console.log(result)
			}
		});
	});
}

/*
 * *************************选择器*******************************/
if ($('#wb_selector').length) {
	WB2.anyWhere(function(W){
		W.widget.selector({
			id: "wb_selector"
		});
	});
}

// 定制tab页
if ($('#wb_selector_custom1').length) {
	WB2.anyWhere(function(W){
		W.widget.selector({
			id : "wb_selector_custom1",
			tab: {
				'list' : [1, 3],
				'index' : 3
			}
		});
	});
}

// 定制标题
if ($('#wb_selector_custom2').length) {
	WB2.anyWhere(function(W){
		W.widget.selector({
			id : "wb_selector_custom2",
			title: "我的好友选择器，标题是定制的"
		});
	});
}

// 限制选择数量
if ($('#wb_selector_custom3').length) {
	WB2.anyWhere(function(W){
		W.widget.selector({
			id : "wb_selector_custom3",
			limit: 5
		});
	});
}

// 回调
if ($('#wb_selector_custom4').length) {
	var resultbox = $("#resultbox");
	resultbox.val('');
	WB2.anyWhere(function(W){
		W.widget.selector({
			id : "wb_selector_custom4",
			callback: function(data) {
				var jsonStr = JSON.stringify(data, null, '\t');
				resultbox.val(jsonStr);
				resultbox.show('slow');
			}
		});
	});
}

/*
 * *************************发布器*******************************/
if ($('#wb_publish').length) {
	WB2.anyWhere(function(W){
		W.widget.publish({
			id : "wb_publish"
		});
	});
}

/*
 * *************************名片Example*******************************/
// 单独定义
if ($('#wb_card_alone').length) {
	WB2.anyWhere(function(W){
		W.widget.hoverCard({
			id : "wb_card_alone"
		});
	});
}
// 批量定义
if ($('#wb_card_auto').length) {
	WB2.anyWhere(function(W){
		W.widget.hoverCard({
			id : "wb_card_auto",
			search: true
		});
	});
}
/*
 * *************************API*******************************/
/*
 * 登录WB2.login();
 */
$('#wb_login').click(function() {
	WB2.login(function() {
		alert('您已经登录');
	});
});

/*
 * 退出登录WB2.logout();
 */
$('#wb_logout').click(function() {
	WB2.logout(function() {
		alert('您已经退出登录');
	});
});

/*
 * 退出登录WB2.logout();
 */
$('#wb_checkLogin').click(function() {
	alert('您当前的登录状态：'+ WB2.checkLogin());
});

/*
 * 退出登录WB2.logout();
 */
$('#wb_parsecmd').click(function() {
	var _this = this, resultbox = $("#resultbox");
	$(_this).button('loading');
	resultbox.val('');
	
	WB2.anyWhere(function(W){
		//数据交互
		W.parseCMD('/users/show.json', function(oResult, bStatus) {
			if(bStatus) {
				var jsonStr = JSON.stringify(oResult, null, '\t');
				resultbox.val(jsonStr);
				resultbox.show('slow');
				$(_this).button('reset');
			}
		}, {
			screen_name : '姚晨'
		}, {
			method : 'get',
			cache_time : 30
		});
	});
	
});

/*
 * *************************联系我们*******************************/
//名片
if($('#wbcard').length) {
	WB2.anyWhere(function(W){
		W.widget.hoverCard({
			id: "wbcard",	//dom结点ID
			search: true	//是否为批量处理名片的标识， 为true时会自动识别指定标签里“@+昵称”,并进行批量替换
		});
	});
}


