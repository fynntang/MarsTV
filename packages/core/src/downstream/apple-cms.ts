// ============================================================================
// 苹果 CMS V10 协议适配器
// 搜索:  GET {api}?ac=videolist&wd={keyword}&pg={page}
// 详情:  GET {api}?ac=videolist&ids={id}
// 返回 JSON 形如 { code, msg, list: [...] },每个 item 含 vod_* 字段
// ============================================================================

import type { CmsSource, Episode, PlayLine, VideoDetail, VideoItem } from '../types/index';
import { type FetchJsonOptions, fetchJson } from './fetch-helper';

// ---- 原始 JSON 形状(宽松定义,上游字段可能缺省) ----

interface RawCmsItem {
  vod_id?: number | string;
  vod_name?: string;
  vod_pic?: string;
  type_name?: string;
  vod_year?: string | number;
  vod_area?: string;
  vod_content?: string;
  vod_remarks?: string;
  vod_play_from?: string;
  vod_play_url?: string;
  vod_time?: string;
  [key: string]: unknown;
}

interface RawCmsResponse {
  code?: number;
  msg?: string;
  page?: number;
  pagecount?: number;
  total?: number;
  list?: RawCmsItem[];
}

// ---- 查询构造 ----

function buildSearchUrl(source: CmsSource, keyword: string, page: number): string {
  const url = new URL(source.api);
  url.searchParams.set('ac', 'videolist');
  url.searchParams.set('wd', keyword);
  url.searchParams.set('pg', String(page));
  return url.toString();
}

function buildDetailUrl(source: CmsSource, id: string): string {
  const url = new URL(source.api);
  url.searchParams.set('ac', 'videolist');
  url.searchParams.set('ids', id);
  return url.toString();
}

// ---- 解析 ----

/** 将单个 raw item 转为列表项 VideoItem(不含播放 URL) */
function toVideoItem(raw: RawCmsItem, sourceKey: string): VideoItem | null {
  const id = raw.vod_id;
  const title = raw.vod_name;
  if (id === undefined || id === null || !title) return null;

  return {
    source: sourceKey,
    id: String(id),
    title,
    poster: raw.vod_pic || undefined,
    category: raw.type_name || undefined,
    year: raw.vod_year !== undefined ? String(raw.vod_year) : undefined,
    area: raw.vod_area || undefined,
    desc: raw.vod_content || undefined,
    remarks: raw.vod_remarks || undefined,
  };
}

/**
 * 解析 vod_play_from / vod_play_url 为多条线路。
 *
 * 协议:
 * - vod_play_from 按 "$$$" 分割 → 线路名数组
 * - vod_play_url 按 "$$$" 分割 → 与线路一一对应的段
 * - 每段按 "#" 分集
 * - 每集按 "$" 分为 "集名$URL"(若无 "$" 则整串视为 URL,集名为序号)
 */
export function parsePlayUrl(playFrom: string, playUrl: string): PlayLine[] {
  if (!playUrl) return [];

  const lineNames = (playFrom || '')
    .split('$$$')
    .map((s) => s.trim())
    .filter(Boolean);
  const lineSegments = playUrl.split('$$$');

  const lines: PlayLine[] = [];
  for (let i = 0; i < lineSegments.length; i++) {
    const segment = lineSegments[i];
    if (!segment) continue;

    const episodes: Episode[] = [];
    const parts = segment.split('#');
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      if (!part) continue;
      const dollarIdx = part.indexOf('$');
      if (dollarIdx === -1) {
        episodes.push({ title: `第${j + 1}集`, url: part });
      } else {
        const title = part.slice(0, dollarIdx).trim() || `第${j + 1}集`;
        const url = part.slice(dollarIdx + 1).trim();
        if (url) episodes.push({ title, url });
      }
    }

    if (episodes.length === 0) continue;
    lines.push({
      name: lineNames[i] ?? `线路${i + 1}`,
      episodes,
    });
  }

  return lines;
}

/** 将单个 raw item 转为详情 VideoDetail(含线路与集数) */
function toVideoDetail(raw: RawCmsItem, sourceKey: string): VideoDetail | null {
  const base = toVideoItem(raw, sourceKey);
  if (!base) return null;
  const lines = parsePlayUrl(raw.vod_play_from ?? '', raw.vod_play_url ?? '');
  return { ...base, lines, updateTime: raw.vod_time || undefined };
}

// ---- 高层 API ----

export interface SearchResult {
  source: string;
  items: VideoItem[];
  page: number;
  pageCount: number;
  total: number;
}

/** 搜索单个源 */
export async function searchSource(
  source: CmsSource,
  keyword: string,
  page = 1,
  options: FetchJsonOptions = {},
): Promise<SearchResult> {
  const url = buildSearchUrl(source, keyword, page);
  const data = await fetchJson<RawCmsResponse>(url, options);

  if (data.code !== undefined && data.code !== 1 && data.code !== 200) {
    throw new Error(`CMS source "${source.key}" returned code=${data.code}: ${data.msg ?? ''}`);
  }

  const items = (data.list ?? [])
    .map((r) => toVideoItem(r, source.key))
    .filter((x): x is VideoItem => x !== null);

  return {
    source: source.key,
    items,
    page: data.page ?? page,
    pageCount: data.pagecount ?? 1,
    total: data.total ?? items.length,
  };
}

/** 拉取单个视频详情(含播放 URL) */
export async function getDetail(
  source: CmsSource,
  id: string,
  options: FetchJsonOptions = {},
): Promise<VideoDetail | null> {
  const url = buildDetailUrl(source, id);
  const data = await fetchJson<RawCmsResponse>(url, options);
  const raw = data.list?.[0];
  if (!raw) return null;
  return toVideoDetail(raw, source.key);
}

/**
 * 搜索结果通常已包含 vod_play_url;若源返回了完整详情,直接从搜索结果构造 detail
 * 比再发一次 /detail 请求更快。给 /api/search 可选的"顺手带详情"能力。
 */
export function tryDetailFromSearchItem(raw: RawCmsItem, sourceKey: string): VideoDetail | null {
  if (!raw.vod_play_url) return null;
  return toVideoDetail(raw, sourceKey);
}
