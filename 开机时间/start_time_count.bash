#!/bin/bash
#
#	这个脚本是计算开机时间的开始脚本，它记录开机时间到一个文件，
#	然后等待开机时间程序的另一个脚本来显示时间
#
### BEGIN INIT INFO
# Provides:          start_time
# Required-Start:    xdm
# Required-Stop:
# Should-Start:
# Should-Stop:
# Default-Start:     2 3 5
# Default-Stop:
# Description:       To Count Start Time
### END INIT INFO

START_TIME_DIR=/tmp/.start_time
test -e $START_TIME_DIR && rm -rf $START_TIME_DIR
mkdir $START_TIME_DIR
/home/lotutu/bin/uptime-only-time >$START_TIME_DIR/data
chmod 666 $START_TIME_DIR/data	# 修改权限使得后面的程序能够修改这个文件


# 备注
#	曾经把 Required-Start 设置为 $all, 后来发现不能成功执行，原来是在Gnome成
#	功地执行 .desktop自启动文件的时候 $all 还没有执行完毕。所以这个脚本应该
#	在xdm完成之后立即执行，而不是等待$all完成
