#!/bin/bash

#  参数为epub文件的路径, 可以同时处理多个文件

# 自定义的css文件
css_file=stylesheet.css

# 如果当前目录中有 $css_file 这个文件,那么就使用它作为新的css文件.
# 如果没有,使用文档内部定义的一个

if [ !-e $css_file ]
then
        cat >$css_file <<END_CSS
@font-face{font-family:}
.....
END_CSS
fi

# 开始替换, 遍历所有参数代表的文件
for epubfile in 
do
        zip -r $epubfile $css_file
done

# vim: set filetype=sh :

#  说明文档:
# 这个脚本用来更改epub文件的css样式表(仅限于名称为stylesheet.css的样式表),
# 脚本需要的参数是需要更改的文件路径, 可同时处理多个文件.
# 如果当前目录中有stylesheet.css这个文件, 那么脚本就会使用它来替换epub文件中
# 原有的stylesheet.css文件, 如果没有的话,脚本就会使用一个内置的css文件来替换
# epub文件中原有的css文件
