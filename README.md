# 各就喵位（Purrdoku）

微信小游戏。把奶牛猫请回各自的颜色里：每行、每列、每个颜色区域恰好一只猫，并且八方向不能相邻。

界面按「牛乳贴纸本」重画：米纸底、柿子红印章、水彩色块。规则对齐 `docs/gameplay.md`。

同类玩法可参考 GitHub 上的 [LinkedIn Queens 开源实现](https://github.com/samimsu/queens-game-linkedin)、[queendom](https://github.com/bonesmoses/queendom)。

## 运行

```bash
npm ci
npm test
npm run build
```

用微信开发者工具导入本目录（`compileType: game`），把 `project.config.json` 里的 `appid` 换成你的小游戏 AppID。

## 玩法入口

- 开始游戏：连续闯关，前几关用内置贴纸，之后按成长曲线现场出题
- 每日挑战：按本地日期从 10 道 6×6 静态题里选一题
- 轻点记 ×，短时间内再点同格放猫，滑动连续标记

进度存在本地：`purrdoku.save.v1`、`purrdoku.infinite.v1`。

材料如下：
h5 源码：D:\Github\Purrdoku\h5

参考图: D:\Github\Purrdoku-wx\reference_image

尽量 H5 的配色和气质

请在当前微信小游戏项目中接入一个猫咪短动画资源。

资源文件：
assets/cats/cat-blink.gif

使用要求：

1. 这是一张 4 帧的 PNG 精灵图/帧图，用于棋盘格子里显示猫咪。
2. 不要使用 HTML、CSS、img 标签等 Web 方案。
3. 按当前微信小游戏项目所使用的渲染方式接入：
    - 如果当前项目是 Canvas 2D，则使用小游戏支持的图片资源加载方式绘制；
    - 如果当前项目使用游戏引擎或现有 Sprite 封装，则按项目现有 Sprite/Texture 体系接入。
4. 猫咪动画显示在单个棋盘格正中央。
5. 保持原始宽高比，不拉伸、不裁切。
6. 显示尺寸控制在格子宽高的约 75%~85%，四周留出一点空间。
7. 不改变棋盘原来的区域颜色。
8. 猫咪图片本身有透明背景，绘制时不要额外加白色底。
9. 当某格确认放置猫咪时显示这个动画。
10. 被标记为 × 的格子不显示猫咪。
11. 不要修改现有游戏规则和棋盘逻辑，只替换/增加猫咪显示资源。
12. 如果当前微信小游戏运行环境无法直接播放 GIF，不要强行使用 GIF，
    请把 GIF 拆成 PNG 序列帧或 Sprite Sheet，
    然后使用逐帧动画播放。
13. 动画循环播放，建议 8~12 FPS。
14. 请优先复用项目现有资源加载、缓存、动画管理机制，不要重复造一套。

完成后告诉我：

- 修改了哪些文件
- 如果不能，最终采用的是 PNG 序列帧还是 Sprite Sheet
- 动画帧率和循环方式
