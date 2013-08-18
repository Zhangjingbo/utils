#!/bin/bash
START_TIME_DIR=/tmp/.start_time
test -s $START_TIME_DIR/data ||exit 
read content <$START_TIME_DIR/data
cmd="notify-send 开机时间 \"$content\" -i gnome-panel-clock"
eval $cmd
cat /dev/null >$START_TIME_DIR/data
