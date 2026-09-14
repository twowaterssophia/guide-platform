# Skill Library API 接口文档



设计依据：`docs/技能库方案.md` 和 `docs/技能库AI图标生成方案.md`。本文只描述接口契约，实现细节和不变量以方案文档为准。



## 基础信息



- **Base URL**: `/api/v1/skill-library`

- **Content\-Type**: `application/json`

- **认证方式**: 全部接口 `IsAuthenticated`（项目现有 JWT）

- **owner 隔离**: 所有查询均带 `owner=request.user`；不属于当前用户时返回 404，避免泄露资源是否存在

## 通用响应格式



```JSON
{
  "code": 0,
  "message": "Success",
  "data": null,
  "request_id": "req-20260720-0001"
}
```



分页接口 `data` 为 `{"list": [...], "pagination": {...}}`，`page_size` 最大 100。

下文各接口的“响应 `data` 示例”只展示通用响应包装中的 `data` 字段；`code`、`message` 和 `request_id` 与上述通用格式一致。



## 标识说明



|名称|说明|
|---|---|
|`skill_id`|服务端唯一认可的 Skill 标识（`UserSkill.id`）|
|`package_id`|一次整包上传；copy/build 来源的 Package 不对客户端暴露|
|`file_upload_id`|一次待提交的包内文件上传|
|`version`|派生自 `current_version.version`，同时是客户端乐观锁值；初次上传激活前为 `null`|
|`manifest_id`|`manifest.id` 的只读非唯一投影，可为 `null`，**不可**用作更新路由或唯一键|



## 统一技能列表项



列表、上传状态、PATCH 和复制响应使用同一结构：



```JSON
{
  "skill_id": 88,
  "manifest_id": "com.boosterobotics.skill.cheer",
  "name": "双手欢呼",
  "locale_name": {"en": "Cheer", "zh": "双手欢呼"},
  "icon_filename": "icon.png",
  "icon_url": "https://cdn.example.com/signed-icon-url",
  "description": "双手举过头顶左右摇摆的欢呼动作。",
  "skill_type": "robot_api",
  "capability_type": "action",
  "robot_models": ["Booster T1", "Booster K1"],
  "status": "active",
  "version": 3,
  "created_at": "2026-07-20T10:00:00Z",
  "updated_at": "2026-07-20T10:10:00Z"
}
```



- `name` 只读，按 `Accept-Language` 从 `locale_name` 解析，回退到 `en` 再回退到第一个非空名称；编辑器请使用完整 `locale_name`。

- `icon_filename` 是 `manifest.icon` 的原始值。激活后 `""` 表示技能没有图标，此时 `icon_url` 也是 `""`；非空值是可能含子目录的包内相对路径，替换图标时必须把该值原样作为 FileUpload 的 `archive_path`，不要从 `icon_url` 猜路径。尚未激活时 `icon_filename` 为 `null`。

- `updated_at` 取 `current_version.created_at`，未激活时回退到技能创建时间。懒打包完成不会改变它或列表排序。

- 响应**不包含** `options`、下载制品版本、构建状态或就绪布尔值。`options` 只在详情接口返回，避免列表响应随任意客户端配置膨胀。需要文件时直接调 download：200 表示可下载，202 表示后端在准备。

## 接口总览



|功能|方法与路径|
|---|---|
|申请整包上传|`POST /uploads`|
|查询整包上传状态|`GET /uploads/{package_id}`|
|查询技能列表|`GET /skills`|
|查询技能详情|`GET /skills/{skill_id}`|
|申请包内文件上传|`POST /skills/{skill_id}/file-uploads`|
|编辑技能|`PATCH /skills/{skill_id}`|
|云端复制|`POST /skills/{skill_id}/copy`|
|删除技能|`DELETE /skills/{skill_id}`|
|下载技能|`GET /skills/{skill_id}/download`|
|生成 AI 图标|`POST /ai-icons/generations`|



