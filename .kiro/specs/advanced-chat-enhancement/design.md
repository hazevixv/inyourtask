# Design Document: Advanced Chat Enhancement

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│  Chat UI Components                                          │
│  ├── ChatPage (Main Container)                              │
│  ├── ConversationList                                        │
│  ├── MessageList                                             │
│  ├── MessageComposer                                         │
│  └── MessageRenderer (Rich Content)                          │
│      ├── MarkdownRenderer                                    │
│      ├── CodeHighlighter                                     │
│      ├── HTMLRenderer                                        │
│      ├── ChartRenderer                                       │
│      ├── ThreeDRenderer                                      │
│      ├── VoiceMessagePlayer                                  │
│      └── FileAttachmentPreview                               │
├─────────────────────────────────────────────────────────────┤
│  Interactive Components                                      │
│  ├── TypingIndicator                                         │
│  ├── VoiceRecorder                                           │
│  ├── FileUploader                                            │
│  ├── EmojiPicker                                             │
│  ├── ReactionButtons                                         │
│  ├── QuickReplyButtons                                       │
│  └── InteractiveDropdown                                     │
├─────────────────────────────────────────────────────────────┤
│  Admin Dashboard Components                                  │
│  ├── ConversationManager                                     │
│  ├── AgentEditor                                             │
│  ├── UserManager                                             │
│  ├── AnalyticsDashboard                                      │
│  └── SystemConfig                                            │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js API Routes)           │
├─────────────────────────────────────────────────────────────┤
│  Chat APIs                                                   │
│  ├── POST /api/chat/messages (Enhanced with Global AI)      │
│  ├── GET  /api/chat/messages                                │
│  ├── POST /api/chat/conversations                           │
│  ├── POST /api/chat/upload                                  │
│  ├── POST /api/chat/voice                                   │
│  └── POST /api/chat/reactions                               │
├─────────────────────────────────────────────────────────────┤
│  Admin APIs                                                  │
│  ├── GET  /api/admin/conversations                          │
│  ├── GET  /api/admin/agents                                 │
│  ├── PUT  /api/admin/agents/:id                             │
│  ├── GET  /api/admin/users                                  │
│  ├── GET  /api/admin/analytics                              │
│  └── PUT  /api/admin/config                                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  ChatModel (Enhanced)                                        │
│  ├── Message CRUD with attachments                          │
│  ├── Reaction management                                     │
│  ├── File metadata storage                                   │
│  └── Voice message metadata                                  │
├─────────────────────────────────────────────────────────────┤
│  AdminModel (New)                                            │
│  ├── Analytics queries                                       │
│  ├── User management                                         │
│  └── System configuration                                    │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
├─────────────────────────────────────────────────────────────┤
│  ├── Gemini AI API (with Global Instructions)               │
│  ├── File Storage (public/uploads/)                         │
│  └── MySQL Database                                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

#### Message Sending Flow with Global Instructions
```
User Input → MessageComposer → POST /api/chat/messages
                                      ↓
                        Combine: Agent System Prompt
                                + Global Instructions
                                + User Context
                                + Conversation History
                                      ↓
                                Gemini AI API
                                      ↓
                        AI Response → Save to DB
                                      ↓
                        Return to Client → MessageRenderer
```

## 2. Component Design

### 2.1 MessageRenderer Component

**Purpose**: Render rich content including Markdown, code, HTML, charts, and 3D visualizations

**Props**:
```typescript
interface MessageRendererProps {
  content: string;
  msgType: 'text' | 'markdown' | 'html' | 'code' | 'chart' | '3d';
  metadata?: {
    language?: string;
    chartData?: ChartData;
    threeDData?: ThreeDData;
  };
}
```

**Sub-components**:
- `MarkdownRenderer`: Uses react-markdown + remark-gfm
- `CodeHighlighter`: Uses Prism.js for syntax highlighting
- `HTMLRenderer`: Uses DOMPurify for sanitization
- `ChartRenderer`: Uses Recharts for data visualization
- `ThreeDRenderer`: Uses Three.js + @react-three/fiber

