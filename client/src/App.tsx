import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { ChatPanel } from './components/ChatPanel.tsx';
import { PreviewPanel } from './components/PreviewPanel.tsx';
import { AccountPoolModal } from './components/AccountPoolModal.tsx';
import { GitHubModal } from './components/GitHubModal.tsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [gitStatus, setGitStatus] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('index.html');
  const [fileContent, setFileContent] = useState('');

  // Modals
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash-high');
  const [activeAccountNotice, setActiveAccountNotice] = useState('');

  const wsRef = useRef(null);

  // 1. Initial Load & Polling
  useEffect(() => {
    fetchProjects();
    fetchProfiles();

    // Poll profile quotas every 15 seconds
    const interval = setInterval(fetchProfiles, 15000);
    return () => clearInterval(interval);
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
        // Create initial starter project
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
  };

  const fetchProjectFiles = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        // Load default file content
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
        model: selectedModel
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        setActiveAccountNotice(`${data.profileName} (Auto-Balanced)`);
      } else if (data.type === 'chunk') {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            last.content += data.chunk;
          }
          return next;
        });
      } else if (data.type === 'tool') {
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant') {
            last.tools = [...(last.tools || []), data];
          }
          return next;
        });
        // Refresh project files and git status
        fetchProjectFiles(currentProject.id);
        fetchGitStatus(currentProject.id);
      } else if (data.type === 'done' || data.type === 'error') {
        setIsGenerating(false);
        fetchProfiles(); // update quotas
        ws.close();
      }
    };

    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setIsGenerating(false);
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

  const handleAuthProfile = async (profileId) => {
    try {
      await fetch(`/api/profiles/${profileId}/auth`, { method: 'POST' });
      alert(`Authentication initiated for ${profileId}. Please complete Google sign-in if your browser prompts you.`);
      fetchProfiles();
    } catch (e) {
      console.error('Failed to auth profile', e);
    }
  };

  // 5. Commit & Push
  const handleCommitPush = async (commitData) => {
    if (!currentProject) return;
    setIsCommitting(true);
    try {
      await fetch(`/api/projects/${currentProject.id}/git/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commitData)
      });
      fetchGitStatus(currentProject.id);
      setIsGitModalOpen(false);
    } catch (e) {
      console.error('Commit failed', e);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={selectProject}
        onCreateProject={() => {
          const name = prompt('Enter project name:', 'new-vibe-project');
          if (name) {
            fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, template: 'vanilla-html' })
            }).then(r => r.json()).then(p => {
              setProjects(prev => [...prev, p]);
              selectProject(p);
            });
          }
        }}
        profiles={profiles}
        onOpenPoolModal={() => setIsPoolModalOpen(true)}
        onOpenGitModal={() => setIsGitModalOpen(true)}
        onCommitPush={() => setIsGitModalOpen(true)}
        isCommitting={isCommitting}
        gitStatus={gitStatus}
      />

      {/* Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Vibe-Coding Agent Chat (45% width) */}
        <div className="w-[45%] h-full shrink-0">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
            activeAccountNotice={activeAccountNotice}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
          />
        </div>

        {/* Right Side: Live App Preview & Code Viewer (55% width) */}
        <div className="flex-1 h-full overflow-hidden">
          <PreviewPanel
            previewUrl={previewUrl}
            onStartDevServer={() => currentProject && startDevServer(currentProject.id)}
            files={files}
            selectedFile={selectedFile}
            onSelectFile={(f) => currentProject && loadFileContent(currentProject.id, f)}
            fileContent={fileContent}
            onSaveFileContent={saveFileContent}
          />
        </div>
      </div>

      {/* Modals */}
      <AccountPoolModal
        isOpen={isPoolModalOpen}
        onClose={() => setIsPoolModalOpen(false)}
        profiles={profiles}
        onToggleProfile={handleToggleProfile}
        onAuthProfile={handleAuthProfile}
      />

      <GitHubModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        currentProject={currentProject}
        gitStatus={gitStatus}
        onCommitPush={handleCommitPush}
        isCommitting={isCommitting}
      />
    </div>
  );
}