完整 `.skill` 上传只用于首次创建 Skill。已有 Skill 没有整包上传入口（`POST /skills/{id}/uploads` 不存在），后续内容变更统一走 file\-uploads \+ PATCH。



## 1\. 申请整包上传



`POST /uploads`



请求：



```JSON
{"content_md5": "1B2M2Y8AsgTpgAmY7PhCfg==", "size_bytes": 1048576}
```



响应 `data`：



```JSON
{
  "skill_id": 88,
  "package_id": 1024,
  "target_version": 1,
  "upload_method": "PUT",
  "upload_url": "https://bucket.oss-cn-hangzhou.aliyuncs.com/skill_library/uploads/...skill?x-oss-signature-version=OSS4-HMAC-SHA256&...",
  "upload_headers": {
    "Content-Length": "1048576",
    "Content-MD5": "1B2M2Y8AsgTpgAmY7PhCfg==",
    "Content-Type": "application/octet-stream",
    "x-oss-forbid-overwrite": "true"
  },
  "expires_in": 900
}
```



客户端必须对 `upload_url` 执行 PUT，并原样携带全部 `upload_headers`；不得修改签名绑定的大小、MD5、Content\-Type 或禁止覆盖请求头，也不要给 OSS 请求加 JWT。凭证过期后重新申请，不能复用旧 URL。



上传被 OSS 拒绝时不会触发校验，Package 由过期任务转为 `expired`。



`size_bytes` 受首次上传压缩包大小硬限制（当前默认 100 MiB）。FC 还会检查完整 ZIP 的成员数、单文件大小和解压总大小；不设置单成员压缩比限制。



包内 `manifest.json` 的 `options` 是可选的。存在时必须是合法 JSON object，不设置 options 专项大小或嵌套限制；不合法会让整包校验落为 `manifest_error`，缺失时详情接口返回 `{}`。



FC 先执行 ZIP、`icon` 字段和 `options` object 预检，再把完整 Manifest 上报 Django。`icon` 必须存在且为字符串；精确空字符串表示无图标，非空时只校验包内引用和 5 MiB 大小，不校验图片后缀或内容。FC 与 Django 都不校验 `schema_version` 或 `payload`；Version 投影字段由 Django 在激活事务中处理，`type`、`capability_type` 和机型名称不使用固定枚举白名单。



### curl 示例



以下 Bash 示例依赖 `curl`、`openssl` 和 `jq`。先计算 `.skill` 文件的 Base64 MD5 和字节数，再向 Django 申请上传凭证：



```Bash
API_BASE_URL="https://api.example.com/api/v1/skill-library"
TOKEN="<JWT>"
SKILL_FILE="./cheer.skill"
SKILL_MD5="$(openssl dgst -md5 -binary "${SKILL_FILE}" | openssl base64 -A)"
SKILL_SIZE="$(wc -c < "${SKILL_FILE}" | tr -d '[:space:]')"

CREATE_RESPONSE="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE_URL}/uploads" \
    --header "Authorization: Bearer ${TOKEN}" \
    --header "Content-Type: application/json" \
    --data "$(jq -nc \
      --arg content_md5 "${SKILL_MD5}" \
      --argjson size_bytes "${SKILL_SIZE}" \
      '{content_md5: $content_md5, size_bytes: $size_bytes}')"
)"
```



使用响应中的 `upload_url` 和全部 `upload_headers` 向 OSS 上传文件字节。OSS 请求不携带 Django JWT：



```Bash
curl --fail-with-body --silent --show-error \
  --request PUT "$(jq -r '.data.upload_url' <<< "${CREATE_RESPONSE}")" \
  --header "Content-Length: $(jq -r '.data.upload_headers["Content-Length"]' <<< "${CREATE_RESPONSE}")" \
  --header "Content-MD5: $(jq -r '.data.upload_headers["Content-MD5"]' <<< "${CREATE_RESPONSE}")" \
  --header "Content-Type: $(jq -r '.data.upload_headers["Content-Type"]' <<< "${CREATE_RESPONSE}")" \
  --header "x-oss-forbid-overwrite: $(jq -r '.data.upload_headers["x-oss-forbid-overwrite"]' <<< "${CREATE_RESPONSE}")" \
  --data-binary "@${SKILL_FILE}"
```