**Implementation**:
```typescript
// components/chat/MessageRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Prism from 'prismjs';
import DOMPurify from 'dompurify';
import { BarChart, LineChart, PieChart } from 'recharts';
import { Canvas } from '@react-three/fiber';

export function MessageRenderer({ content, msgType, metadata }: MessageRendererProps) {
  if (msgType === 'markdown') {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }
  
  if (msgType === 'code') {
    const highlighted = Prism.highlight(content, Prism.languages[metadata?.language || 'javascript']);
    return <pre><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>;
  }
  
  if (msgType === 'html') {
    const clean = DOMPurify.sanitize(content);
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
  }
  
  if (msgType === 'chart' && metadata?.chartData) {
    return <ChartRenderer data={metadata.chartData} />;
  }
  
  if (msgType === '3d' && metadata?.threeDData) {
    return <ThreeDRenderer data={metadata.threeDData} />;
  }
  
  return <div>{content}</div>;
}
```

### 2.2 TypingIndicator Component

**Purpose**: Show when AI or users are typing

**Props**:
```typescript
interface TypingIndicatorProps {
  username?: string;
  isAI?: boolean;
}
```

**Implementation**:
```typescript
// components/chat/TypingIndicator.tsx
export function TypingIndicator({ username, isAI }: TypingIndicatorProps) {
  return (
    <div className={styles.typing}>
      <div className={`${styles.avatar} ${isAI ? styles.avatarAI : ''}`}>
        {isAI ? <Bot size={14} /> : getInitials(username)}
      </div>
      <div className={styles.typingDots}>
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
        <div className={styles.typingDot} />
      </div>
    </div>
  );
}
```

### 2.3 VoiceMessage Component

**Purpose**: Record, upload, and playback voice messages

**Props**:
```typescript
interface VoiceMessageProps {
  mode: 'recorder' | 'player';
  audioUrl?: string;
  duration?: number;
  onRecordComplete?: (audioBlob: Blob) => void;
}
```

**Implementation**:
```typescript
// components/chat/VoiceMessage.tsx
export function VoiceRecorder({ onRecordComplete }: { onRecordComplete: (blob: Blob) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      onRecordComplete(blob);
    };
    
    mediaRecorder.start();
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  
  return (
    <div className={styles.voiceRecorder}>
      {!isRecording ? (
        <button onClick={startRecording}><Mic size={18} /> Record</button>
      ) : (
        <>
          <span>{formatDuration(duration)}</span>
          <button onClick={stopRecording}><Square size={18} /> Stop</button>
        </>
      )}
    </div>
  );
}

export function VoicePlayer({ audioUrl, duration }: { audioUrl: string; duration: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  return (
    <div className={styles.voicePlayer}>
      <audio ref={audioRef} src={audioUrl} />
      <button onClick={() => audioRef.current?.play()}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className={styles.waveform}>
        <div className={styles.progress} style={{ width: `${(currentTime / duration) * 100}%` }} />
      </div>
      <span>{formatDuration(currentTime)} / {formatDuration(duration)}</span>
    </div>
  );
}
```

### 2.4 FileAttachment Component

**Purpose**: Upload and preview file attachments

**Props**:
```typescript
interface FileAttachmentProps {
  mode: 'uploader' | 'preview';
  files?: File[];
  attachments?: Attachment[];
  onUpload?: (files: File[]) => void;
}

interface Attachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnail?: string;
}
```

**Implementation**:
```typescript
// components/chat/FileAttachment.tsx
export function FileUploader({ onUpload }: { onUpload: (files: File[]) => void }) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onUpload(acceptedFiles);
  }, [onUpload]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
    }
  });
  
  return (
    <div {...getRootProps()} className={styles.fileUploader}>
      <input {...getInputProps()} />
      {isDragActive ? (
        <p>Drop files here...</p>
      ) : (
        <p><Paperclip size={18} /> Attach files</p>
      )}
    </div>
  );
}

export function FilePreview({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className={styles.filePreview}>
      {attachments.map((att, idx) => (
        <div key={idx} className={styles.fileItem}>
          {att.thumbnail && <img src={att.thumbnail} alt={att.fileName} />}
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{att.fileName}</span>
            <span className={styles.fileSize}>{formatFileSize(att.fileSize)}</span>
          </div>
          <a href={att.fileUrl} download><Download size={16} /></a>
        </div>
      ))}
    </div>
  );
}
```

### 2.5 EmojiPicker Component

**Purpose**: Select and insert emojis

**Implementation**:
```typescript
// components/chat/EmojiPicker.tsx
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className={styles.emojiPicker}>
      <Picker data={data} onEmojiSelect={(emoji: any) => onSelect(emoji.native)} />
    </div>
  );
}
```

### 2.6 ReactionButtons Component

**Purpose**: Add emoji reactions to messages

