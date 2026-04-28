// ============================================================================
// Apple CMS V10 协议相关类型
// 参考:LunaTV src/lib/downstream.ts、LibreTV js/api.js
// ============================================================================

/** CMS 源站配置 */
export interface CmsSource {
  /** 唯一标识,例如 "heimuer" */
  key: string;
  /** 显示名称 */
  name: string;
  /** API 根,例如 "https://example.com/api.php/provide/vod" */
  api: string;
  /** 详情页根,用于 HTML 降级解析(可选) */
  detail?: string;
  /** 是否为成人内容源 */
  adult?: boolean;
  /** 默认是否启用 */
  enabled?: boolean;
}

/** 列表项(搜索结果卡片) */
export interface VideoItem {
  /** 源 key */
  source: string;
  /** 视频在该源的 ID(vod_id) */
  id: string;
  /** 名称 */
  title: string;
  /** 封面 */
  poster?: string;
  /** 类型/分类 */
  category?: string;
  /** 年份 */
  year?: string;
  /** 地区 */
  area?: string;
  /** 简介 */
  desc?: string;
  /** 最新集/备注 */
  remarks?: string;
  /** 豆瓣评分(如能匹配) */
  rating?: number;
}

/** 单集播放信息 */
export interface Episode {
  title: string;
  url: string;
}

/** 同一视频的一条线路(来自 vod_play_url 的 $$$ 分段) */
export interface PlayLine {
  /** 线路名,来自 vod_play_from */
  name: string;
  episodes: Episode[];
}

/** 视频详情 */
export interface VideoDetail extends VideoItem {
  lines: PlayLine[];
  updateTime?: string;
}

/** 播放源测速结果 */
export interface SpeedTestResult {
  source: string;
  line: string;
  /** 首片耗时 ms,-1 表示失败 */
  firstChunkMs: number;
  /** 估算码率 kbps,0 表示未知 */
  bitrateKbps: number;
  /** 综合评分 0-100 */
  score: number;
}