OSS 上传成功后，使用 `CREATE_RESPONSE` 中的 `package_id` 调用第 2 节状态接口，等待 FC 校验完成。



## 2\. 查询整包上传状态



`GET /uploads/{package_id}`



响应 `data` 示例：



```JSON
{
  "package_id": 1024,
  "skill_id": 88,
  "source": "upload",
  "target_version": 1,
  "verify_status": "verified",
  "error_code": "",
  "error_detail": "",
  "skill": {
    "skill_id": 88,
    "manifest_id": "com.boosterobotics.skill.cheer",
    "name": "双手欢呼",
    "locale_name": {"en": "Cheer", "zh": "双手欢呼"},
    "icon_filename": "icon.png",
    "icon_url": "https://cdn.example.com/signed-icon-url",
    "description": "双手举过头顶左右摇摆的欢呼动作。",
    "skill_type": "robot_api",
    "capability_type": "action",
    "robot_models": ["Booster T1", "Booster K1"],
    "status": "active",
    "version": 1,
    "created_at": "2026-07-20T10:00:00Z",
    "updated_at": "2026-07-20T10:00:10Z"
  }
}
```



`verify_status` 枚举：非终态 `pending`/`processing`；终态 `verified`、`invalid_zip`、`manifest_error`、`md5_mismatch`、`size_mismatch`、`expired`、`failed`。



只能查询自己通过第 1 节创建的 `source=upload` Package；内部 copy/build Package 即使猜到 ID 也返回 404。Manifest 尚未解析时 `version`、`manifest_id`、`icon_filename` 为 `null`。



## 3\. 查询技能列表



`GET /skills`



参数：`page`、`page_size`、`skill_type`、`capability_type`、`robot_model`、`search`（匹配名称和描述）。`robot_model` 筛选也会返回 `robot_models=[]` 的技能，因为空数组表示支持所有机型。



列表始终只返回当前用户未删除的 `active` 技能；`processing` 和 `failed` 不返回，首次上传进度与失败原因通过 `GET /uploads/{package_id}` 查询。其他筛选均针对 `current_version`，不回退到历史版本。默认排序 `-updated_at, -skill_id`。



响应 `data` 示例：



```JSON
{
  "list": [
    {
      "skill_id": 88,
      "manifest_id": "com.boosterobotics.skill.cheer",
      "name": "双手欢呼",
      "locale_name": {"en": "Cheer", "zh": "双手欢呼"},
      "icon_filename": "icon.png",
      "icon_url": "https://cdn.example.com/signed-icon-url",
      "description": "双手举过头顶左右摇摆的欢呼动作。",
      "skill_type": "robot_api",
      "capability_type": "action",
      "robot_models": ["Booster T1", "Booster K1"],
      "status": "active",
      "version": 3,
      "created_at": "2026-07-20T10:00:00Z",
      "updated_at": "2026-07-20T10:10:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```



## 4\. 查询技能详情



`GET /skills/{skill_id}`



响应 `data` 为统一技能项加上当前版本的完整 `options`：



```JSON
{
  "skill_id": 88,
  "manifest_id": "com.boosterobotics.skill.cheer",
  "name": "双手欢呼",
  "locale_name": {"en": "Cheer", "zh": "双手欢呼"},
  "icon_filename": "icon.png",
  "icon_url": "https://cdn.example.com/signed-icon-url",
  "description": "双手举过头顶左右摇摆的欢呼动作。",
  "skill_type": "robot_api",
  "capability_type": "action",
  "robot_models": ["Booster T1", "Booster K1"],
  "options": {
    "total_running_time_ms": {"Booster T1": 12000, "Booster K1": 12000},
    "new_feature": {"enabled": true}
  },
  "status": "active",
  "version": 3,
  "created_at": "2026-07-20T10:00:00Z",
  "updated_at": "2026-07-20T10:10:00Z"
}
```



