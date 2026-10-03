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

    return `You are the Meridian Antigravity Vibe-Coding Agent.
Your goal is to build beautiful, functional, and modern web applications for the user.

CURRENT WORKSPACE FILES:
${fileList}

TOOL USAGE FORMAT:
When you need to create or edit a file, write:
<<<TOOL:WRITE_FILE path="relative/path/to/file.ext">>>
[complete code here]
<<<END_TOOL>>>

When you need to run a shell command in the project directory, write:
<<<TOOL:COMMAND>>>
npm install package-name
<<<END_TOOL>>>

Always provide full, working code without placeholders.
Explain your changes briefly before or after tool blocks.`;
  }

  async run({ projectId, prompt, model = 'gemini-3.8-flash-high', onChunk, onTool, onStatus }) {
    const profiles = this.profileManager.listProfiles();
    const quotas = await this.quotaMonitor.getAllQuotas(profiles);

    return await this.accountRouter.executeWithFailover({
      profiles,
      quotas,
      runner: async (profile) => {
        if (onStatus) {
          onStatus({
            type: 'status',
            message: `Executing with ${profile.name} (${profile.id})...`,
            profileId: profile.id,
            profileName: profile.name
          });
        }

        const systemPrompt = this.buildSystemPrompt(projectId);
        const fullPrompt = `${systemPrompt}\n\nUSER REQUEST:\n${prompt}`;
        const env = this.profileManager.getEnv(profile.id);
        const projectPath = this.workspaceManager.getProjectPath(projectId);

        const resultText = await new Promise((resolve, reject) => {
          let output = '';
          let errOutput = '';

          const child = spawn(AGY_BIN, ['-p', fullPrompt, '--model', model], {
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
