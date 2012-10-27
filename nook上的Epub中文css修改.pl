#!/usr/bin/perl
# vim: set filetype=perl :

# 这个脚本用来更改Epub电子书中的css文件，来使得中文的epub在Nook Simple Touch上能够正常阅读。当然仅仅更改css文件是不够的，还需要在nook上安装能够正常显示中文的中文字体包，这个字体包老牛做的不错。
# 本脚本也会提供对老牛字体包的支持
use warnings;
use strict;

use Archive::Zip qw(:ERROR_CODES :CONSTANTS);
my $zip = Archive::Zip->new();

my $nook_epub_css = "* {font-family:文鼎简中楷}";
my $filename = shift;
my $css4replace = "hello.css";
unless($zip->read($filename) == AZ_OK){
	die "Read Error";
}
foreach ($zip->memberNames()){
	m/.+\.css$/ or next;
	print $_,"\n";

# 保留原有的css文件的内容，不过在它的最后添加上我们对于字体的设置
	$zip->contents($_, $zip->contents($_) . $nook_epub_css);
}

$zip->overwrite();
print "ok\n";
