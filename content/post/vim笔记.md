---
title: "vim 使用笔记"
date: 2020-07-12T23:21:46+08:00
draft: true
---

## vim使用笔记

---

### vim如何添加插件？

#### **安装** **`vim-plug`**  vim插件管理器

谷歌搜索vim plug，进入GitHub界面，对于Linux系统，复制命令

```
curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

##### **搭建框架**

打开 **.vimrc** 文件，在最末尾添加

```
call plug#begin()

call plug#end()
```

之后就可以在中间添加需要的插件

##### **添加插件**

谷歌搜索vim awesome，里面有很多vim的插件，也有安装方法

举例，比如要安装nerdtree，点击它，复制

```
Plugin 'scrooloose/nerdtree'
```

然后粘贴到框架中间，在vim下的命令行执行命令

```
PlugInstall
```

插件就安装好了

##### **删除插件**

把刚才那句话注释或删除(自动加载插件语句也要删除)，在vim命令行执行命令

```
PlugClean
```

##### **如何使用NERDTree**

可以使用命令

```
help NERDTree.txt
```

查看帮助文档

##### **基本命令**

```
"打开NERDTree"
NREDTree

```

实现每次打开文件自动加载NERDTree

在 **.vimrc** 文件末尾添加

```
autocmd VimEnter * NERDTree
```

##### **基本操作**

```
Ctrl ww		//在目录树和文件之间和多个文件之间切换
？		   //光标停在目录树，打 ？ 显示帮助
i           //垂直排列打开文件
s           //水平排列打开文件
I           //打开隐藏文件
q           //退出NERDTree
A           //最大、最小化目录树

```

-----

---

### 白嫖别人的 `vimrc`

网站		**GitHub**

[收藏最多的vimrc配置](https://github.com/amix/vimrc)

----

### 一些基本的vim配置总结

| 快捷-按键（普通模式下） |        |
| ----------------------- | ------ |
| u                       | 撤销   |
| CTRL+r                  | 反撤销 |
|                         |        |
|                         |        |
|                         |        |
|                         |        |
|                         |        |
|                         |        |
|                         |        |
|                         |        |
|                         |        |

| .vimrc  配置命令总结 |                  |
| -------------------- | ---------------- |
| ：resize+3           | 竖排的窗口  变大 |
| ：resize-3           | 竖排的窗口  变小 |
| ：vertical resize+3  | 横排的窗口  变大 |
| ：vertical resize-3  | 横排的窗口  变小 |
|                      |                  |
|                      |                  |
|                      |                  |
|                      |                  |
|                      |                  |

| 我的vim快捷键 |                  |
| ------------- | ---------------- |
| /    nt       | 打开NERDTree     |
| q             | 关闭NERDTree     |
| I             | 显示隐藏文件     |
| i             | 横排打开新窗口   |
| s             | 竖排打开新窗口   |
|               |                  |
| Ctrl+HLJK     | 切换窗口         |
| Ctrl+w        | 在窗口间移动光标 |
| 6789          | 放大缩小窗口     |
| /    qq       | 不保存退出       |
| /    ww       | 保存             |
| /    w        | 保存退出         |

| vim底行模式下的命令 |                                                              |
| ------------------- | ------------------------------------------------------------ |
| :r filename         | \#读入一个文件内容,并写入到当前编辑器中                      |
| :w newfilename      | \#将该编辑器中的内容写入到一个新文件中                       |
| :!ls                | \#在编辑过程中执行shell命令ls                                |
| :sh                 | #进入shell命令行,执行完命令后ctrl+d退出重新进入vim编辑继续编辑<br/>在shell命令下，执行ctral+l完成清屏 |
| :e!                 | \#当前文件,返回到上次保存                                    |
| :e file             | \#切换编辑文件                                               |
| :n<br />            | \#当编辑时有多个文件(比如vim file1 file2)时切换到下一个文件,与 `:e file` 结合使用 |
|                     |                                                              |
|                     |                                                              |

