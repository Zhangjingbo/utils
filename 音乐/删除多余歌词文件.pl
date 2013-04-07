#!/usr/bin/perl
# vim: set filetype=perl :
use warnings;
use strict;

print "将要删除没有对应mp3文件的lrc文件 ... \n";
my @lrcs = glob("*.lrc");
foreach (@lrcs){
    m/(.*)\.lrc$/ and (-e "$1.mp3" or unlink $_ and print "$_ 已经被删除\n");
}
print "处理完成\n";
