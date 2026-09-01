/** 任务类型：翻译或解释。 */
export type TaskKind = 'translate' | 'explain';

/** 货币单位。 */
export type Currency = 'CNY' | 'USD';

/** 单个可独立调用和计费的模型配置。 */
export interface ModelConfig {
  id: string;
  providerId: string;
  providerName: string;
  /** 厂商图标键；未知厂商使用 custom */
  icon: string;
  /** 是否来自内置模版 */
  preset: boolean;
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  inputPerMillion: number;
  outputPerMillion: number;
  /** 缓存命中输入单价（每百万 tokens） */
  cacheInputPerMillion: number;
  currency: Currency;
}

/** 翻译与解释模型的组合配置。 */
export interface ModelCombination {
  id: string;
  name: string;
  translateModelId: string;
  explainModelId: string;
}

/** 一次调用的本地计费记录。 */
export interface UsageRecord {
  id: string;
  createdAt: number;
  combinationId: string;
  combinationName: string;
  modelId: string;
  providerName: string;
  task: TaskKind;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  currency: Currency;
}

/** 插件全局设置。 */
export interface AppSettings {
  settingsVersion: number;
  models: ModelConfig[];
  combinations: ModelCombination[];
  defaultCombinationId: string;
  streamEnabled: boolean;
  typewriterEnabled: boolean;
  thinkingEnabled: boolean;
  /** 收到思考内容时是否默认展开 */
  thinkingExpandedByDefault: boolean;
  translatePrompt: string;
  explainPrompt: string;
}

/** 发给后台的任务启动消息。 */
export interface StartTaskMessage {
  type: 'start';
  requestId: string;
  task: TaskKind;
  text: string;
  combinationId?: string;
  /** 覆盖组合里当前任务的模型 */
  modelId?: string;
}

/** 发给后台的中止消息。 */
export interface AbortTaskMessage {
  type: 'abort';
  requestId: string;
}

/** 请求后台打开设置页，内容脚本无法直接调用 tabs API。 */
export interface OpenOptionsMessage {
  type: 'open-options';
}

/** 内容脚本到后台的消息。 */
export type ClientMessage = StartTaskMessage | AbortTaskMessage | OpenOptionsMessage;

/** 后台推送给内容脚本的事件。 */
export type ServerEvent =
  | {
      type: 'meta';
      requestId: string;
      sourceLanguage: string;
      targetLanguage: string;
      modelId: string;
      model: string;
      providerName: string;
      combinationId: string;
      combinationName: string;
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
