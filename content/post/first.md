---
title: "mkdocs 搭建网站"
date: 2020-07-12T23:21:46+08:00
draft: true
---

## [mkdocs](https://markdown-docs-zh.readthedocs.io/zh_CN/latest/user-guide/configuration/)使用方法记录

视频教程Bilibili---->up主	正月点灯笼（用python和mkdocs制作简易个人网站）

---



#### 1.安装

首先需要确保有python环境

Ubuntu下安装：

`apt-get install mkdocs`

#### 2.新建存网页文件夹

`mkdocs new mysite`

- 文件结构

  - mysite文件夹

    - index.md

  - mkdocs.yml配置文件

    

复制以下代码到你的博客文件末尾，就可以支持数学公式操作，了解更多请搜索 [     MathJax: 让前端支持数学公式        ](https://www.cnblogs.com/geyouneihan/p/9743302.html)             

```javascript
<script type="text/javascript" async
  src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML">
</script>

<script type="text/x-mathjax-config">
MathJax.Hub.Config({
  tex2jax: {inlineMath: [['$','$'], ['\\(','\\)']]}
});
</script>
<script type="text/javascript" async src="path-to-mathjax/MathJax.js?config=TeX-AMS_CHTML"></script>
```



##### 3.启动

`mkdocs serve`



##### 4.部署

`mkdocs build`

会生成一个site文件夹，可以打包上传到免费服务器网站

如：BitBalloon 或  GithubPage
