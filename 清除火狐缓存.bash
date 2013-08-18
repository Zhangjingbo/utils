#!/bin/bash
# 脚本用来清除火狐浏览器的缓存(linux下)
set -e
firefox_dir=$HOME/.mozilla/firefox
cd $firefox_dir
for dir in `ls |grep '\.default$'`
do
	test -d $dir && rm $dir/Cache/* -rf &>/dev/null
done
# vim: set filetype=sh :
