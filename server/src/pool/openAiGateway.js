/**
 * OpenAI-Compatible Gateway Handler for BLACKBORZ AI
 * Implements standard /v1/models and /v1/chat/completions endpoints
 * so external tools (Cursor, Claude Code, Aider, Cline, Continue, Zed)
 * can route requests directly through our multi-account & multi-provider pool.
 */
export class OpenAiGateway {
  constructor(options = {}) {
    this.routerEngine = options.routerEngine;
    this.profileManager = options.profileManager;
    this.providerManager = options.providerManager;
  }

  handleListModels(req, res) {
    const candidates = this.routerEngine.getCandidates();
    const modelSet = new Set(['auto', 'fusion']);
    const modelsList = [
      { id: 'auto', object: 'model', created: 1710000000, owned_by: 'blackborz-ai' },
      { id: 'fusion', object: 'model', created: 1710000000, owned_by: 'blackborz-ai' }
    ];

    for (const c of candidates) {
      if (c.modelId && !modelSet.has(c.modelId)) {
        modelSet.add(c.modelId);
        modelsList.push({
          id: c.modelId,
          object: 'model',
          created: 1710000000,
          owned_by: c.provider || 'blackborz-ai'
        });
      }
    }

    res.json({
      object: 'list',
      data: modelsList
    });
  }

  async handleChatCompletions(req, res) {
    const { model = 'auto', messages = [], stream = false, temperature = 0.4 } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'messages array is required and must not be empty' } });
    }

    // Extract system prompt, history, and last user prompt
    let systemPrompt = '';
    const history = [];
    let userPrompt = '';

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + (m.content || '');
      } else if (i === messages.length - 1 && m.role === 'user') {
        userPrompt = m.content || '';
      } else {
        history.push(m);
      }
    }

    if (!userPrompt && messages.length > 0) {
      userPrompt = messages[messages.length - 1].content || '';
    }

    const cmplId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      try {
        let sentAny = false;
        await this.routerEngine.executeWithFailover({
          prompt: userPrompt,
          preferredModel: model,
          runner: async (candidate) => {
            let candidateText = '';

            // A. External OpenAI-compatible provider
            if (candidate.type === 'external_provider') {
              const openAiMessages = [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                ...history,
                { role: 'user', content: userPrompt }
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
                  temperature,
                  stream: true
                })
              });

              if (!streamRes.ok) {
                const errData = await streamRes.json().catch(() => ({}));
                throw new Error(`${candidate.name} error: ${errData?.error?.message || streamRes.statusText}`);
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
                        sentAny = true;
                        candidateText += chunkText;
                        res.write(`data: ${JSON.stringify({
                          id: cmplId,
                          object: 'chat.completion.chunk',
                          created,
                          model: candidate.modelId,
                          choices: [{ index: 0, delta: { content: chunkText }, finish_reason: null }]
                        })}\n\n`);
                      }
                    } catch {}
                  }
                }
              }
            } 
            // B. Google Gemini account
            else {
              const profile = this.profileManager.getProfile(candidate.id) || candidate;
              const formattedContents = [];
              for (const m of history.slice(-8)) {
                formattedContents.push({
                  role: m.role === 'user' ? 'user' : 'model',
                  parts: [{ text: m.content || '' }]
                });
              }
              formattedContents.push({
                role: 'user',
                parts: [{ text: userPrompt }]
              });

              const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:streamGenerateContent?alt=sse&key=${profile.apiKey}`;
              const testRes = await fetch(streamUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': profile.apiKey },
                body: JSON.stringify({
                  ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
                  contents: formattedContents,
                  generationConfig: { temperature, maxOutputTokens: 65536 }
                })
              });

              if (!testRes.ok) {
                const errJson = await testRes.json().catch(() => ({}));
                throw new Error(errJson?.error?.message || `Google API status ${testRes.status}`);
              }

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
                          sentAny = true;
                          candidateText += chunkText;
                          res.write(`data: ${JSON.stringify({
                            id: cmplId,
                            object: 'chat.completion.chunk',
                            created,
                            model: 'gemini-3.8-flash',
                            choices: [{ index: 0, delta: { content: chunkText }, finish_reason: null }]
                          })}\n\n`);
                        }
                      }
                    } catch {}
                  }
                }
              }
            }

            return { text: candidateText };
          }
        });

        // Send final chunk and [DONE]
        res.write(`data: ${JSON.stringify({
          id: cmplId,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
        })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: { message: err.message } })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // Non-streaming response
      try {
        let fullResultText = '';
        let used = null;

        await this.routerEngine.executeWithFailover({
          prompt: userPrompt,
          preferredModel: model,
          runner: async (candidate) => {
            used = candidate;
            // Simple non-streaming execution
            if (candidate.type === 'external_provider') {
              const openAiMessages = [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                ...history,
                { role: 'user', content: userPrompt }
              ];
              const resp = await fetch(`${candidate.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(candidate.apiKey ? { 'Authorization': `Bearer ${candidate.apiKey}` } : {})
                },
                body: JSON.stringify({ model: candidate.modelId, messages: openAiMessages, temperature })
              });
              const json = await resp.json();
              fullResultText = json.choices?.[0]?.message?.content || '';
            } else {
              const profile = this.profileManager.getProfile(candidate.id) || candidate;
              const formattedContents = [
                ...history.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content || '' }] })),
                { role: 'user', parts: [{ text: userPrompt }] }
              ];
              const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${profile.apiKey}`;
              const resp = await fetch(genUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: formattedContents })
              });
              const json = await resp.json();
              fullResultText = json.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
            }
            return { text: fullResultText };
          }
        });

        res.json({
          id: cmplId,
          object: 'chat.completion',
          created,
          model,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: fullResultText },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: Math.round(userPrompt.length / 4),
            completion_tokens: Math.round(fullResultText.length / 4),
            total_tokens: Math.round((userPrompt.length + fullResultText.length) / 4)
          },
          provider: used?.name || 'BLACKBORZ Pool'
        });
      } catch (err) {
        res.status(500).json({ error: { message: err.message } });
      }
    }
  }
}
