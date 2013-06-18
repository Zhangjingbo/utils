#!/usr/bin/perl
use warnings;
use strict;

use Net::OAuth2::Client;
use HTML::Entities;
use utf8;
use CGI;

my $v密码文件 = "../密码文件";
open (RD, "<$v密码文件") or die "Cannot open file $v密码文件 来读取";
my ($app_key, $app_secret) = <RD>;
chomp $app_key;
chomp $app_secret;
close RD;
my %config = (
    name => '新浪微博',
    client_id => $app_key,
    client_secret => $app_secret,
    site => 'https://api.weibo.com',
    authorize_path => '/oauth2/authorize',
    access_token_path => '/oauth2/access_token',
    redirect_uri => "http://sinatag.bikouchan.org/cgi-bin/callback");

my $q = CGI->new;
my $auth = Net::OAuth2::Profile::WebServer->new(%config);
my $url = $auth->authorize_response->as_string;
print $q->redirect("https://api.weibo.com/oauth2/authorize?response_type=code&redirect_uri=http%3A%2F%2Fsinatag.bikouchan.org%2Fcgi-bin%2Fcallback&client_id=$app_key&scope=");

