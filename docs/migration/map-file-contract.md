# 地图文件合同（v1）

状态：已确认并已实现 `MAP-001` / `MAP-002` 的本地版本；生产容量与对象存储仍可替换。

## 1. 资源组成

一张可供新任务引用的地图由三份同批次资产组成：

| 文件 | 作用 | 强制校验 |
| --- | --- | --- |
| `map.pcd` | 三维点云源文件；保留上游原始点云 | 扩展名、PCD header、`DATA` 编码：`ascii` / `binary` / `binary_compressed` |
| `map.png` | 8-bit 灰度二维占据栅格及后台预览 | PNG signature、IHDR 宽高 |
| `map.json` | PNG 与 PCD 的配准及坐标语义 | 共享 Zod schema、PNG 宽高一致、空闲阈值小于占用阈值 |

前端消费 PNG 和 JSON；PCD 作为源资产保存并在地图详情显示文件名、编码、大小与校验和。前端不直接解析 PCD。

## 2. `map.json` 最小字段

```json
{
  "formatVersion": 1,
  "resolution": 0.05,
  "origin": { "x": -10, "y": -8, "yaw": 0 },
  "width": 1024,
  "height": 768,
  "frameId": "map",
  "imageAxes": { "x": "right", "y": "down" },
  "occupiedThreshold": 0.65,
  "freeThreshold": 0.2,
  "pcdTransform": {
    "translation": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 }
  }
}
```

`resolution`、`origin`、轴方向和 `pcdTransform` 是后续点位坐标映射的唯一依据；不能从文件名或图片尺寸推断。

## 3. 容量与存储

- 当前本地默认上限：PCD 200 MiB、PNG 20 MiB、JSON 256 KiB。
- 上限通过 `MAP_MAX_PCD_BYTES`、`MAP_MAX_PREVIEW_BYTES`、`MAP_MAX_METADATA_BYTES` 配置；收到产品/运维正式容量后只改环境配置，不改客户端合同。
- 本地 Provider 使用 API 生成的 storage key，目录为 `MAP_STORAGE_ROOT/<mapId>/map.pcd` 和 `map.png`。
- 数据库写入失败时回收临时目录；API 不返回绝对文件系统路径。
- 后续切换对象存储时只替换 Provider，保持 API 和共享合同不变。

## 4. 兼容边界

- 旧 seed 中的历史地图可能只有旧文件名和元数据，没有 PCD/PNG/JSON 三件套；它们可被列表和详情审计，但显示“预览不可用”，不能被当作新上传合同的示例。
- 新上传必须同时提交 `pcd`、`preview`、`metadata` 三个 multipart 字段。
- ROS 上游如果同时保留 `.pgm + .yaml`，由上游转换为 PNG + JSON 后再进入本 API；前端不把 PGM/YAML 作为第二套地图合同。

## 5. 当前接口

| 方法 | 路径 | 状态 |
| --- | --- | --- |
| `GET` | `/api/v1/maps` | 已实现，当前用户范围、cursor 分页 |
| `POST` | `/api/v1/maps` | 已实现，multipart 三件套、格式/大小/配准校验 |
| `GET` | `/api/v1/maps/:mapId` | 已实现，详情、预览能力、引用数 |
| `GET` | `/api/v1/maps/:mapId/preview` | 已实现，账号隔离的 PNG 流 |
| `PATCH` | `/api/v1/maps/:mapId` | 已实现，仅改名，版本冲突返回 `409 VERSION_CONFLICT` |
| `DELETE` | `/api/v1/maps/:mapId` | 已实现；被任务引用返回 `409 RESOURCE_IN_USE` |