- `options` 是客户端扩展配置。服务端不解释其中的键和值，也不把任何字符串当作包内路径或 OSS Key。

- 初始上传尚未激活（没有当前版本）时返回 `SKILL_NOT_READY`；已激活但初始 Manifest 没有 `options` 时返回 `{}`。

- 其他用户的 `skill_id` 与已删除记录一律返回 `SKILL_NOT_FOUND`。

- 编辑前先读详情拿到 `version` 和 `options`，在本地改完后把**完整** `options` 和同一个 `version` 作为 `expected_version` 提交。

## 5\. 申请包内文件上传



`POST /skills/{skill_id}/file-uploads`



请求：



```JSON
{
  "expected_version": 3,
  "files": [
    {
      "archive_path": "payload/motions/arms/part-01.json",
      "content_type": "application/json",
      "content_md5": "1B2M2Y8AsgTpgAmY7PhCfg==",
      "size_bytes": 524288
    }
  ]
}
```



- `files` 必须为 1\.\.20 项；单文件就是长度为 1 的数组，没有另一套单文件接口。

- 规范化后路径重复、任一元数据非法、或任一路径为根目录 `manifest.json` 时整批失败，不创建任何记录。

- `archive_path` 是唯一允许客户端声明的包内目标；服务端规范化后保存并原样回传。禁止空路径、绝对路径、`..`、反斜杠、NUL、超长/超深路径。

- `expected_version` 必须等于当前 `version`。

- 当前 `icon_filename` 非空且 `archive_path` 与其相等时，文件不得超过 5 MiB；服务端不检查图片后缀、`content_type` 与后缀是否匹配，也不解析图片内容。当前 `icon_filename=""` 时没有可替换的图标路径；普通编辑不能把它改成非空。

- 此接口只按每项检查单文件上限，不把一批临时文件大小之和当作 `.skill` 压缩包大小。完整 Version 的解压总量和成员数在 PATCH 提交时统一检查。

响应 `data` 示例：



```JSON
{
  "base_version": 3,
  "upload_method": "PUT",
  "expires_in": 900,
  "uploads": [
    {
      "file_upload_id": 301,
      "archive_path": "payload/motions/arms/part-01.json",
      "upload_url": "https://bucket.oss-cn-hangzhou.aliyuncs.com/skill_library/file_uploads/...?...",
      "upload_headers": {
        "Content-Length": "524288",
        "Content-MD5": "1B2M2Y8AsgTpgAmY7PhCfg==",
        "Content-Type": "application/json",
        "x-oss-forbid-overwrite": "true"
      }
    }
  ]
}
```



每个文件是独立 OSS 对象和独立 V4 签名 URL，可并行上传。



服务端不校验图片后缀或解码图片，也不校验 JSON 或动作帧 schema；图标只检查文件大小。未提交的记录到期只转 `expired`，对象本期保留。没有单独的文件上传状态查询接口。



### curl 示例



以单文件为例；批量场景在 `files` 中放入最多 20 项：



```Bash
API_BASE_URL="https://api.example.com/api/v1/skill-library"
TOKEN="<JWT>"
SKILL_ID=88
EXPECTED_VERSION=3
EDIT_FILE="./part-01.json"
EDIT_MD5="$(openssl dgst -md5 -binary "${EDIT_FILE}" | openssl base64 -A)"
EDIT_SIZE="$(wc -c < "${EDIT_FILE}" | tr -d '[:space:]')"

FILE_UPLOAD_RESPONSE="$(
  curl --fail-with-body --silent --show-error \
    --request POST "${API_BASE_URL}/skills/${SKILL_ID}/file-uploads" \
    --header "Authorization: Bearer ${TOKEN}" \
    --header "Content-Type: application/json" \
    --data "$(jq -nc \
      --argjson expected_version "${EXPECTED_VERSION}" \
      --arg content_md5 "${EDIT_MD5}" \
      --argjson size_bytes "${EDIT_SIZE}" \
      '{expected_version: $expected_version, files: [{archive_path: "payload/motions/arms/part-01.json", content_type: "application/json", content_md5: $content_md5, size_bytes: $size_bytes}]}')"
)"
```



