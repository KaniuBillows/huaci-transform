import { createServer } from 'node:http';

const CHUNKS = ['你好', '，', '世界'];
const LONG_REQUEST_MARKER = '__long_translation__';
const LONG_CONTENT = `${'很长的翻译结果'.repeat(180)}【长内容完成】`;

/**
 * 最小 OpenAI 兼容服务，用于端到端冒烟测试。
 */
export function startMockApi() {
  const server = createServer((req, res) => {
    if (!req.url?.endsWith('/chat/completions')) {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      const content = JSON.stringify(payload.messages ?? []).includes(LONG_REQUEST_MARKER)
        ? LONG_CONTENT
        : CHUNKS.join('');
      const chunks = [];
      for (let i = 0; i < content.length; i += 64) {
        chunks.push(content.slice(i, i + 64));
      }
      if (!payload.stream) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content } }],
            usage: { prompt_tokens: 11, completion_tokens: 7 },
          }),
        );
        return;
      }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      for (const delta of chunks) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 11, completion_tokens: 7 } })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${port}/v1`,
        expected: CHUNKS.join(''),
        longInputMarker: LONG_REQUEST_MARKER,
        longExpected: LONG_CONTENT,
      });
    });
  });
}

/**
 * 提供一个含英文段落的测试页面。
 */
export function startPageServer() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<html><body style="font-size:24px;padding:40px"><p id="t">Hello world</p></body></html>');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}
