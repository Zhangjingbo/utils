#!/usr/bin/perl
#------------------------------------------------------------------------------
# 用来测试登录
#------------------------------------------------------------------------------

use Net::OAuth2::Client;
use JSON qw(decode_json);

# 这个url是对外发布的地址，用来跳转到微博开放平台验证
get '/oauth' => sub{
    my $client = &test_client;
    redirect $client->authorize_url;
};

# 这个url是授权返回地址，真正的应用入口。
get '/oauth/callback' => sub {
    my $client = &test_client;

    # 这个code参数是前面的authorize_url授权验证后返回时带上的，使用这个code进行access token
    # 验证。 所以无法直接访问/oauth/callback，必须通过/oauth访问。
    my $access_token = $client->get_access_token(params->{code});

    # access token 验证通过后，真正的对api发起请求，列表见http://open.weibo.com/wiki/API文档_V2
    # 请求方法有get/post/delete等，见Net::OAuth2::AccessToken模块。
    my $response = $access_token->get('/2/statuses/user_timeline.json');
    if($response->is_success){
	my $data = decode_json $response->decoded_content;
	template 'weibo.', {msgs => $data};
    } else {
	return $response->status_line;
    };
};

sub test_client{
    Net::OAuth2::Client->new(
	config->{app_key},
	config->{app_secret},
	user_agent => LWP::UserAgent->new(ssl_opts => {SSL_verify_mode => '0x01'}),
	site => 'https://api.weibo.com',
	authorize_path => '/oauth2/authorize',
	access_token_path => '/oauth2/access_token',
	access_token_method => 'POST',
	)->web_server(redirect_uri => uri_for('/oauth/callback')
    );  #  注意这个url需要去新浪授权，否则验证cb地址不匹配会报错的
};
