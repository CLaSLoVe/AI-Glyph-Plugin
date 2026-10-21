# 提交到 Chrome 网上应用店

上传 `dist/ai-glyph-0.3.1.zip`。不要上传整个项目文件夹。zip 根目录就是 `manifest.json`，里面只有扩展运行时文件。

重新打包：

```sh
tools/package.sh
```

重新导出截图和宣传图（需要本机的 Google Chrome 或 Microsoft Edge）：

```sh
tools/shoot_store.sh
```

开发者注册费是 5 美元，付一次。后台：https://chrome.google.com/webstore/devconsole

## 你要先做的一件事

隐私政策必须是一个公网 HTTPS 地址。源文件是 `store/privacy.html`。推到 `main` 之后，`.github/workflows/pages.yml` 会把它原样发到 GitHub Pages：

```
https://<owner>.github.io/<repo>/privacy.html
```

仓库 Settings → Pages → Build and deployment → Source 选 **GitHub Actions**。用无痕窗口打开上面的地址，确认不用登录就能看到全文，再把这个网址填进后台。首页 `/` 是同一份文件。不要用需要登录的 Google Docs 或网盘预览链接。

后台的支持邮箱填一个你会看的真实邮箱。隐私政策里写的就是这个邮箱。

## 商品信息

名称和摘要来自 `_locales/*/messages.json`，`manifest.json` 用 `__MSG_extName__` 和 `__MSG_extDescription__` 引用。上传之后不能在网页里改。要改就改对应语言的 `messages.json`、把 `version` 加大、重新打包再传。不要把某一种语言的句子直接写回 `manifest.json`。`default_locale` 是 `en`。

| 字段 | English | 中文（简体） |
|---|---|---|
| 名称 | AI Glyph | AI Glyph |
| 摘要 | Turns webpage text into synthetic glyphs that look like characters but do not exist. Local only. | 把网页文字变成看起来像字、但并不存在的合成字形。只在本地运行，可随时关闭。 |
| 版本 | 0.3.1 | 0.3.1 |

商店默认语言选 **English**。后台会按语言带出上面的名称和摘要。详细介绍仍要按语言分别粘贴，英文和简体中文用下面两版，不要贴进同一个文本框。弹窗跟浏览器界面语言走：简体中文用中文，其余语言用英文。

类别：**Entertainment**。不要选 Accessibility。这不是阅读器、翻译器或无障碍工具。

## 详细介绍（English）

```
AI Glyph redraws the visible text on a web page as synthetic glyphs. The size, weight, and color match the surrounding text, and the shapes look like letters or Chinese characters, but the characters do not exist. It is the look of an early AI-generated shop sign: readable at a glance, and not in any dictionary up close.

Open the toolbar icon to turn it off. The original text comes back immediately, without a reload. Intensity runs from slight to almost every character, and the popup previews the current setting.

The extension does only this, and only on your device:

- It reads visible text on pages you visit so it can draw the glyphs.
- It does not store that text, upload it, or contact a server.
- It skips form fields, password fields, and editable areas.
- Chrome warns that it can read and change data on all sites. That access is used only to redraw visible text.

The on/off switch and the intensity are saved in the browser. If Chrome Sync is on, those two settings sync to your Google account. The developer does not receive them.
```

## 详细介绍（中文）

```
AI Glyph 把你正在看的网页文字画成合成字形。字号、粗细、颜色和旁边的字一样，形状也像字母或汉字，但这个字并不存在。远远看像一块招牌，凑近则对不上字典。

点工具栏图标可以关掉，原文马上回来，不用刷新。强度从轻微到几乎每个字，弹窗里能先看到当前效果。

它只做这一件事，而且只在你的浏览器里做：

- 读取页面上看得见的文字，用来画出这些字形
- 不保存页面文字，不上传，也不连接服务器
- 不读取输入框、密码框和可编辑区域
- 安装时 Chrome 会提示它可以读取并更改所有网站上的数据。这项权限只用来重画看得见的文字

开关和强度保存在浏览器里。如果你开了 Chrome 同步，这两项会跟你的 Google 账号同步，开发者收不到。
```

## 图片

全部是直角、铺满、没有透明通道。

每种语言各传一套。英文是默认语言，用 English 那一列；简体中文在后台切到中文后再传「中文（简体）」那一列。图标两种语言共用。

| 后台位置 | English | 中文（简体） | 尺寸 |
|---|---|---|---|
| 商店图标 | `icons/icon128.png` | 同左 | 128×128 |
| 截图 1 | `store/screenshots/01-compare.png` | `store/screenshots/zh_CN/01-compare.png` | 1280×800 |
| 截图 2 | `store/screenshots/02-popup.png` | `store/screenshots/zh_CN/02-popup.png` | 1280×800 |
| 小宣传图（必填） | `store/promo-440x280.png` | `store/zh_CN/promo-440x280.png` | 440×280 |
| 横幅宣传图（可选） | `store/promo-1400x560.png` | `store/zh_CN/promo-1400x560.png` | 1400×560 |

截图是默认强度 50 的真实输出，画面文字和弹窗跟该语言一致。宣传图用同一个引擎，强度 85，让缩小后仍能看出字形。宣传视频留空。

## 隐私设置页

单一用途：

```
Visually redraw visible web page text as synthetic lookalike glyphs. The user can turn this off or change the intensity. It does not translate, summarize, read form fields, or send page text anywhere.
```

权限说明：

`storage`

```
Stores two preferences only: whether the effect is enabled, and the intensity (a number from 5 to 100). Page text is not stored. If the user has Chrome Sync on, these two values sync to their own Google account. The developer does not receive them.
```

读取并更改所有网站上的数据（内容脚本的 `<all_urls>`）：

```
The only feature is redrawing visible text on pages the user browses, so the script has to run on those sites and keep running as they navigate. It reads text nodes locally to draw synthetic glyphs. It skips input, password, and editable fields. It does not transmit page content. activeTab is not enough: the effect is a persistent visual mode, not a one-time action on the current tab.
```

远程代码：**No, I am not using remote code.**

数据收集：选 **Yes**（本地处理也要披露）。只勾选 **Website content**。不要勾选个人身份信息、健康、金融、身份验证、个人通讯、位置、浏览历史、用户活动。

然后勾选这三项保证（都符合）：

- 不向第三方出售或转让用户数据
- 不把用户数据用于与本扩展单一用途无关的目的
- 不把用户数据用于信用评估或放贷

隐私政策网址：`https://<owner>.github.io/<repo>/privacy.html`。

## 分发

公开、全部地区即可。后台如果要求交易者身份或联系信息，用你自己的真实信息填，这一步只能你完成。

## 不要打进 zip 的东西

`demo.html`、`README.md`、`tools/`、`store/`、`dist/`。`tools/package.sh` 用白名单打包，并会在这些文件漏进去时直接失败。
