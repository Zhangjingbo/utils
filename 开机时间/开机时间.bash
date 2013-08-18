#!/bin/bash

#	这个脚本用来计算开机到目前的时间 
#	uptime 计算时间, notify-send发送通知

notify-send  开机时间 "`uptime-only-time`" -i gnome-panel-clock