**Implementation**:
```typescript
// components/chat/ReactionButtons.tsx
export function ReactionButtons({ msgId, reactions }: { msgId: string; reactions: Reaction[] }) {
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  const addReaction = async (emoji: string) => {
    await fetch('/api/chat/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgId, emoji })
    });
  };
  
  return (
    <div className={styles.reactions}>
      {reactions.map((r, idx) => (
        <button key={idx} className={styles.reaction} onClick={() => addReaction(r.emoji)}>
          {r.emoji} {r.count}
        </button>
      ))}
      <button className={styles.addReaction}>
        <Plus size={14} />
      </button>
    </div>
  );
}
```

### 2.7 ChartRenderer Component

**Purpose**: Render interactive charts

**Implementation**:
```typescript
// components/chat/ChartRenderer.tsx
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export function ChartRenderer({ data }: { data: ChartData }) {
  if (data.type === 'bar') {
    return (
      <BarChart width={600} height={300} data={data.data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="value" fill="#7C3AED" />
      </BarChart>
    );
  }
  
  if (data.type === 'line') {
    return (
      <LineChart width={600} height={300} data={data.data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="value" stroke="#7C3AED" />
      </LineChart>
    );
  }
  
  if (data.type === 'pie') {
    return (
      <PieChart width={400} height={400}>
        <Pie data={data.data} dataKey="value" nameKey="name" fill="#7C3AED" label />
        <Tooltip />
      </PieChart>
    );
  }
  
  return null;
}
```

### 2.8 AdminDashboard Components

**Purpose**: Admin interface for system management

**Structure**:
```
AdminDashboard/
├── ConversationManager.tsx
├── AgentEditor.tsx
├── UserManager.tsx
├── AnalyticsDashboard.tsx
└── SystemConfig.tsx
```

## 3. API Design

### 3.1 Enhanced Message API

**Endpoint**: `POST /api/chat/messages`

**Request**:
```typescript
{
  convId: string;
  content: string;
  msgType?: 'text' | 'markdown' | 'html' | 'code' | 'chart' | '3d';
  metadata?: {
    language?: string;
    chartData?: ChartData;
    threeDData?: ThreeDData;
  };
  attachments?: string[]; // File URLs
  voiceData?: {
    audioUrl: string;
    duration: number;
  };
}
```

**Response**:
```typescript
{
  success: boolean;
  message: Message;
  aiReply?: Message;
}
```

**Implementation Changes**:
```typescript
// app/api/chat/messages/route.ts
import { getGlobalInstructions } from '@/lib/ai-global-instructions';

export async function POST(req: NextRequest) {
  // ... existing code ...
  
  if (conv && conv.agent_id) {
    const agent = await ChatModel.getAgentById(conv.agent_id);
    
    // Get user context
    const userContext = {
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      currentProjects: await getActiveProjects(user.username),
      recentTasks: await getRecentTasks(user.username)
    };
    
    // Combine prompts with global instructions
    const globalInstructions = getGlobalInstructions(userContext);
    const systemPrompt = `${globalInstructions}\n\n${agent.system_prompt}`;
    
    // ... rest of Gemini API call ...
  }
}
```

### 3.2 File Upload API

**Endpoint**: `POST /api/chat/upload`

**Request**: FormData with files

**Response**:
```typescript
{
  success: boolean;
  files: Array<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    thumbnail?: string;
  }>;
}
```

**Implementation**:
```typescript
// app/api/chat/upload/route.ts
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  
  const uploadedFiles = [];
  
  for (const file of files) {
    // Validate file size
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large' }, { status: 400 });
    }
    
    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(process.cwd(), 'public', 'uploads', 'files', filename);
    
    await fs.writeFile(filepath, buffer);
    
    uploadedFiles.push({
      fileUrl: `/uploads/files/${filename}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
  }
  
  return NextResponse.json({ success: true, files: uploadedFiles });
}
```

### 3.3 Voice Message API

**Endpoint**: `POST /api/chat/voice`

**Request**: FormData with audio blob

**Response**:
```typescript
{
  success: boolean;
  voiceData: {
    audioUrl: string;
    duration: number;
  };
}
```

### 3.4 Admin APIs

**Endpoints**:
- `GET /api/admin/conversations` - List all conversations
- `GET /api/admin/agents` - List all agents
- `PUT /api/admin/agents/:id` - Update agent
- `GET /api/admin/users` - List all users
- `GET /api/admin/analytics` - System analytics
- `PUT /api/admin/config` - Update system config

## 4. Database Schema Updates

### 4.1 Enhanced chat_messages Table

```sql
ALTER TABLE chat_messages 
ADD COLUMN attachments JSON DEFAULT NULL,
ADD COLUMN voice_data JSON DEFAULT NULL,
ADD COLUMN render_type ENUM('text', 'markdown', 'html', 'code', 'chart', '3d') DEFAULT 'text',
ADD COLUMN metadata JSON DEFAULT NULL;
```

### 4.2 New message_reactions Table

```sql
CREATE TABLE message_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  msg_id VARCHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaction (msg_id, username, emoji),
  FOREIGN KEY (msg_id) REFERENCES chat_messages(msg_id) ON DELETE CASCADE,
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.3 New system_config Table

