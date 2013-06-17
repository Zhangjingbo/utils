#!/usr/bin/perl
use warnings;
use strict;

#------------------------------------------------------------------------------
# 作者：班玉都
# 创建日期：2013年04月16日
# 文件功能：标签计算的一些函数
#------------------------------------------------------------------------------

sub recommand_tag_by_tags{
    # 通过标签来推荐标签
    # 可细分为通过用户关注的人的标签进行推荐和通过关注用户的人的标签进行推荐
}

sub recommand_tag_by_posts{
    # 通过发布的微博等内容来推荐标签
    my @posts = get_posts;

    foreach my $post (@posts){
	my @keywords = get_keywords_from_post($post);
	
    }
}

# 这个函数用来获取用户发表的微博，以数组形式返回。
# 参数：
#    $start 开始的条数，$count 要获取的条数
sub get_posts($start, $count){
    
}

# 这个函数用来从微博内容中获取关键字
sub get_keywords_from_post($post){
    
}