对 `uploads[]` 中的每项分别执行 OSS PUT，可以并行。以第一项为例：



```Bash
FILE_UPLOAD_HEADERS="$(jq -c '.data.uploads[0].upload_headers' <<< "${FILE_UPLOAD_RESPONSE}")"

curl --fail-with-body --silent --show-error \
  --request PUT "$(jq -r '.data.uploads[0].upload_url' <<< "${FILE_UPLOAD_RESPONSE}")" \
  --header "Content-Length: $(jq -r '.["Content-Length"]' <<< "${FILE_UPLOAD_HEADERS}")" \
  --header "Content-MD5: $(jq -r '.["Content-MD5"]' <<< "${FILE_UPLOAD_HEADERS}")" \
  --header "Content-Type: $(jq -r '.["Content-Type"]' <<< "${FILE_UPLOAD_HEADERS}")" \
  --header "x-oss-forbid-overwrite: $(jq -r '.["x-oss-forbid-overwrite"]' <<< "${FILE_UPLOAD_HEADERS}")" \
  --data-binary "@${EDIT_FILE}"
```



全部计划提交的文件上传成功后，把各项 `file_upload_id` 放入第 6 节 PATCH 请求的 `file_upload_ids`。



## 6\. 编辑技能



`PATCH /skills/{skill_id}`



请求：



```JSON
{
  "expected_version": 3,
  "locale_name": {"en": "Big Cheer", "zh": "大力欢呼"},
  "options": {"total_running_time_ms": {"Booster T1": 15000}},
  "file_upload_ids": [301, 302],
  "delete_paths": ["payload/legacy/old-motion.json"]
}
```



除 `expected_version` 外均可选，但至少要有一项实际变更。语义与限制：



- `options` 是**整体替换**，不做 JSON Merge Patch 或递归合并：省略表示保持不变，`{}` 表示清空，显式 `null` 或非 object 返回 400。要改一个键就得提交完整对象。

- `options` 不设置专项大小或嵌套限制；键必须是字符串，不允许 NaN、Infinity 或其他非 JSON 值。

- FileUpload 表示 upsert：目标路径已存在则覆盖，不存在则新增。`delete_paths` 留下删除墓碑；重命名 = 旧路径 delete \+ 新路径 upsert。

- 单次最多变更 20 个**不同**文件路径（upsert 路径与 delete 路径合并计数，名称不计入）。多批申请也不能绕过该上限。

- 同一路径不能同时 upsert 和 delete；必须拒绝 `manifest.json`。

- `manifest.icon` 非空时，删除它当前引用的文件会被拒绝，替换图标请直接 upsert 同一路径。`manifest.icon=""` 时没有受保护的图标路径；payload 和其他文件可正常删除，删除不存在的路径按幂等处理。

- 覆盖非空的当前图标路径只更新新版本的 `icon_key`；兼容机型、类型、描述等 Manifest 派生字段保持不变。普通编辑不能修改 Manifest，因此不能把 `icon` 从空改为非空或反向修改。

- `locale_name` 只进入新版本的名称快照，`options` 只替换新版本 Manifest 快照中的同名成员；两者都不会让客户端直接上传或覆盖 `manifest.json`。名称、`options` 和文件何时进入 `.skill` 字节由后续 download 触发的懒打包决定。

