import { spawn } from 'node:child_process';
import { AGY_BIN } from '../config.js';

export function parseToolsFromResponse(text) {
  const tools = [];

  // Match WRITE_FILE blocks
  const writeFileRegex = /<<<TOOL:WRITE_FILE\s+path=["']([^"']+)["']>>>([\s\S]*?)<<<END_TOOL>>>/g;
  let match;
  while ((match = writeFileRegex.exec(text)) !== null) {
    tools.push({
      type: 'WRITE_FILE',
      path: match[1].trim(),
      content: match[2].replace(/^\n/, '')
    });
  }

  // Match COMMAND blocks
  const cmdRegex = /<<<TOOL:COMMAND>>>([\s\S]*?)<<<END_TOOL>>>/g;
  while ((match = cmdRegex.exec(text)) !== null) {
    tools.push({
      type: 'COMMAND',
      command: match[1].trim()
    });
  }

  return tools;
}

export class VibeAgent {
  constructor(options = {}) {
    this.profileManager = options.profileManager;
    this.quotaMonitor = options.quotaMonitor;
    this.accountRouter = options.accountRouter;
    this.workspaceManager = options.workspaceManager;
  }

  buildSystemPrompt(projectId) {
    const files = this.workspaceManager.listFiles(projectId);
    const fileList = files.map(f => f.path).join(', ') || 'No files yet';

    return `You are BLACKBORZ AI, the premier autonomous vibe-coding engineering system.
Your goal is to build full-scale, production-ready, beautiful, modern web applications for the user.
NEVER generate demo placeholders, empty stubs, or fake comments. Always deliver complete, polished, high-performance code.

CURRENT WORKSPACE FILES:
${fileList}

TOOL USAGE FORMAT:
When you need to create or edit a file, write:
<<<TOOL:WRITE_FILE path="relative/path/to/file.ext">>>
[complete production code here]
<<<END_TOOL>>>

When you need to run a shell command in the project directory, write:
<<<TOOL:COMMAND>>>
npm install package-name
<<<END_TOOL>>>

Always provide full, working code without placeholders.
Explain your changes briefly in Russian.`;
  }

  async run({ projectId, prompt, history = [], model = 'gemini-3.8-flash-high', onChunk, onTool, onStatus }) {
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

        const systemPrompt = this.buildSystemPrompt(projectId);
        let historyContext = '';
        if (Array.isArray(history) && history.length > 0) {
          const recent = history.filter(m => (m.role === 'user' || m.role === 'assistant') && m.content).slice(-8);
          if (recent.length > 0) {
            historyContext = '\n\nPREVIOUS CONVERSATION HISTORY:\n' + 
              recent.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
          }
        }
        const fullPrompt = `${systemPrompt}${historyContext}\n\nUSER REQUEST:\n${prompt}`;
        const env = this.profileManager.getEnv(profile.id);
        const projectPath = this.workspaceManager.getProjectPath(projectId);

        let resultText = '';

        const isApiKey = profile.apiKey && 
                         !profile.apiKey.trim().startsWith('4/') && 
                         profile.apiKey.trim().length > 15;

        let executionSuccess = false;

        if (isApiKey) {
          try {
            // Direct Google Gemini API streaming for profiles with API keys
            const candidateModels = ['gemini-3.8-flash', 'gemini-3.8-flash-high', 'gemini-2.5-flash'];
            let res = null;
            let activeModel = candidateModels[0];

            for (const candModel of candidateModels) {
              const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candModel}:streamGenerateContent?alt=sse&key=${profile.apiKey}`;
              const testRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-goog-api-key': profile.apiKey
                },
                body: JSON.stringify({
                  contents: [{
                    role: 'user',
                    parts: [{ text: fullPrompt }]
                  }]
                })
              });

              if (testRes.ok) {
                res = testRes;
                activeModel = candModel;
                break;
              } else if (testRes.status === 404) {
                continue;
              } else {
                const errData = await testRes.json().catch(() => ({}));
                console.warn(`[VibeAgent] Gemini API model ${candModel} returned ${testRes.status}: ${errData?.error?.message || testRes.statusText}`);
              }
            }

            if (res && res.ok) {
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const chunkJson = JSON.parse(line.slice(6));
                      const parts = chunkJson.candidates?.[0]?.content?.parts || [];
                      const chunkText = parts.map(p => p.text || '').join('');
                      if (chunkText) {
                        resultText += chunkText;
                        if (onChunk) onChunk(chunkText);
                      }
                    } catch {}
                  }
                }
              }

              if (resultText && resultText.trim()) {
                executionSuccess = true;
              }
            }
          } catch (apiErr) {
            console.warn(`[VibeAgent] Direct Gemini API failed: ${apiErr.message}. Falling back to Antigravity CLI...`);
          }
        }

        // If direct API was not used or did not produce output, execute via Antigravity CLI
        if (!executionSuccess) {
          resultText = await new Promise((resolve, reject) => {
            let output = '';
            let errOutput = '';

            const child = spawn(AGY_BIN, ['-p', fullPrompt, '--model', 'gemini-3.8-flash-high'], {
              cwd: projectPath,
              env,
              stdio: ['ignore', 'pipe', 'pipe']
            });

            child.stdout.on('data', chunk => {
              const str = chunk.toString();
              output += str;
              if (onChunk) onChunk(str);
            });

            child.stderr.on('data', chunk => {
              errOutput += chunk.toString();
            });

            child.on('close', code => {
              if (code === 0) {
                resolve(output);
              } else {
                reject(new Error(`Antigravity CLI failed (code ${code}): ${errOutput || output}`));
              }
            });

            child.on('error', reject);
          });
        }

        // Parse and execute tools
        const tools = parseToolsFromResponse(resultText);
        const appliedChanges = [];

        for (const tool of tools) {
          if (tool.type === 'WRITE_FILE') {
            let originalContent = '';
            try {
              originalContent = this.workspaceManager.readFile(projectId, tool.path);
            } catch {
              originalContent = '';
            }

            this.workspaceManager.writeFile(projectId, tool.path, tool.content);
            appliedChanges.push({
              type: 'file_written',
              path: tool.path,
              original: originalContent,
              updated: tool.content
            });

            if (onTool) {
              onTool({
                tool: 'WRITE_FILE',
                path: tool.path,
                original: originalContent,
                updated: tool.content
              });
            }
          }
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
