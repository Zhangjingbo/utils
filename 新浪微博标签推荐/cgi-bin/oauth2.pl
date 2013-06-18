#!/usr/bin/perl

#--------------------------------------------------------------------------------
# 用来测试登录是否可行
# 作者：班玉都
#--------------------------------------------------------------------------------

use warnings;
use strict;
use CGI;

use Net::OAuth2::Profile::WebServer;
use Net::OAuth2::Profile::Password;

# 我的一些配置信息，帐号和密码
my $client_id       = "";
my $client_secret   = "";

# 新浪微博的一些信息
my $site            = "http://open.weibo.com/";
my $authorize_path  = "/2/oauth/auth";
my $access_token_path => "/2/oauth/token";

my $auth = Net::OAuth2::Profile::WebServer->new(
    name           => '新浪微博',
    client_id      => $client_id,
    client_secret  => $client_secret,
    site           => $site,
    authorize_path => $authorize_path,
);

# 获取用户许可
redirect $auth->authorize;

my $access_token = $auth->get_access_token($info->{code});

# 现在就可以和网站交互了
my $response = $access_token->get('/me');
$response->is_success
    or die "error " . $response->status_line;

print "Yay, it worked: " . $response->decoded_content;
