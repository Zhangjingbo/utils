#!/usr/bin/perl
# 这个文件是测试使用Perl获取用户微博并解析JSON数据用的

use warnings;
use strict;

use utf8;
use LWP::UserAgent;

my $v用户名称 = "班玉都";
my $vAppkey = "2733794709";
my $v基本网址 = "https://api.weibo.com";
my $v用户微博接口 = "/2/statuses/user_timeline.json";
my $v下载内容的网址 = $v基本网址 . $v用户微博接口 . "?source="
    . $vAppkey . "&screen_name=" . $v用户名称;

my $v下载结果 = get($v下载内容的网址);
if (!defined $v下载结果){
    die "未能成功下载内容";
}

if ($v下载结果->is_success){
    print $v下载结果->content, "\n";
}
else{
    print "未能成功下载内容!";
}
