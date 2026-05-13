# Tasks: Advanced Chat Enhancement

## Phase 1: Core Enhancements (High Priority)

### Task 1.1: Integrate Global AI Instructions into Runtime
**Status**: pending  
**Priority**: high  
**Estimated Time**: 1 hour

**Description**: Integrate global AI instructions into the message API so all AI responses include global instructions at runtime.

**Acceptance Criteria**:
- Global instructions are injected into system prompt for every AI request
- User context (name, role, projects, tasks) is included
- Agent-specific prompts are preserved and combined with global instructions
- No token limit exceeded

**Files to Modify**:
- `app/api/chat/messages/route.ts`

**Implementation Steps**:
1. Import `getGlobalInstructions` from `lib/ai-global-instructions.ts`
2. Fetch user context (active projects, recent tasks)
3. Call `getGlobalInstructions(userContext)` to get personalized instructions
4. Combine global instructions + agent system prompt
5. Pass combined prompt to Gemini API
6. Test with all 4 AI agents

---

### Task 1.2: Improve Chat UI/UX (Spacing, Typography, Colors)
**Status**: pending  
**Priority**: high  
**Estimated Time**: 2 hours

**Description**: Update chat UI with better spacing, typography, and modern color scheme.

**Acceptance Criteria**:
- Message padding: 20px (from 16px)
- Message margin: 12px (from 8px)
- Container padding: 24px (from 16px)
- Line height: 1.6 (from 1.5)
- Font size: 15px (from 14px)
- Font weight: 450 (from 400)
- User messages: purple (#7C3AED)
- AI messages: green (#10B981)
- Background: light gray (#F9FAFB)

**Files to Modify**:
- `app/chat/Chat.module.css`

**Implementation Steps**:
1. Update CSS variables for spacing
2. Update message bubble styles
3. Update typography styles
4. Update color scheme
5. Test on mobile and desktop

---

### Task 1.3: Install Required Dependencies
**Status**: pending  
**Priority**: high  
**Estimated Time**: 15 minutes

**Description**: Install all required npm packages for rich content rendering.

**Acceptance Criteria**:
- All packages installed successfully
- No version conflicts
- package.json updated

**Packages to Install**:
```bash
npm install react-markdown remark-gfm prismjs recharts dompurify @emoji-mart/data @emoji-mart/react react-dropzone @react-three/fiber three
npm install --save-dev @types/dompurify @types/prismjs @types/three
```

---

### Task 1.4: Create MessageRenderer Component
**Status**: pending  
**Priority**: high  
**Estimated Time**: 3 hours

**Description**: Create comprehensive MessageRenderer component that handles Markdown, code highlighting, HTML, charts, and 3D content.

**Acceptance Criteria**:
- Renders Markdown with react-markdown
- Syntax highlights code with Prism.js
- Sanitizes and renders HTML with DOMPurify
- Renders charts with Recharts
- Renders 3D content with Three.js
- Responsive on mobile and desktop

**Files to Create**:
- `components/chat/MessageRenderer.tsx`
- `components/chat/MessageRenderer.module.css`
- `components/chat/MarkdownRenderer.tsx`
- `components/chat/CodeHighlighter.tsx`
- `components/chat/HTMLRenderer.tsx`
- `components/chat/ChartRenderer.tsx`
- `components/chat/ThreeDRenderer.tsx`

**Implementation Steps**:
1. Create base MessageRenderer component
2. Implement Markdown rendering
3. Implement code syntax highlighting
4. Implement HTML sanitization and rendering
5. Implement chart rendering
6. Implement 3D rendering
7. Add responsive styles
8. Test all content types

---

### Task 1.5: Integrate MessageRenderer into Chat UI
**Status**: pending  
**Priority**: high  
**Estimated Time**: 1 hour

**Description**: Replace simple text rendering with MessageRenderer component in chat UI.

**Acceptance Criteria**:
- MessageRenderer used for all messages
- Content type detection works
- Metadata passed correctly
- No performance issues

**Files to Modify**:
- `app/chat/page.tsx`

**Implementation Steps**:
1. Import MessageRenderer
2. Replace message content div with MessageRenderer
3. Pass msgType and metadata props
4. Test with different content types

---

### Task 1.6: Create TypingIndicator Component
**Status**: pending  
**Priority**: high  
**Estimated Time**: 1 hour

**Description**: Create animated typing indicator for AI responses.

**Acceptance Criteria**:
- Shows animated dots
- Displays AI avatar
- Appears when AI is generating response
- Disappears when response received

**Files to Create**:
- `components/chat/TypingIndicator.tsx`
- `components/chat/TypingIndicator.module.css`

**Files to Modify**:
- `app/chat/page.tsx`

**Implementation Steps**:
1. Create TypingIndicator component
2. Add CSS animations for dots
3. Integrate into chat UI
4. Show/hide based on AI response state

---

## Phase 2: Interactive Features (Medium Priority)

### Task 2.1: Create VoiceMessage Components
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 4 hours

**Description**: Implement voice message recording and playback functionality.

**Acceptance Criteria**:
- Can record audio using microphone
- Shows recording duration
- Can stop/cancel recording
- Uploads audio to server
- Can play back voice messages
- Shows playback progress
- Displays waveform visualization

**Files to Create**:
- `components/chat/VoiceRecorder.tsx`
- `components/chat/VoicePlayer.tsx`
- `components/chat/VoiceMessage.module.css`
- `app/api/chat/voice/route.ts`

**Files to Modify**:
- `app/chat/page.tsx`
- `models/ChatModel.ts`

**Implementation Steps**:
1. Create VoiceRecorder component with MediaRecorder API
2. Create VoicePlayer component with HTML5 audio
3. Create voice upload API endpoint
4. Update database schema for voice_data
5. Integrate into chat composer
6. Test recording and playback

---

### Task 2.2: Create FileAttachment Components
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 4 hours

**Description**: Implement file upload and preview functionality.

**Acceptance Criteria**:
- Can upload multiple files
- Supports drag-and-drop
- Validates file types and sizes
- Shows upload progress
- Displays file previews
- Can download attachments
- Image thumbnails generated

**Files to Create**:
- `components/chat/FileUploader.tsx`
- `components/chat/FilePreview.tsx`
- `components/chat/FileAttachment.module.css`
- `app/api/chat/upload/route.ts`

**Files to Modify**:
- `app/chat/page.tsx`
- `models/ChatModel.ts`

**Implementation Steps**:
1. Create FileUploader with react-dropzone
2. Create FilePreview component
3. Create file upload API endpoint
4. Update database schema for attachments
5. Implement file validation
6. Add thumbnail generation for images
7. Integrate into chat composer
8. Test upload and preview

---

### Task 2.3: Create EmojiPicker Component
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 2 hours

**Description**: Implement emoji picker for message composition.

**Acceptance Criteria**:
- Shows emoji categories
- Has search functionality
- Shows recently used emojis
- Inserts emoji at cursor position
- Supports skin tone selection

**Files to Create**:
- `components/chat/EmojiPicker.tsx`
- `components/chat/EmojiPicker.module.css`

**Files to Modify**:
- `app/chat/page.tsx`

**Implementation Steps**:
1. Create EmojiPicker using @emoji-mart/react
2. Add emoji button to composer
3. Handle emoji selection
4. Insert at cursor position
5. Test emoji insertion

---

### Task 2.4: Create ReactionButtons Component
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 3 hours

**Description**: Implement message reactions with emoji.

**Acceptance Criteria**:
- Shows reaction button on hover
- Displays quick reactions
- Can add custom reactions
- Shows reaction count
- Highlights user's reactions
- Can toggle reactions on/off

**Files to Create**:
- `components/chat/ReactionButtons.tsx`
- `components/chat/ReactionButtons.module.css`
- `app/api/chat/reactions/route.ts`

**Files to Modify**:
- `app/chat/page.tsx`
- `models/ChatModel.ts`

**Implementation Steps**:
1. Create database table for reactions
2. Create ReactionButtons component
3. Create reactions API endpoint
4. Add reaction methods to ChatModel
5. Integrate into message display
6. Test adding/removing reactions

---

### Task 2.5: Create QuickReplyButtons Component
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 2 hours

**Description**: Implement quick reply buttons for AI messages.

**Acceptance Criteria**:
- Renders buttons from AI message metadata
- Sends button value as message when clicked
- Disables buttons after selection
- Responsive layout

**Files to Create**:
- `components/chat/QuickReplyButtons.tsx`
- `components/chat/QuickReplyButtons.module.css`

**Files to Modify**:
- `components/chat/MessageRenderer.tsx`

**Implementation Steps**:
1. Create QuickReplyButtons component
2. Parse button data from message metadata
3. Handle button clicks
4. Disable after selection
5. Add responsive styles
6. Test with AI responses

---

### Task 2.6: Create InteractiveDropdown Component
**Status**: pending  
**Priority**: medium  
**Estimated Time**: 2 hours

**Description**: Implement interactive dropdown menus in messages.

**Acceptance Criteria**:
- Renders dropdown from message metadata
- Shows all options
- Supports search/filter
- Sends selection as message
- Supports multi-select

**Files to Create**:
- `components/chat/InteractiveDropdown.tsx`
- `components/chat/InteractiveDropdown.module.css`

**Files to Modify**:
- `components/chat/MessageRenderer.tsx`

**Implementation Steps**:
1. Create InteractiveDropdown component
2. Parse dropdown data from metadata
3. Implement search/filter
4. Handle selection
5. Support multi-select
6. Test with AI responses

---

## Phase 3: Admin Dashboard (Low Priority)

### Task 3.1: Create Admin Layout and Navigation
**Status**: pending  
**Priority**: low  
**Estimated Time**: 2 hours

**Description**: Create admin dashboard layout with navigation.

**Acceptance Criteria**:
- Admin-only access
- Navigation menu
- Responsive layout
- Breadcrumbs

**Files to Create**:
- `app/admin/layout.tsx`
- `app/admin/page.tsx`
- `components/admin/AdminNav.tsx`

---

### Task 3.2: Create ConversationManager Component
**Status**: pending  
**Priority**: low  
**Estimated Time**: 4 hours

**Description**: Admin interface to view and manage all conversations.

**Acceptance Criteria**:
- Lists all conversations
- Shows participants and metadata
- Search and filter functionality
- Can view message history
- Pagination

**Files to Create**:
- `app/admin/conversations/page.tsx`
- `components/admin/ConversationManager.tsx`
- `app/api/admin/conversations/route.ts`

---

### Task 3.3: Create AgentEditor Component
**Status**: pending  
**Priority**: low  
**Estimated Time**: 4 hours

**Description**: Admin interface to edit AI agents.

**Acceptance Criteria**:
- Lists all agents
- Can edit agent properties
- Can update system prompts
- Can update knowledge base
- Can test agent responses
- Can toggle active status

**Files to Create**:
- `app/admin/agents/page.tsx`
- `components/admin/AgentEditor.tsx`
- `app/api/admin/agents/[id]/route.ts`

---

### Task 3.4: Create UserManager Component
**Status**: pending  
**Priority**: low  
**Estimated Time**: 3 hours

**Description**: Admin interface to manage users.

**Acceptance Criteria**:
- Lists all users
- Shows user details
- Can edit user roles
- Can deactivate users
- Can reset passwords
- Search functionality

**Files to Create**:
- `app/admin/users/page.tsx`
- `components/admin/UserManager.tsx`
- `app/api/admin/users/route.ts`

---

### Task 3.5: Create AnalyticsDashboard Component
**Status**: pending  
**Priority**: low  
**Estimated Time**: 4 hours

**Description**: Admin analytics dashboard with metrics and charts.

**Acceptance Criteria**:
- Shows key metrics
- Message volume charts
- User engagement stats
- AI agent performance
- Date range selection
- Export functionality

**Files to Create**:
- `app/admin/analytics/page.tsx`
- `components/admin/AnalyticsDashboard.tsx`
- `app/api/admin/analytics/route.ts`
- `models/AdminModel.ts`

---

### Task 3.6: Create SystemConfig Component
**Status**: pending  
**Priority**: low  
**Estimated Time**: 3 hours

**Description**: Admin interface for system configuration.

**Acceptance Criteria**:
- Can edit Gemini API key
- Can configure file limits
- Can edit global instructions
- Can enable/disable features
- Validates configuration

**Files to Create**:
- `app/admin/config/page.tsx`
- `components/admin/SystemConfig.tsx`
- `app/api/admin/config/route.ts`

---

## Phase 4: Database Updates

### Task 4.1: Update Database Schema
**Status**: pending  
**Priority**: high  
**Estimated Time**: 30 minutes

**Description**: Add new columns and tables to support enhanced features.

**Acceptance Criteria**:
- chat_messages table updated with new columns
- message_reactions table created
- system_config table created
- All migrations successful

**Files to Create**:
- `scripts/update-chat-schema.js`

**SQL Changes**:
```sql
-- Add columns to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN attachments JSON DEFAULT NULL,
ADD COLUMN voice_data JSON DEFAULT NULL,
ADD COLUMN render_type ENUM('text', 'markdown', 'html', 'code', 'chart', '3d') DEFAULT 'text',
ADD COLUMN metadata JSON DEFAULT NULL;

-- Create message_reactions table
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

-- Create system_config table
CREATE TABLE system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Summary

**Total Tasks**: 22
**Phase 1 (High Priority)**: 6 tasks (~9 hours)
**Phase 2 (Medium Priority)**: 6 tasks (~19 hours)
**Phase 3 (Low Priority)**: 6 tasks (~20 hours)
**Phase 4 (Database)**: 1 task (~0.5 hours)

**Total Estimated Time**: ~48.5 hours

**Recommended Execution Order**:
1. Task 1.3 (Install dependencies)
2. Task 4.1 (Database updates)
3. Task 1.1 (Global AI instructions)
4. Task 1.2 (UI/UX improvements)
5. Task 1.4 (MessageRenderer)
6. Task 1.5 (Integrate MessageRenderer)
7. Task 1.6 (TypingIndicator)
8. Continue with Phase 2 tasks
9. Complete with Phase 3 admin tasks

---

**Document Version**: 1.0  
**Created**: 2026-04-21  
**Status**: Ready for Execution
