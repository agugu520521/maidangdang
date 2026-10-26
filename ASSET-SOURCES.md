# 素材来源与许可

本项目使用以下可追溯来源的摄影与星球纹理。素材保留各自许可；许可不改变本项目其他源码的许可。

## 星球表面纹理

- 本地文件：`source-assets/planet-texture.jpg`、`public/assets/planet-texture.webp`
- 作品：Solar System Scope — Mars texture（2K）
- 作者：Solar System Scope / INOVE（基于 NASA elevation and imagery data）
- 来源页面：https://www.solarsystemscope.com/textures/
- 原始下载：https://www.solarsystemscope.com/textures/download/2k_mars.jpg
- 许可：Creative Commons Attribution 4.0 International（CC BY 4.0）
- 许可链接：https://creativecommons.org/licenses/by/4.0/
- 本项目处理：JPEG 转 WebP；通过前端着色和光照呈现酒红色行星。

## 单支红玫瑰摄影

- 本地文件：`public/assets/rose.webp`
- 作品：Red rose against a black background.jpg
- 作者：Amardipghosh
- 拍摄日期：2012-06-30
- 来源页面：https://commons.wikimedia.org/wiki/File:Red_rose_against_a_black_background.jpg
- 原始下载：https://upload.wikimedia.org/wikipedia/commons/b/b1/Red_rose_against_a_black_background.jpg
- 使用许可：Creative Commons Attribution-ShareAlike 3.0 Unported（CC BY-SA 3.0；原图同时提供 GFDL，本项目选择 CC BY-SA 3.0）
- 许可链接：https://creativecommons.org/licenses/by-sa/3.0/
- 本项目处理：等比例缩小至 1100 × 1656，JPEG 转为 WebP。黑色背景保留；呈现时可通过 CSS 混合与滤镜适配界面。对此图片的衍生改动遵循同一 CC BY-SA 3.0 许可。

## 备用透明粉色玫瑰（未作为主视觉使用）

- 本地文件：`source-assets/rose-isolated.png`
- 作品：YosriDec04MawarKampung1 Extracted.png
- 原摄影作者：Yosri（Malay Wikipedia）；透明抠图版本：Gabriel VanHelsing
- 来源页面：https://commons.wikimedia.org/wiki/File:YosriDec04MawarKampung1_Extracted.png
- 原摄影：https://commons.wikimedia.org/wiki/File:YosriDec04MawarKampung1.JPG
- 许可：Creative Commons Attribution-ShareAlike 3.0 Unported（CC BY-SA 3.0）
- 许可链接：https://creativecommons.org/licenses/by-sa/3.0/
- 本项目处理：仅重命名；326 × 471 像素，透明背景。

网站发布时，应在公开可访问的素材署名页面保留上述作者、原作品链接、许可链接与改动说明。

## 无 WebGL 时使用的静态火星摄影

- 本地文件：`public/assets/planet-fallback.webp`
- 作品：Global Color Views of Mars — PIA00407
- 作者／署名：NASA/JPL/USGS；由 Viking Orbiter 1 的红光及紫光摄影拼接制作。
- 来源页面：https://science.nasa.gov/photojournal/global-color-views-of-mars/
- 原始图像：https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia00/pia00407/PIA00407.jpg
- 本项目下载：https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia00/pia00407/PIA00407.jpg?crop=faces%2Cfocalpoint&fit=clip&h=1200&w=1200
- 使用依据：JPL Image Use Policy 允许无特别限制声明的公开图像署名使用；不表示 NASA、JPL 或 Caltech 对本项目的认可。
- 使用政策：https://www.jpl.nasa.gov/jpl-image-use-policy/
- 本项目处理：等比例 1200 × 1200 下载，JPEG 转 WebP；保留原图黑色背景与完整构图，不抠图、不绘制。网站可能通过 CSS 将显示色调调暗为酒红色。

## 本地字体

- Cormorant Garamond（300 正体、400 斜体）：Christian Thalmann / The Cormorant Project Authors，SIL Open Font License 1.1。来源：https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- Inter（400）：Rasmus Andersson / The Inter Project Authors，SIL Open Font License 1.1。来源：https://github.com/google/fonts/tree/main/ofl/inter
- 字体由 Google Fonts 官方服务下载，TTF 原文件随站点自托管；许可原文位于 `public/assets/fonts/OFL-Cormorant.txt` 与 `OFL-Inter.txt`。
