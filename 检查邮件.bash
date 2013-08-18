#!/bin/bash
# vim: set filetype=sh :

sound_file="$HOME/音乐/sound/新邮件.wav"
if
	fetchmail &>/dev/null
then
	if [ -e /dev/tty ]
	then
		echo "您有新邮件" >/dev/tty
	fi

	if [ -e $sound_file ]
	then
		notify-send --icon=mail_new "新邮件" &>/dev/null
		aplay $sound_file &>/dev/null
	fi
fi

