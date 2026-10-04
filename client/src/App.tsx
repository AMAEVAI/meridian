import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ChatPanel } from './components/ChatPanel.tsx';
import { ProjectFilesDrawer } from './components/ProjectFilesDrawer.tsx';
import { AccountPoolModal } from './components/AccountPoolModal.tsx';
import { GitHubModal } from './components/GitHubModal.tsx';
import { CreateProjectModal } from './components/CreateProjectModal.tsx';
import { Agentation } from 'agentation';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [gitStatus, setGitStatus] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('index.html');
  const [fileContent, setFileContent] = useState('');

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFilesDrawerOpen, setIsFilesDrawerOpen] = useState(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto:balanced');
  const [activeAccountNotice, setActiveAccountNotice] = useState('');

  const wsRef = useRef(null);

  // 1. Initial Load
  useEffect(() => {
    fetchProjects();
    fetchProfiles();
  }, []);

  // 2. Fetch Helpers
  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (e) {
      console.error('Failed to fetch profiles', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects);
        selectProject(data.projects[0]);
      } else {
        createStarterProject();
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const createStarterProject = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'starter-vibe-app', template: 'vanilla-html' })
      });
      const proj = await res.json();
      setProjects([proj]);
      selectProject(proj);
    } catch (e) {
      console.error('Failed to create project', e);
    }
  };

  const selectProject = async (project) => {
    setCurrentProject(project);
    fetchProjectFiles(project.id);
    fetchGitStatus(project.id);
    startDevServer(project.id);

    // Restore saved chat history for this project (with validation)
    try {
      const saved = localStorage.getItem(`blackborz_chat_${project.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate: must be array, each item must have role and content
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(m => 
            m && typeof m === 'object' && 
            (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
            typeof m.content === 'string'
          );
          setMessages(valid);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  };

  // Save chat history to localStorage whenever messages update
  useEffect(() => {
    if (currentProject?.id && messages.length > 0) {
      try {
        localStorage.setItem(`blackborz_chat_${currentProject.id}`, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, currentProject?.id]);

  const handleClearChat = () => {
    setMessages([]);
    if (currentProject?.id) {
      try {
        localStorage.removeItem(`blackborz_chat_${currentProject.id}`);
      } catch {}
    }
  };

  const handleCreateNewProject = () => {
    setIsCreateProjectModalOpen(true);
  };

  const handleConfirmCreateProject = async (name) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), template: 'vanilla-html' })
      });
      const newProj = await res.json();
      setProjects(prev => [newProj, ...prev.filter(p => p.id !== newProj.id)]);
      selectProject(newProj);
      setMessages([]);
    } catch (e) {
      console.error('Failed to create new project', e);
      throw e;
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Удалить проект "${projectId}" и связанную папку из Загрузок?`)) {
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      const updated = projects.filter(p => p.id !== projectId);
      setProjects(updated);
      try {
        localStorage.removeItem(`blackborz_chat_${projectId}`);
      } catch {}
      if (currentProject?.id === projectId) {
        if (updated.length > 0) {
          selectProject(updated[0]);
        } else {
          createStarterProject();
        }
      }
    } catch (e) {
      console.error('Failed to delete project', e);
    }
  };

  const fetchProjectFiles = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        const target = data.files.find(f => f.path === 'index.html') || data.files[0];
        if (target) {
          loadFileContent(projectId, target.path);
        }
      }
    } catch (e) {
      console.error('Failed to fetch files', e);
    }
  };

  const loadFileContent = async (projectId, filePath) => {
    try {
      setSelectedFile(filePath);
      const res = await fetch(`/api/projects/${projectId}/files/content?filePath=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) setFileContent(data.content);
    } catch (e) {
      console.error('Failed to load file content', e);
    }
  };

  const saveFileContent = async (filePath, content) => {
    if (!currentProject || !filePath) return;
    try {
      await fetch(`/api/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content })
      });
      setFileContent(content);
      fetchProjectFiles(currentProject.id);
    } catch (e) {
      console.error('Failed to save file', e);
    }
  };

  const startDevServer = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/preview/start`, { method: 'POST' });
      const data = await res.json();
      if (data.url) setPreviewUrl(data.url);
    } catch (e) {
      console.error('Failed to start dev server', e);
    }
  };

  const fetchGitStatus = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/git/status`);
      const data = await res.json();
      setGitStatus(data);
    } catch (e) {
      console.error('Failed to fetch git status', e);
    }
  };

  // 3. WebSocket Chat Execution
  const handleSendMessage = (text) => {
    if (!currentProject) return;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }

    // Add user message
    const userMsg = { role: 'user', content: text };
    const assistantMsg = { role: 'assistant', content: '', tools: [] };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsGenerating(true);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'prompt',
        projectId: currentProject.id,
        prompt: text,
        history: messages,
        model: selectedModel
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'failover') {
        const nextTarget = data.nextEmail || data.nextProfileId || 'следующий аккаунт';
        setActiveAccountNotice(`⚡ Лимит исчерпан: переключено на ${nextTarget}`);
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          const historyBefore = last && last.role === 'assistant' ? prev.slice(0, lastIdx) : prev;
          const currentAssistant = last && last.role === 'assistant'
            ? { ...last, content: '', tools: [] }
            : { role: 'assistant', content: '', tools: [] };

          return [
            ...historyBefore,
            {
              role: 'system',
              content: `⚡ ${data.message || `5-часовой лимит исчерпан. Автоматически переключено на следующий аккаунт: ${nextTarget}`}`
            },
            currentAssistant
          ];
        });
        fetchProfiles();
      } else if (data.type === 'status') {
        setActiveAccountNotice(`${data.profileName || data.profileId} (Active)`);
      } else if (data.type === 'chunk') {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (!last || last.role !== 'assistant') return prev;

          // Pure immutable update without mutating `last` in place
          return [
            ...prev.slice(0, lastIdx),
            {
              ...last,
              content: (last.content || '') + data.chunk
            }
          ];
        });
      } else if (data.type === 'tool') {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (!last || last.role !== 'assistant') return prev;

          return [
            ...prev.slice(0, lastIdx),
            {
              ...last,
              tools: [...(last.tools || []), data]
            }
          ];
        });
        // Refresh project files and git status
        fetchProjectFiles(currentProject.id);
        fetchGitStatus(currentProject.id);
      } else if (data.type === 'error') {
        setIsGenerating(false);
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (!last || last.role !== 'assistant') return prev;
          return [
            ...prev.slice(0, lastIdx),
            {
              ...last,
              content: last.content 
                ? `${last.content}\n\n⚠️ ${data.message || 'Ошибка при генерации ответа'}` 
                : `⚠️ Ошибка: ${data.message || 'Не удалось получить ответ от Google AI.'}`
            }
          ];
        });
        fetchProfiles();
        ws.close();
      } else if (data.type === 'done') {
        setIsGenerating(false);
        fetchProfiles(); // update quotas
        ws.close();
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setIsGenerating(false);
      setMessages(prev => {
        if (prev.length === 0) return prev;
        const lastIdx = prev.length - 1;
        const last = prev[lastIdx];
        if (!last || last.role !== 'assistant') return prev;
        if (!last.content) {
          return [
            ...prev.slice(0, lastIdx),
            { ...last, content: '⚠️ Ошибка подключения к серверу BLACKBORZ AI.' }
          ];
        }
        return prev;
      });
    };
  };

  // 4. Profile Management Handlers
  const handleToggleProfile = async (profileId) => {
    try {
      await fetch(`/api/profiles/${profileId}/toggle`, { method: 'POST' });
      fetchProfiles();
    } catch (e) {
      console.error('Failed to toggle profile', e);
    }
  };

  // 5. Commit & Push
  const handleCommitPush = async (commitData) => {
    if (!currentProject) return { success: false, error: 'Проект не выбран' };
    setIsCommitting(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commitData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchGitStatus(currentProject.id);
        fetchProjects();
        return data;
      } else {
        return { success: false, error: data.error || 'Ошибка при выполнении коммита или push' };
      }
    } catch (e) {
      console.error('Commit failed', e);
      return { success: false, error: e.message };
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white selection:bg-white selection:text-black">
      {/* Left Full Sidebar Menu (like ChatGPT) */}
      {isSidebarOpen && (
        <Sidebar
          projects={projects}
          currentProject={currentProject}
          onSelectProject={selectProject}
          onCreateProject={handleCreateNewProject}
          onDeleteProject={handleDeleteProject}
          profiles={profiles}
          onOpenPoolModal={() => setIsPoolModalOpen(true)}
          onOpenGitModal={() => setIsGitModalOpen(true)}
          onOpenFilesDrawer={() => setIsFilesDrawerOpen(true)}
          previewUrl={previewUrl}
          filesCount={files.length}
        />
      )}

      {/* Main Right Area: Top Settings Header + Working Chat */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black relative">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          currentProject={currentProject}
          profiles={profiles}
          onOpenPoolModal={() => setIsPoolModalOpen(true)}
          onClearChat={handleClearChat}
          activeAccountNotice={activeAccountNotice}
        />

        {/* Full-Width Working Chat Area */}
        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          activeAccountNotice={activeAccountNotice}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Slide-Over Project Files Drawer */}
      <ProjectFilesDrawer
        isOpen={isFilesDrawerOpen}
        onClose={() => setIsFilesDrawerOpen(false)}
        files={files}
        selectedFile={selectedFile}
        onSelectFile={(f) => loadFileContent(currentProject?.id, f)}
        fileContent={fileContent}
        onSaveFileContent={saveFileContent}
        previewUrl={previewUrl}
      />

      {/* Modals */}
      <AccountPoolModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        profiles={profiles}
        onToggleProfile={handleToggleProfile}
        onUpdateProfile={fetchProfiles}
        onResetProfile={fetchProfiles}
      />

      <GitHubModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        currentProject={currentProject}
        gitStatus={gitStatus}
        onCommitPush={handleCommitPush}
        isCommitting={isCommitting}
        onRefreshStatus={() => {
          if (currentProject?.id) fetchGitStatus(currentProject.id);
          fetchProjects();
        }}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreate={handleConfirmCreateProject}
      />

      {/* Agentation Visual Feedback & Annotation Toolbar */}
      <Agentation
        appName="BLACKBORZ AI"
        onSubmit={(output) => {
          if (output && output.trim()) {
            handleSendMessage(output);
          }
        }}
      />
    </div>
  );
}
