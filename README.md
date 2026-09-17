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
