import { spawn } from 'node:child_process';
import { AGY_BIN } from '../config.js';

export function parseToolsFromResponse(text, availableFiles = ['index.html', 'style.css', 'script.js']) {
  const tools = [];
  const processedPaths = new Set();

  if (!text || typeof text !== 'string') return tools;

  // 1. Match <<<TOOL:WRITE_FILE path="..." >>> ... <<<END_TOOL>>>
  const writeFileRegex = /<<<TOOL:WRITE_FILE\s+path=["']([^"']+)["']>>>([\s\S]*?)<<<END_TOOL>>>/gi;
  let match;
  while ((match = writeFileRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    if (!processedPaths.has(filePath)) {
      tools.push({ type: 'WRITE_FILE', path: filePath, content });
      processedPaths.add(filePath);
    }
  }

  // 2. Match <<<TOOL:COMMAND>>> ... <<<END_TOOL>>>
  const cmdRegex = /<<<TOOL:COMMAND>>>([\s\S]*?)<<<END_TOOL>>>/gi;
  while ((match = cmdRegex.exec(text)) !== null) {
    tools.push({
      type: 'COMMAND',
      command: match[1].trim()
    });
  }

  // 3. Match code blocks with file path in language header:
  // e.g. ```html:index.html, ```css:style.css, ```javascript:script.js, ```html file="index.html"
  const langHeaderRegex = /```(?:[a-zA-Z0-9_-]+[:\s]+(?:file=["']?|path=["']?)?([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]+)["']?)\n([\s\S]*?)```/gi;
  while ((match = langHeaderRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    if (!processedPaths.has(filePath) && content.length > 5) {
      tools.push({ type: 'WRITE_FILE', path: filePath, content });
      processedPaths.add(filePath);
    }
  }

  // 4. Match markdown filename headers right above code fence:
  // e.g. Файл `index.html`: \n ```html \n ... \n ```
  // or **index.html**: \n ```html \n ... \n ```
  const prefixRegex = /(?:файл|file)?\s*[\*`]{1,2}([a-zA-Z0-9_.\-\/]+\.[a-zA-Z0-9]+)[\*`]{1,2}\s*:?\s*\n+```[a-zA-Z0-9_-]*\n([\s\S]*?)```/gi;
  while ((match = prefixRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    if (!processedPaths.has(filePath) && content.length > 5) {
      tools.push({ type: 'WRITE_FILE', path: filePath, content });
      processedPaths.add(filePath);
    }
  }

  // 5. Intelligent Fallback for standalone HTML/CSS/JS blocks if no tools matched yet
  if (tools.length === 0) {
    // Check for full HTML document
    const fullHtmlRegex = /```(?:html)?\s*\n(<!DOCTYPE html[\s\S]*?<\/html>)\s*```/i;
    const htmlMatch = fullHtmlRegex.exec(text);
    if (htmlMatch && !processedPaths.has('index.html')) {
      tools.push({ type: 'WRITE_FILE', path: 'index.html', content: htmlMatch[1].trim() });
      processedPaths.add('index.html');
    }

    // Check for CSS block
    const cssRegex = /```css\s*\n([\s\S]*?)\s*```/i;
    const cssMatch = cssRegex.exec(text);
    if (cssMatch && cssMatch[1].trim().length > 15 && !processedPaths.has('style.css')) {
      tools.push({ type: 'WRITE_FILE', path: 'style.css', content: cssMatch[1].trim() });
      processedPaths.add('style.css');
    }

    // Check for JS block
    const jsRegex = /```(?:javascript|js)\s*\n([\s\S]*?)\s*```/i;
    const jsMatch = jsRegex.exec(text);
    if (jsMatch && jsMatch[1].trim().length > 15 && !processedPaths.has('script.js')) {
      tools.push({ type: 'WRITE_FILE', path: 'script.js', content: jsMatch[1].trim() });
      processedPaths.add('script.js');
    }
  }

  return tools;
}

export class VibeAgent {
  constructor(options = {}) {
    this.profileManager = options.profileManager;
    this.providerManager = options.providerManager;
    this.quotaMonitor = options.quotaMonitor;
    this.accountRouter = options.accountRouter;
    this.routerEngine = options.routerEngine;
    this.workspaceManager = options.workspaceManager;
    this.usageTracker = options.usageTracker;
  }

  buildSystemPrompt(projectId) {
    const files = this.workspaceManager.listFiles(projectId);
    const fileList = files.map(f => f.path).join(', ') || 'No files yet';

    // Embed current contents of existing workspace files so the model knows what to edit
    let filesContext = '';
    for (const f of files.slice(0, 10)) {
      if (f.isDir) continue;
      try {
        const content = this.workspaceManager.readFile(projectId, f.path);
        if (content && content.length < 40000) {
          filesContext += `\n--- FILE: ${f.path} ---\n${content}\n`;
        }
      } catch {}
    }

    return `Ты — BLACKBORZ AI, премиальный ИИ-ассистент для разработки и общих вопросов.
Отвечай всегда на русском языке. Используй Markdown для форматирования ответов (заголовки, списки, блоки кода, жирный текст и т.д.).

## Когда пользователь задаёт обычный вопрос:
Отвечай развёрнуто и полезно. Не генерируй код, если не просят. Просто помогай.

## Когда пользователь просит создать или изменить код:
Ты пишешь код напрямую в файлы проекта (~/Downloads/<project>/).
Цель — создавать полнофункциональные, production-ready, красивые, современные веб-приложения.
НИКОГДА не генерируй демо-заглушки, пустые стабы или фейковые комментарии. Всегда пиши полный, рабочий код.

ТЕКУЩИЕ ФАЙЛЫ ПРОЕКТА:
${fileList}

СОДЕРЖИМОЕ ФАЙЛОВ:
${filesContext || 'Нет файлов в проекте.'}

### Формат для создания/редактирования файлов:
Когда нужно создать или изменить ЛЮБОЙ файл, ОБЯЗАТЕЛЬНО используй этот формат:

<<<TOOL:WRITE_FILE path="index.html">>>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>App</title>
</head>
<body>
  ...
</body>
</html>
<<<END_TOOL>>>

Для выполнения shell-команд (например npm install):
<<<TOOL:COMMAND>>>
npm install package-name
<<<END_TOOL>>>

### Правила кодинга:
1. Всегда пиши ПОЛНЫЙ, рабочий код внутри <<<TOOL:WRITE_FILE path="...">>>. Никогда не обрезай код.
2. Можно создавать/обновлять несколько файлов за один ответ (index.html, style.css, script.js).
3. Эстетика: глубокий чёрный #000, хромированные серебристые акценты, белая типографика, плавные анимации.
4. Перед кодом и после него объясняй что сделал — на русском.
5. Если вопрос НЕ про код — просто отвечай текстом, без генерации файлов.`;
  }

  async run({ projectId, prompt, history = [], model = 'gemini-3.8-flash', onChunk, onTool, onStatus }) {
    const systemPrompt = this.buildSystemPrompt(projectId);
    const projectPath = this.workspaceManager.getProjectPath(projectId);

    // If RouterEngine is available, use FreeLLMAPI-style intelligent routing across Google + External providers
    if (this.routerEngine) {
      return await this.routerEngine.executeWithFailover({
        prompt,
        preferredModel: model,
        onFailover: ({ exhaustedCandidate, nextCandidate, message }) => {
          if (onStatus) {
            onStatus({
              type: 'failover',
              message,
              exhaustedProfileId: exhaustedCandidate.id,
              nextProfileId: nextCandidate.id,
              exhaustedEmail: exhaustedCandidate.email || exhaustedCandidate.name,
              nextEmail: nextCandidate.email || nextCandidate.name
            });
          }
        },
        runner: async (candidate) => {
          if (onStatus) {
            onStatus({
              type: 'status',
              message: `Запрос через ${candidate.name} (${candidate.modelName || candidate.modelId})...`,
              profileId: candidate.id,
              profileName: candidate.name,
              email: candidate.email
            });
          }

          let resultText = '';

          // A. EXTERNAL OPENAI-COMPATIBLE PROVIDER (Groq, OpenRouter, Cerebras, Custom/Ollama)
          if (candidate.type === 'external_provider') {
            const openAiMessages = [
              { role: 'system', content: systemPrompt },
              ...(Array.isArray(history) 
                ? history.filter(m => (m.role === 'user' || m.role === 'assistant') && m.content).slice(-8).map(m => ({ role: m.role, content: m.content })) 
                : []),
              { role: 'user', content: prompt }
            ];

            const streamRes = await fetch(`${candidate.baseUrl.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(candidate.apiKey ? { 'Authorization': `Bearer ${candidate.apiKey}` } : {})
              },
              body: JSON.stringify({
                model: candidate.modelId,
                messages: openAiMessages,
                temperature: 0.4,
                stream: true
              })
            });

            if (!streamRes.ok) {
              const errData = await streamRes.json().catch(() => ({}));
              throw new Error(`${candidate.name} вернул ошибку ${streamRes.status}: ${errData?.error?.message || streamRes.statusText}`);
            }

            const reader = streamRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const rawLine of lines) {
                const line = rawLine.trim();
                if (line.startsWith('data:')) {
                  const dataStr = line.replace(/^data:\s*/, '').trim();
                  if (!dataStr || dataStr === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunkText = parsed.choices?.[0]?.delta?.content || '';
                    if (chunkText) {
                      resultText += chunkText;
                      if (onChunk) onChunk(chunkText);
                    }
                  } catch {}
                }
              }
            }

            if (!resultText.trim()) {
              throw new Error(`Пустой ответ от ${candidate.name}`);
            }
          } 
          // B. GOOGLE GEMINI ACCOUNT
          else {
            const profile = this.profileManager.getProfile(candidate.id) || candidate;
            const isApiKey = profile.apiKey && 
                             !profile.apiKey.trim().startsWith('4/') && 
                             profile.apiKey.trim().length > 15;

            if (isApiKey) {
              const formattedContents = [];
              if (Array.isArray(history) && history.length > 0) {
                const recent = history.filter(m => (m.role === 'user' || m.role === 'assistant') && m.content).slice(-8);
                for (const m of recent) {
                  formattedContents.push({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                  });
                }
              }
              formattedContents.push({
                role: 'user',
                parts: [{ text: prompt }]
              });

              const candidateModels = [candidate.modelId || 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
              let apiSuccess = false;
              let lastApiError = null;

              for (const candModel of candidateModels) {
                try {
                  const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candModel}:streamGenerateContent?alt=sse&key=${profile.apiKey}`;
                  const testRes = await fetch(streamUrl, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'x-goog-api-key': profile.apiKey
                    },
                    body: JSON.stringify({
                      systemInstruction: { parts: [{ text: systemPrompt }] },
                      contents: formattedContents,
                      generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
                    })
                  });

                  if (testRes.ok) {
                    const reader = testRes.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split('\n');
                      buffer = lines.pop() || '';

                      for (const rawLine of lines) {
                        const line = rawLine.trim();
                        if (line.startsWith('data:')) {
                          try {
                            const jsonStr = line.replace(/^data:\s*/, '');
                            if (!jsonStr) continue;
                            const chunkJson = JSON.parse(jsonStr);
                            const parts = chunkJson.candidates?.[0]?.content?.parts || [];
                            for (const p of parts) {
                              const chunkText = p.text || '';
                              if (chunkText) {
                                resultText += chunkText;
                                if (onChunk) onChunk(chunkText);
                              }
                            }
                          } catch {}
                        }
                      }
                    }

                    if (resultText && resultText.trim()) {
                      apiSuccess = true;
                      break;
                    }
                  } else {
                    const errData = await testRes.json().catch(() => ({}));
                    lastApiError = new Error(`Google API ${candModel} returned ${testRes.status}: ${errData?.error?.message || testRes.statusText}`);
                  }
                } catch (err) {
                  lastApiError = err;
                }
              }

              if (!apiSuccess || !resultText.trim()) {
                throw lastApiError || new Error(`Google Gemini API error on ${profile.name}. Triggering failover...`);
              }
            } else {
              // Antigravity CLI Execution
              const env = this.profileManager.getEnv(profile.id);
              resultText = await new Promise((resolve, reject) => {
                let output = '';
                let errOutput = '';
                const child = spawn(AGY_BIN, ['-p', `${systemPrompt}\n\nUSER REQUEST:\n${prompt}`, '--model', 'gemini-3.8-flash-high'], {
                  cwd: projectPath,
                  env,
                  stdio: ['ignore', 'pipe', 'pipe']
                });
                child.stdout.on('data', chunk => {
                  const str = chunk.toString();
                  output += str;
                  if (onChunk) onChunk(str);
                });
                child.stderr.on('data', chunk => { errOutput += chunk.toString(); });
                child.on('close', code => {
                  if (code === 0) resolve(output);
                  else reject(new Error(`Antigravity CLI failed (code ${code}): ${errOutput || output}`));
                });
                child.on('error', reject);
              });
            }
          }

          // Parse and execute tools
          const tools = parseToolsFromResponse(resultText);
          const appliedChanges = [];

          for (const tool of tools) {
            if (tool.type === 'WRITE_FILE') {
              let originalContent = '';
              try { originalContent = this.workspaceManager.readFile(projectId, tool.path); } catch { originalContent = ''; }
              this.workspaceManager.writeFile(projectId, tool.path, tool.content);
              appliedChanges.push({ type: 'file_written', path: tool.path, original: originalContent, updated: tool.content });
              if (onTool) onTool({ tool: 'WRITE_FILE', path: tool.path, original: originalContent, updated: tool.content });
            } else if (tool.type === 'COMMAND') {
              try {
                const { exec } = await import('node:child_process');
                const { promisify } = await import('node:util');
                const execAsync = promisify(exec);
                const { stdout, stderr } = await execAsync(tool.command, { cwd: projectPath, timeout: 30000 });
                appliedChanges.push({ type: 'command_executed', command: tool.command, output: stdout || stderr });
                if (onTool) onTool({ tool: 'COMMAND', command: tool.command, output: stdout || stderr });
              } catch (cmdErr) {
                appliedChanges.push({ type: 'command_failed', command: tool.command, error: cmdErr.message });
                if (onTool) onTool({ tool: 'COMMAND', command: tool.command, error: cmdErr.message });
              }
            }
          }

          // Record usage
          if (this.usageTracker) {
            const estimatedTokens = Math.round(resultText.length / 4);
            this.usageTracker.recordRequest(candidate.id, { tokensUsed: estimatedTokens, model: candidate.modelId });
          }

          return {
            text: resultText,
            toolsApplied: appliedChanges,
            profileUsed: candidate
          };
        }
      });
    }

    // Fallback legacy router if RouterEngine not set
    const profiles = this.profileManager.listProfiles();
    const quotas = await this.quotaMonitor.getAllQuotas(profiles);

    return await this.accountRouter.executeWithFailover({
      profiles,
      quotas,
      onFailover: ({ exhaustedProfile, nextProfile, message }) => {
        if (onStatus) {
          onStatus({
            type: 'failover',
            message,
            exhaustedProfileId: exhaustedProfile.id,
            nextProfileId: nextProfile.id,
            exhaustedEmail: exhaustedProfile.email,
            nextEmail: nextProfile.email
          });
        }
      },
      runner: async (profile) => {
        if (onStatus) {
          onStatus({
            type: 'status',
            message: `Executing with ${profile.name} (${profile.email || profile.id})...`,
            profileId: profile.id,
            profileName: profile.name,
            email: profile.email
          });
        }

        let resultText = '';
        const isApiKey = profile.apiKey && 
                         !profile.apiKey.trim().startsWith('4/') && 
                         profile.apiKey.trim().length > 15;

        if (isApiKey) {
          const formattedContents = [];
          if (Array.isArray(history) && history.length > 0) {
            const recent = history.filter(m => (m.role === 'user' || m.role === 'assistant') && m.content).slice(-8);
            for (const m of recent) {
              formattedContents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] });
            }
          }
          formattedContents.push({ role: 'user', parts: [{ text: prompt }] });

          const candidateModels = ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash'];
          let apiSuccess = false;
          let lastApiError = null;

          for (const candModel of candidateModels) {
            try {
              const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candModel}:streamGenerateContent?alt=sse&key=${profile.apiKey}`;
              const testRes = await fetch(streamUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': profile.apiKey },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  contents: formattedContents,
                  generationConfig: { temperature: 0.4, maxOutputTokens: 65536 }
                })
              });

              if (testRes.ok) {
                const reader = testRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || '';

                  for (const rawLine of lines) {
                    const line = rawLine.trim();
                    if (line.startsWith('data:')) {
                      try {
                        const jsonStr = line.replace(/^data:\s*/, '');
                        if (!jsonStr) continue;
                        const chunkJson = JSON.parse(jsonStr);
                        const parts = chunkJson.candidates?.[0]?.content?.parts || [];
                        for (const p of parts) {
                          const chunkText = p.text || '';
                          if (chunkText) {
                            resultText += chunkText;
                            if (onChunk) onChunk(chunkText);
                          }
                        }
                      } catch {}
                    }
                  }
                }

                if (resultText && resultText.trim()) {
                  apiSuccess = true;
                  break;
                }
              }
            } catch (err) {
              lastApiError = err;
            }
          }

          if (!apiSuccess || !resultText.trim()) {
            throw lastApiError || new Error(`Google Gemini API error on ${profile.name}. Triggering failover...`);
          }
        } else {
          const env = this.profileManager.getEnv(profile.id);
          resultText = await new Promise((resolve, reject) => {
            let output = '';
            let errOutput = '';
            const child = spawn(AGY_BIN, ['-p', `${systemPrompt}\n\nUSER REQUEST:\n${prompt}`, '--model', 'gemini-3.8-flash-high'], {
              cwd: projectPath,
              env,
              stdio: ['ignore', 'pipe', 'pipe']
            });
            child.stdout.on('data', chunk => {
              const str = chunk.toString();
              output += str;
              if (onChunk) onChunk(str);
            });
            child.stderr.on('data', chunk => { errOutput += chunk.toString(); });
            child.on('close', code => {
              if (code === 0) resolve(output);
              else reject(new Error(`Antigravity CLI failed (code ${code}): ${errOutput || output}`));
            });
            child.on('error', reject);
          });
        }

        const tools = parseToolsFromResponse(resultText);
        const appliedChanges = [];

        for (const tool of tools) {
          if (tool.type === 'WRITE_FILE') {
            let originalContent = '';
            try { originalContent = this.workspaceManager.readFile(projectId, tool.path); } catch { originalContent = ''; }
            this.workspaceManager.writeFile(projectId, tool.path, tool.content);
            appliedChanges.push({ type: 'file_written', path: tool.path, original: originalContent, updated: tool.content });
            if (onTool) onTool({ tool: 'WRITE_FILE', path: tool.path, original: originalContent, updated: tool.content });
          } else if (tool.type === 'COMMAND') {
            try {
              const { exec } = await import('node:child_process');
              const { promisify } = await import('node:util');
              const execAsync = promisify(exec);
              const { stdout, stderr } = await execAsync(tool.command, { cwd: projectPath, timeout: 30000 });
              appliedChanges.push({ type: 'command_executed', command: tool.command, output: stdout || stderr });
              if (onTool) onTool({ tool: 'COMMAND', command: tool.command, output: stdout || stderr });
            } catch (cmdErr) {
              appliedChanges.push({ type: 'command_failed', command: tool.command, error: cmdErr.message });
              if (onTool) onTool({ tool: 'COMMAND', command: tool.command, error: cmdErr.message });
            }
          }
        }

        if (this.usageTracker) {
          const estimatedTokens = Math.round(resultText.length / 4);
          this.usageTracker.recordRequest(profile.id, { tokensUsed: estimatedTokens, model: model || 'gemini-3.8-flash' });
        }

        return {
          text: resultText,
          toolsApplied: appliedChanges,
          profileUsed: profile
        };
      }
    });
  }
}
