/** 任务类型：翻译或解释。 */
export type TaskKind = 'translate' | 'explain';

/** 货币单位。 */
export type Currency = 'CNY' | 'USD';

/** 一套第三方 OpenAI 兼容 API 配置。 */
export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  translateModel: string;
  explainModel: string;
}

/** 单个模型的百万 token 单价。 */
export interface ModelPrice {
  id: string;
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  currency: Currency;
}

/** 一次调用的本地计费记录。 */
export interface UsageRecord {
  id: string;
  createdAt: number;
  profileId: string;
  profileName: string;
  task: TaskKind;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  currency: Currency;
}

/** 插件全局设置。 */
export interface AppSettings {
  profiles: ApiProfile[];
  defaultProfileId: string;
  streamEnabled: boolean;
  typewriterEnabled: boolean;
  thinkingEnabled: boolean;
  translatePrompt: string;
  explainPrompt: string;
  prices: ModelPrice[];
}

/** 发给后台的任务启动消息。 */
export interface StartTaskMessage {
  type: 'start';
  requestId: string;
  task: TaskKind;
  text: string;
  profileId?: string;
}

/** 发给后台的中止消息。 */
export interface AbortTaskMessage {
  type: 'abort';
  requestId: string;
}

/** 内容脚本到后台的消息。 */
export type ClientMessage = StartTaskMessage | AbortTaskMessage;

/** 后台推送给内容脚本的事件。 */
export type ServerEvent =
  | {
      type: 'meta';
      requestId: string;
      sourceLanguage: string;
      targetLanguage: string;
      model: string;
      profileId: string;
      profileName: string;
    }
  | { type: 'thinking'; requestId: string; delta: string }
  | { type: 'content'; requestId: string; delta: string }
  | {
      type: 'usage';
      requestId: string;
      promptTokens: number;
      completionTokens: number;
      cost: number;
      currency: Currency;
    }
  | { type: 'done'; requestId: string }
  | { type: 'error'; requestId: string; message: string };
