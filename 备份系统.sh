#!/bin/bash
# vim: set filetype=sh :
backup_dir=$HOME/文档/备份
if ! test -d $backup_dir
then
	mkdir -pv $backup_dir || exit 1
fi

backup_filename="backup-"`date +%Y-%m-%d`".tar.bz2"

sudo tar cvjpf $backup_dir/$backup_filename	\
		--exclude=/home	\
		--exclude=/proc	\
		--exclude=/sys	\
		--exclude=/dev/pts	\
		--exclude=/mnt/*	\
		--exclude=/media/*	\
		--exclude=/tmp/*	\
		--exclude=/lost+found	\
		/
