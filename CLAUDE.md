# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个用于台湾诊所HIS（医院信息系统）数据迁移的Node.js ETL项目。主要功能是将传统HIS数据库格式（DBF、Access、固定宽度TXT等）转换为标准化格式（JSON、CSV、XML），然后加载到PostgreSQL数据库。

## 开发命令

```bash
# 启动ETL处理流程
npm start

# 开发模式启动（需要安装nodemon）
npm run dev

# 启动文件合并Web服务器
node server.js

# 安装依赖
npm install
```

## 架构概述

### 核心模块结构
- **src/index.js** - 主ETL处理流程，处理XML数据转换和数据库插入
- **src/config.js** - 配置文件，包含数据库连接和路径设置
- **server.js** - Web服务器，提供文件合并功能

### 数据加载器 (loaders/)
- **xmlLoader.js** - 加载和解析Big5编码的XML文件
- **dbfLoader.js** - （计划中）DBF文件加载器

### 服务层 (services/)
- **postgresService.js** - PostgreSQL数据库操作服务
- **stateService.js** - （计划中）状态管理服务

### 工具类 (utils/)
- **logger.js** - 日志记录工具

### 数据转换器 (transformers/)
- **toJSON.js** - （计划中）数据转换工具

## 数据流
1. 从 `data/input/` 读取源文件（XML、DBF等）
2. 通过相应的加载器解析数据
3. 转换为标准化JSON格式
4. 插入到PostgreSQL数据库的相应表中
5. 输出文件保存到 `data/output/`

## 数据库表结构
基于 `docs/DATA_MAPPING.md` 的数据映射：
- `patients` - 病患基本资料表
- `visits` - 就诊纪录表  
- `diagnoses` - 诊断纪录表
- `prescriptions` - 处方纪录表

## 环境配置
项目使用 `.env` 文件配置数据库连接：
```
PG_USER=clinic_user
PG_HOST=localhost
PG_DATABASE=clinic_data
PG_PASSWORD=password123
PG_PORT=5432
INPUT_PATH=./data/input/
OUTPUT_PATH=./data/output/
```

## 文件合并功能
通过 `server.js` 提供Web界面，可以上传多个ZIP文件，自动提取并合并其中的XML文件，支持Big5编码处理。