#!/usr/bin/perl
# vim: set filetype=perl :
use warnings;
use strict;

# 这个脚本用来生成 perl 模块的epub电子书，主要用来在我的nook上阅读用

use EBook::EPUB;
use LWP::UserAgent;	# 至少有部分信息是来源自网络的，因此要用到它

my $module_name = shift; # 参数为模块的名字

# 部分配置信息
my $cpan_site = "http://www.cpan.org/";
my $cpan_search_site = "search.cpan.org";

