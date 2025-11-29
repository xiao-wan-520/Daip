import { ServerConfig } from './types';

export const SERVER_LIST: ServerConfig[] = [
  { id: 'srv-1', name: '主服务器 (Main)', address: '192.168.1.100:3000' },
  { id: 'srv-2', name: '备用服务器 (Backup)', address: '192.168.1.101:3000' },
  { id: 'srv-3', name: '测试节点 (Test)', address: '127.0.0.1:8080' },
];

export const AI_CONFIG = {
  API_KEY: 'sk-xfcjbrcrqqqitqdpuxndrmdgctbyonqogpahseoqosapzcxl',
  BASE_URL: 'https://api.siliconflow.cn/v1/chat/completions',
  MODEL: 'Qwen/Qwen2.5-7B-Instruct',
  BOT_NAME: '川小农',
  BOT_AVATAR: 'https://picsum.photos/id/64/200/200', // Specialized avatar for the bot
};

export const MOVIE_BOT_CONFIG = {
  NAME: '电影助手',
  AVATAR: 'https://picsum.photos/id/452/200/200', // Retro items/projector vibe
};

// 使用 xmflv 解析接口，它对 HTTPS 和 CORS 支持更好
export const VIDEO_PARSER_URL = 'https://jx.xmflv.com/?url=';

export const BROADCAST_CHANNEL_NAME = 'daip_chat_channel';