```sql
CREATE TABLE system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 5. State Management

### 5.1 Message State

```typescript
interface MessageState {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;
}
```

### 5.2 UI State

```typescript
interface UIState {
  isTyping: boolean;
  showEmojiPicker: boolean;
  showFileUploader: boolean;
  isRecordingVoice: boolean;
  activeModal: 'none' | 'image-preview' | 'file-preview' | 'chart-fullscreen';
}
```

## 6. Security Design

### 6.1 HTML Sanitization

```typescript
import DOMPurify from 'dompurify';

const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOWED_STYLES: ['color', 'background', 'margin', 'padding', 'font-size', 'font-weight']
  });
};
```

### 6.2 File Upload Validation

```typescript
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const validateFile = (file: File): boolean => {
  return ALLOWED_FILE_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE;
};
```

## 7. Performance Considerations

### 7.1 Message Pagination

- Load 50 messages initially
- Implement infinite scroll for older messages
- Cache loaded messages in memory

### 7.2 Image Compression

```typescript
const compressImage = async (file: File): Promise<Blob> => {
  if (file.size < 5 * 1024 * 1024) return file; // Skip if < 5MB
  
  // Use canvas to compress
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const maxWidth = 1920;
  const scale = Math.min(1, maxWidth / img.width);
  
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
  });
};
```

### 7.3 Lazy Loading

- Lazy load MessageRenderer components
- Lazy load chart libraries
- Lazy load 3D visualization libraries

## 8. Responsive Design

### 8.1 Breakpoints

```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  .chatContainer {
    flex-direction: column;
  }
  .conversationList {
    display: none; /* Hidden when chat is open */
  }
}

/* Tablet: 768px - 1024px */
@media (min-width: 768px) and (max-width: 1024px) {
  .conversationList {
    width: 35%;
  }
  .chatArea {
    width: 65%;
  }
}

/* Desktop: > 1024px */
@media (min-width: 1025px) {
  .conversationList {
    width: 30%;
  }
  .chatArea {
    width: 70%;
  }
}
```

### 8.2 Touch Optimizations

- Minimum touch target: 44x44px
- Swipe gestures for navigation
- Pull-to-refresh for message list
- Touch-friendly emoji picker

## 9. Implementation Priority

### Phase 1: Core Enhancements (High Priority)
1. ✅ Global AI Instructions integration
2. ✅ UI/UX improvements (spacing, colors, typography)
3. ✅ Markdown rendering
4. ✅ Code syntax highlighting
5. ✅ Typing indicator

### Phase 2: Interactive Features (Medium Priority)
6. Voice message recording and playback
7. File attachment upload and preview
8. Emoji picker
9. Message reactions
10. Quick reply buttons

### Phase 3: Rich Content (Medium Priority)
11. HTML rendering with sanitization
12. Code preview toggle
13. Chart rendering
14. 3D visualizations

### Phase 4: Admin Dashboard (Low Priority)
15. Conversation manager
16. Agent editor
17. User manager
18. Analytics dashboard
19. System configuration

## 10. Testing Strategy

### 10.1 Unit Tests
- Test MessageRenderer with different content types
- Test file upload validation
- Test HTML sanitization
- Test chart data parsing

### 10.2 Integration Tests
- Test message sending with global instructions
- Test file upload end-to-end
- Test voice message recording and playback
- Test admin APIs

### 10.3 E2E Tests
- Test complete chat flow
- Test rich content rendering
- Test mobile responsive behavior
- Test admin dashboard workflows

---

**Document Version**: 1.0  
**Created**: 2026-04-21  
**Status**: Ready for Implementation