- 服务端在同一事务中根据当前基包成员大小映射、已有覆盖层、本次增删改和最终 Manifest 字节数核算完整包。最终解压总量、单文件大小或成员数超限时返回 `SKILL_PACKAGE_SIZE_LIMIT_EXCEEDED`；不创建新 Version、不消费 FileUpload，也不切换当前版本。

同一次 PATCH 的名称、`options` 与多文件变更只产生一个 version，且不创建下载制品。响应返回新的统一技能项（**不含** `options`，需要回读请调详情接口）。



响应 `data` 示例：



```JSON
{
  "skill_id": 88,
  "manifest_id": "com.boosterobotics.skill.cheer",
  "name": "大力欢呼",
  "locale_name": {"en": "Big Cheer", "zh": "大力欢呼"},
  "icon_filename": "icon.png",
  "icon_url": "https://cdn.example.com/signed-icon-url",
  "description": "双手举过头顶左右摇摆的欢呼动作。",
  "skill_type": "robot_api",
  "capability_type": "action",
  "robot_models": ["Booster T1", "Booster K1"],
  "status": "active",
  "version": 4,
  "created_at": "2026-07-20T10:00:00Z",
  "updated_at": "2026-07-20T10:20:00Z"
}
```



错误码：`expected_version` 不匹配返回 409 `SKILL_VERSION_CONFLICT`；对象尚未上传完成返回 `SKILL_FILE_NOT_READY`；大小或 Content\-Type 不匹配返回 `SKILL_FILE_INVALID`。以上情况都不消费任何 FileUpload。



## 7\. 云端复制



`POST /skills/{skill_id}/copy`



复制完全在云端完成，客户端不需要下载后重新上传。



- 只能复制自己拥有、已激活且未删除的技能；源技能下载制品是否就绪不影响复制。

- 中文 locale 名追加 `_副本`，英文和其他语言追加 `_copy`；超过 128 字符时先截断原名称。

- 目标技能拥有独立基包和独立文件对象，不引用源技能的任何 OSS 对象。`manifest_id` 和 `icon_filename` 与源相同，重复值不影响隔离与路由；源技能无图标时不复制图标对象。

- 全部对象和 Version 1 提交成功后才返回，不需要轮询额外状态。响应即统一技能项，`version=1`、`status=active`。

- 源技能的 `options` 原样克隆到目标技能。

- 复制后的包内 Manifest 仍是原名称，首次 download 会通过懒打包写入副本名称。

响应 `data` 示例：



```JSON
{
  "skill_id": 89,
  "manifest_id": "com.boosterobotics.skill.cheer",
  "name": "双手欢呼_副本",
  "locale_name": {"en": "Cheer_copy", "zh": "双手欢呼_副本"},
  "icon_filename": "icon.png",
  "icon_url": "https://cdn.example.com/signed-copy-icon-url",
  "description": "双手举过头顶左右摇摆的欢呼动作。",
  "skill_type": "robot_api",
  "capability_type": "action",
  "robot_models": ["Booster T1", "Booster K1"],
  "status": "active",
  "version": 1,
  "created_at": "2026-07-20T10:30:00Z",
  "updated_at": "2026-07-20T10:30:00Z"
}
```



## 8\. 删除技能



`DELETE /skills/{skill_id}`



按 `skill_id` 幂等：查不到自己的记录时同样返回成功，因此重复删除和其他用户的 `skill_id` 都不会泄露资源是否存在。删除后列表、编辑、复制和下载均返回 404。



本期只写软删除标记并把未完成的 Package 标为失败，不删除任何数据库记录或 OSS 对象。



响应 `data` 示例：



```JSON
null
```



## 9\. 下载技能



`GET /skills/{skill_id}/download`



可选参数 `robot_model`：`current_version.robot_models` 非空且不包含传入机型时返回 `SKILL_ROBOT_MODEL_INCOMPATIBLE`；空数组表示支持所有机型。尚未激活的技能返回 `SKILL_NOT_READY`。



制品就绪时返回 HTTP 200：



```JSON
{
  "skill_id": 88,
  "version": 3,
  "content_md5": "1B2M2Y8AsgTpgAmY7PhCfg==",
  "size_bytes": 1048576,
  "download_url": "https://bucket.oss...&Signature=...",
  "expires_in": 900
}
```



制品缺失或落后于当前版本时返回 HTTP 202，并幂等触发一次后台构建：



```JSON
{"skill_id": 88, "version": 4, "status": "preparing", "retry_after": 2}
```



`retry_after` 单位为秒。客户端按该值重试同一个 download 接口即可，不感知内部 Package、attempt 或构建状态；构建失败时下一次 download 会自动重试，`version` 不变。



Django 不中转文件流。**客户端必须在文件进入本地技能库前同时校验 ****`size_bytes`**** 和 Base64 ****`content_md5`**，校验失败则丢弃；ETag 不作为内容校验值。



## 10\. 生成 AI 图标



`POST /ai-icons/generations`



请求：



```JSON
{"skill_name": "双手欢呼"}
```



`skill_name` 必传，类型为字符串，允许空字符串，最长 128 个 Unicode 字符。为空时由提示词模板的固定内容兜底。客户端不能指定模型、提示词、参考图、输出数量或输出规格。



服务端通过 ASGI 等待百炼同步生成。成功时返回 HTTP 200，响应 `data`：



```JSON
{
  "generation_id": 123,
  "status": "succeeded",
  "images": [{"url": "https://dashscope-result.example/generated.png?..."}],
  "expires_at": 1785750000,
  "daily_limit": 100,
  "daily_remaining": 99
}
```



百炼明确返回失败时，同一次请求返回 HTTP 200，响应 `data`：



```JSON
{
  "generation_id": 123,
  "status": "failed",
  "error_code": "InvalidParameter",
  "detail": "图标生成失败，请稍后重试",
  "daily_limit": 100,
  "daily_remaining": 99
}
```



每次 POST 都是一次新的生成，会创建新记录、占用一次每日额度，并可能产生一次新的百炼费用。客户端应在请求结束前禁用生成按钮。生成成功、明确失败或请求结果不确定都计入当日次数；参数校验失败不计数。达到每日限额返回 HTTP 429，`data.reason=daily_limit_exceeded`。



服务端等待百炼的默认超时为 90 秒。网络超时后，本地记录为 `failed`、`error_code=provider_timeout_unknown`，表示无法确认百炼是否已经生成或计费；客户端再次 POST 会开始一次新的生成。



百炼结果 URL 是临时地址，预计约 24 小时失效。服务端不下载图片，也不复制到自己的 OSS；客户端应及时下载，新建技能时写入本地 `.skill`，修改已有技能时走第 5、6 节的文件上传与 PATCH。



## 错误码



|错误码|值|说明|
|---|---|---|
|`SKILL_NOT_FOUND`|40601|技能不存在或不属于当前用户|
|`SKILL_NOT_READY`|40602|技能尚未激活|
|`SKILL_UPLOAD_EXPIRED`|40603|上传凭证已过期|
|`SKILL_MD5_MISMATCH`|40604|包内容 MD5 不一致|
|`SKILL_PACKAGE_INVALID`|40605|`.skill` 包非法|
|`SKILL_STORAGE_QUOTA_EXCEEDED`|40606|技能数量或存储配额超限|
|`SKILL_ROBOT_MODEL_INCOMPATIBLE`|40607|机型不兼容|
|`SKILL_VERSION_CONFLICT`|40608|版本冲突，请刷新重试|
|`SKILL_FILE_INVALID`|40609|上传文件元数据不匹配|
|`SKILL_FILE_NOT_READY`|40610|上传文件尚未就绪|
|`SKILL_FILE_PATH_FORBIDDEN`|40611|包内路径非法或为保留路径|
|`SKILL_FILE_CHANGE_LIMIT_EXCEEDED`|40612|单次变更文件数超限|
|`SKILL_INTERNAL_SIGNATURE_INVALID`|40613|内部服务签名无效|
|`SKILL_PACKAGE_SIZE_LIMIT_EXCEEDED`|40614|修改后的完整包解压总量或成员数超限|
|`SKILL_PROCESSING_TIMEOUT`|50101|整包校验超时|
|`SKILL_PACKAGE_BUILD_FAILED`|50102|下载制品构建失败|
|`SKILL_BUILD_TIMEOUT`|50103|下载制品构建超时|
|`SKILL_COPY_FAILED`|50104|云端复制失败|
|`SKILL_COPY_TIMEOUT`|50105|云端复制超时|



## 内部 FC 接口



以下接口不对客户端开放，由网关限制为 VPC/内网来源，并强制服务级 HMAC：



```Plain Text
POST /internal/skill-library/packages/{package_id}/processing
POST /internal/skill-library/packages/{package_id}/callback
```



请求头 `X-Skill-FC-Timestamp`、`X-Skill-FC-Event-Id`、`X-Skill-FC-Signature`；签名内容为 `timestamp\nMETHOD\npath\nsha256(body)`，密钥由 `SKILL_INTERNAL_HMAC_SECRET` 提供（未配置时一律拒绝）。详见方案第八章。



### Processing 响应



抢占成功时的响应 `data` 示例：



```JSON
{
  "claimed": true,
  "verify_status": "processing",
  "expected_object_key": "skill_library/uploads/4443567430724b5c9f260d85a8ddd5e9/88/1024/edc88897-6feb-4d67-b9d0-e01009d62678.skill",
  "expected_size": 1048576,
  "expected_md5": "1B2M2Y8AsgTpgAmY7PhCfg==",
  "extracted_prefix": "skill_library/extracted/4443567430724b5c9f260d85a8ddd5e9/88/1024/edc88897-6feb-4d67-b9d0-e01009d62678/",
  "validation_policy": {
    "version": 1,
    "archive": {
      "max_package_bytes": 104857600,
      "max_entry_count": 1000,
      "max_total_uncompressed_bytes": 209715200,
      "max_file_bytes": 104857600,
      "max_path_length": 512,
      "max_path_depth": 20
    },
    "manifest": {"max_bytes": 1048576},
    "icon": {"max_bytes": 5242880}
  }
}
```



`validation_policy` 只在 `claimed=true` 时返回。FC 对每个字段按“Claim 值 \> FC 同名环境变量 \> 共享代码默认值”解析；Claim 中缺少整个策略、分区或字段时逐项回退。已出现但非法的值、非法分区或未知版本属于 processing 契约错误，不能静默回退。未抢到时只返回 `claimed=false` 和当前 `verify_status`，FC 必须直接结束，不再读取 OSS 或上报 callback。



### Callback 响应



成功 callback 请求必须携带完整 `archive_entry_sizes`（规范包内路径到未压缩字节数），且必须包含根目录 `manifest.json`。Django 会按当前成员数、单文件和解压总量限制再次校验，并用它初始化 Package 成员映射与 Version 容量账本；终态幂等比较也包含该映射。



首次成功激活时的响应 `data` 示例：



```JSON
{
  "already_processed": false,
  "verify_status": "verified",
  "skill_version_id": 501
}
```



对已保存的相同终态结果重复回调时，返回 `already_processed=true`；与已保存终态不一致时返回 409。

Django 在激活阶段仍可能因名称、机型、非法图标字段或投影字符串长度非法而返回 `verify_status=manifest_error`。图标字段精确为 `""` 时合法，并激活为 `icon_filename=""`、`icon_url=""`，不会创建图标 VersionFile。`type`、`description`、`meta.capability_type` 无法投影时使用空字符串并记录 warning，不会仅因类型或缺失阻断激活。FC 必须以 callback 返回状态为最终结果，不能继续报告为 `verified`。

