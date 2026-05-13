# PRD: Multi-Workspace Task Management Platform

## 1. Product Vision
Build a flexible work OS that can be used by anyone:
- individuals
- small teams
- agencies
- startups
- UMKM
- enterprises

The product should feel closer to Notion, Discord, and ClickUp than a single-organization internal tool. A user can sign up, create a workspace, join other workspaces, and manage projects, tasks, chat, AI agents, and organizational structure inside each workspace.

The product must support both:
- personal use
- team/workspace use

So a new user can either work alone or immediately build a shared workspace with other people.

## 2. Problem Statement
The current system is too close to a single-company database model:
- users are mixed with organization structure
- roles are partly global and partly operational
- team members are stored like config values in some places
- admin logic is still ambiguous between platform admin and workspace admin

This makes the app hard to scale for:
- multiple companies
- invite-based onboarding
- self-serve workspace creation
- per-workspace roles and permissions

## 3. Product Goals
1. Support self-serve signup and login.
2. Let users create or join workspaces.
3. Support multiple workspaces per account.
4. Support workspace-specific hierarchies and roles.
5. Keep projects, tasks, chat, and AI scoped to the active workspace.
6. Preserve a separate platform admin layer for the app owner.
7. Keep the system simple enough for small teams, but powerful enough for enterprises.
8. Allow users to continue with a personal workspace if they are not joining a team yet.
9. Make onboarding understandable for non-technical users.
10. Keep the architecture flexible enough to scale from solo users to multi-company organizations.
11. Minimize the number of decisions required before a user can start working.
12. Make the first successful action happen as fast as possible.
13. Automate any safe step that does not need explicit user choice.
14. Reduce repetitive setup by remembering and reusing user/workspace preferences.
15. Let the system proactively suggest the next best action.
16. Make every product requirement precise enough that an AI agent or CLI can implement it without guessing.
17. Avoid ambiguous wording, hidden assumptions, and missing acceptance criteria.

## 4. Non-Goals
- Do not build a rigid single-company org model.
- Do not force every workspace to use deep hierarchy.
- Do not make `brain_config.team` the source of truth for members.
- Do not mix platform administration with workspace ownership.
- Do not require every user to belong to a company on first login.
- Do not force deep org structure for a personal workspace.
- Do not overload first-time users with advanced settings.
- Do not require users to understand the database, roles, or hierarchy before they can start.
- Do not force users to repeat setup steps that the system can infer safely.
- Do not make automation feel surprising or risky.
- Do not leave requirements open to interpretation when a precise rule is possible.

## 5. Core Concepts

### 5.1 Account
The person who signs up and logs in.
One account can belong to many workspaces.
An account is the identity layer, not the workspace itself.

### 5.2 Workspace
The primary container for work.
Examples:
- Raymaizing Team
- Agency X
- Personal Workspace
Each workspace has its own members, settings, org structure, projects, tasks, chat, and AI agents.

### 5.3 Workspace Member
The relationship between an account and a workspace.
This is where workspace role lives:
- owner
- admin
- manager
- member
- guest

### 5.4 Organization
The internal structure inside a workspace.
Examples:
- company
- division
- department
- team
- sub-team
This should be flexible:
- a solo workspace may have no org tree at all
- a small team may only use one or two levels
- an enterprise may use a deep tree with many units
The UI should never force users to fully configure this on day one.

### 5.5 Platform Admin
The owner/operator of the SaaS platform.
This role is outside normal workspace membership and is used for:
- platform-wide moderation
- troubleshooting
- support
- global configuration

## 5.6 Requirement Style
Every requirement in this PRD should be written so that:
- one sentence maps to one intended behavior
- every action has a clear input, output, and owner
- every automatic behavior has a fallback or safe failure mode
- every permission rule names the exact role or scope
- every UI requirement names the expected user outcome
- every data requirement names the source of truth
- every migration requirement names what changes, what stays, and what is deprecated
- every verification step can be checked by a test, query, or visible UI state

## 6. User Roles

### Platform Roles
- `platform_admin`: full system access
- `support_admin`: limited support access, if needed later

### Workspace Roles
- `owner`: full control of a workspace
- `admin`: manages members, settings, agents, roles
- `manager`: manages assigned teams, projects, tasks
- `member`: normal contributor
- `guest`: limited read-only or scoped access

### Role Meaning
- `owner`: owns the workspace and can transfer ownership later
- `admin`: manages settings, members, roles, organization, and AI agents
- `manager`: manages execution scope for assigned teams/projects
- `member`: contributes to tasks and conversations
- `guest`: sees only what is explicitly shared

## 7. Primary User Flows

### 7.1 Sign Up
1. User creates account.
2. System offers a choice:
   - create a personal workspace
   - create a team workspace
   - join an existing workspace via invite
3. User lands in their active workspace.
4. The default choice should be the simplest path, not the most feature-rich one.
5. If the user skips a choice, the system should pick the safest default.
6. The signup flow must never require the user to understand internal system terms.

### 7.2 Login
1. User logs in.
2. System resolves available workspaces.
3. If the user has no workspace yet, the system must create a safe starter workspace automatically.
4. If the user belongs to more than one workspace, show a workspace switcher.
5. If the user only belongs to one workspace, open it directly.
6. If the user is new or confused, show one clear next step instead of many choices.
7. The login result must always resolve to one active workspace or a clear next action.

### 7.3 Create Workspace
1. User enters workspace name.
2. System creates workspace.
3. User becomes `owner`.
4. Default structure and defaults are seeded.
5. User can optionally add team members later or skip onboarding.
6. The creation form should ask only for the minimum required fields.
7. All optional configuration must be deferred until after the workspace exists.
8. The system should auto-create a useful starter workspace layout.
9. The system should auto-seed basic defaults so the workspace feels ready immediately.
10. The create-workspace action must be idempotent enough that a retry does not create a confusing duplicate state.

### 7.4 Invite / Join Workspace
1. Owner/admin generates invite link or code.
2. Invitee joins workspace.
3. Invitee receives a role.
4. Optional approval flow for restricted workspaces.
5. Invite can be:
   - public join link
   - invite code
   - email invite
   - admin approval queue
6. Join flow should work before the invitee has any content in the workspace.
7. Invite messages should be plain language and not use internal jargon.
8. After joining, the system should automatically place the user in the correct workspace context.
9. Every invite must clearly state what workspace the user is joining and what role they will receive.

### 7.5 Build Organization
1. Workspace owner/admin creates company/division/team tree.
2. Members are assigned to org units.
3. Tasks, projects, and AI agents can use those assignments for visibility and routing.
4. Org structure can be reworked without breaking account identity.
5. This can be skipped entirely for a small or personal workspace.
6. The system should suggest likely divisions/teams from existing data when possible.
7. If confidence is high, the system may auto-assign members to a unit.
8. Any auto-assignment must be traceable and reversible.

### 7.6 Personal Workspace
1. User signs up and chooses personal workspace.
2. System creates a private workspace with one member.
3. User can later invite others or convert it into a team workspace.
4. Personal workspace should still support projects, tasks, chat, and AI.
5. Personal workspace should look and behave like the team version, just with fewer people.
6. The system should create a sensible starter setup automatically.
7. Personal workspace must be a first-class path, not a degraded mode.
8. If an existing account has no workspace membership yet, the system should bootstrap a personal workspace automatically at login or session restore.

### 7.7 First-Time Experience
1. User sees one obvious next action after login.
2. User can start with:
   - create a task
   - create a project
   - invite a teammate
   - open chat
3. The app should avoid showing too many empty admin panels before the user has data.
4. Empty states should explain the next step in one sentence.
5. If the user does nothing, the system should surface a gentle suggestion rather than a dead end.
6. The app should remember the last useful action and offer it again when appropriate.
7. The first-time experience must have one obvious success path and no dead ends.

### 7.8 Automation-First Behavior
1. Automatically choose sensible defaults when the user has not provided one.
2. Automatically fill likely values from existing data.
3. Automatically keep the active workspace selected.
4. Automatically suggest owner/admin/member roles when joining or creating a workspace.
5. Automatically show the next best action in empty states and dashboards.
6. Automatically create baseline entities like starter categories, statuses, and AI assistants when useful.
7. Automatically preselect the most likely project/task assignee if the confidence is high enough.
8. Automatically keep advanced configuration hidden until the user needs it.
9. Any automatic action must have a safe fallback and a visible explanation.
10. Any automatic action that changes data must be reversible or clearly documented as irreversible.

## 8. Functional Scope

### 8.1 Projects
- Workspace-scoped project creation
- owner/member assignment
- visibility rules by role and org unit
- support for categories, status, progress, due dates
- project ownership must belong to a workspace member, not a global system user outside workspace scope

### 8.2 Tasks
- Workspace-scoped task creation
- assignment to workspace members
- optional org-unit linking
- status/priority/progress defaults
- tasks may be private, assigned, or visible by workspace/org rules

### 8.3 Chat
- Workspace chat channels or sessions
- direct chat between members
- AI agent chat
- all participants resolved from workspace membership
- chat should support both human-to-human and human-to-AI conversations
- conversation access must follow workspace membership rules

### 8.4 AI Assistant
- Workspace-aware assistant
- Personal assistant per user
- Shared agents per workspace
- Agents can be assigned to roles or org units
- AI should understand the currently active workspace context
- AI should not mix data between workspaces

### 8.5 Settings
- Workspace settings
- member management
- role management
- organization management
- defaults for task/project creation
- onboarding defaults for new workspace setup
- invite and access controls
- settings pages should be grouped by simple labels, not technical modules
- settings should expose automation toggles only when the user needs control over them

## 8.6 Technical Clarity Rules
- Use exact names for entities, roles, and routes when they already exist in the codebase.
- If a new name is introduced, define it once and use it consistently.
- Do not use two different names for the same concept.
- Do not describe a rule in two contradictory ways.
- Do not mix UI behavior and backend behavior in one requirement unless both are required together.
- Each screen should have one primary purpose.
- Each API route should have one clear responsibility.
- Each database migration should be scoped to one logical change set.
- Each automated decision should define its confidence threshold or fallback behavior.
- Every list in the PRD should either be complete or explicitly marked as examples.

## 8.7 Simplicity Rules
- Use plain labels like `Members`, `Projects`, `Tasks`, `Chat`, `Settings`.
- Avoid exposing database terms like `org_unit`, `hierarchy_level`, or `workspace_member` in the UI.
- Prefer one primary button per screen.
- Prefer smart defaults over asking users to choose too many options.
- Hide advanced controls behind an `Advanced` section or an overflow menu.
- Keep forms short and split complex setup into steps.
- Auto-fill anything that can be inferred safely.
- Make destructive actions rare and clearly labeled.
- Use helpful empty states with exactly one obvious next action.
- Default to the workspace the user was last using.
- Remember the user's last view, filters, and selected workspace.
- If the system can choose a safe default, it should.

## 8.8 Automation Rules
- Auto-create starter content when a workspace is created.
- Auto-suggest the next action after login, project creation, or task completion.
- Auto-assign members only when the match confidence is high.
- Auto-fill project/task metadata from title, workspace context, and prior patterns.
- Auto-hide complexity until the user asks for it.
- Auto-save drafts and partial setup so users do not lose progress.
- Auto-remember the last selected workspace, filters, and view mode.
- Auto-surface incomplete setup only when it blocks the next task.
- Auto-generate safe defaults for categories, statuses, and progress values.
- Auto-route AI responses based on workspace context and the type of user request.
- Auto-protect against confusing choices by limiting visible options to the most relevant ones.
- Auto-generated suggestions must never overwrite user-owned data without confirmation unless the rule explicitly says it is safe.

## 8.9 Precision Rules for AI / CLI Execution
- Every task in this PRD must be actionable without guessing missing names, file paths, or role meanings.
- If a step depends on a specific table, route, file, or field, name it explicitly.
- If a step can fail, state the failure mode and the fallback.
- If a step is optional, label it optional.
- If a step is required, label it required.
- If a step should be done once, say once.
- If a step should be repeated, say how often or under what trigger.
- If a step touches data, specify whether it is a read, write, or migration step.
- If a step changes permissions, specify whether it affects platform scope, workspace scope, or both.
- If a step affects users, specify whether the change is visible immediately or only after refresh/login/redeploy.

## 9. Data Model Direction

### 9.1 New Core Tables
Recommended final direction:
- `accounts` or reuse `users` as the identity table
- `workspaces`
- `workspace_members`
- `workspace_invites`
- `workspace_roles`
- `organizations`
- `org_units`
- `org_unit_members`
- `projects`
- `tasks`
- `chat_conversations`
- `chat_members`
- `chat_messages`
- `ai_agents`
- `agent_role_assignments`

### 9.2 Current Data That Should Stop Being Source of Truth
- `brain_config.team`
- manual team member lists in settings
- hardcoded admin-only visibility rules that ignore workspace roles
- single-workspace assumptions in API routes and filters

### 9.3 Current Data That Can Stay
- `brain_config.status`
- `brain_config.priority`
- `brain_config.progress`
- `brain_config.category`
- `brain_defaults`

## 10. Permission Model

### Platform Layer
- platform admin can inspect all workspaces
- platform admin can handle system configuration and support

### Workspace Layer
- owner/admin can manage workspace settings, members, roles, organization, AI agents
- manager can manage assigned teams and project/task scope
- member can work on assigned items
- guest can view limited content only
- permissions are evaluated against the active workspace, not globally

### Enforcement Rules
- UI must hide inaccessible actions
- API must enforce permissions server-side
- data queries must be workspace-aware
- no route should trust front-end state for permissions

## 10.1 UX Behavior Rules
- Never block a user with a long setup wizard if a safe default exists.
- Never force the user to understand permissions before they can work.
- Present errors in human language, with one correction path.
- Use confirmations only for destructive actions.
- If a screen has no data, show what to do next rather than a blank canvas.
- Keep navigation stable so users do not get lost.
- Prefer a single workspace picker over multiple unrelated selectors.
- Reduce the number of clicks required for common actions.
- Let automation handle setup whenever the user has not made a strong choice.
- If a suggestion is low-confidence, show it as a suggestion instead of applying it automatically.
- Make every automatic action reversible when practical.
- Use explicit confidence levels for any suggestion that could change data or permissions.
- Never let a UI label imply something the backend does not actually enforce.

## 11. Migration Strategy

### Phase 1
- keep current app working
- stop using `brain_config.team` as source of truth
- use `users + org_unit_staff` as interim membership source
- preserve legacy data while adding the new workspace model

### Phase 2
- introduce workspace tables
- map current users into workspace members
- migrate projects/tasks/chat/agents to workspace scope
- add workspace switcher and invite flow

### Phase 3
- add invites, join flow, and multi-workspace switching
- remove legacy assumptions
- finalize platform admin vs workspace admin separation
- clean up legacy admin-only route logic

## 12. Acceptance Criteria
The product is ready for the next stage when:
- a new user can sign up
- a user can create a workspace
- a user can join a workspace
- a workspace can have its own owner/admin/member structure
- projects/tasks/chat/AI all work inside the selected workspace
- platform admin remains separate from workspace admin
- legacy team config is no longer required for core behavior
- a user can switch between multiple workspaces
- a personal workspace works without requiring an organization tree
- invite/join flows work without manual database edits
- access control is consistent across UI and API
- a first-time user can reach a useful screen without reading documentation
- a very non-technical user can create a workspace and make a task without help
- the app can be understood mostly by labels and layout, not by training
- the app proactively reduces work for the user instead of waiting for manual input
- a new user can get value from the system before configuring advanced settings
- the system auto-suggests or auto-fills common actions where safe
- a developer or AI agent can implement the PRD without needing clarification on naming, scope, or expected outcomes
- every major behavior in the PRD has a clear success condition

## 12.3 Execution Quality Acceptance Criteria
- No requirement should rely on implied context alone.
- No requirement should use vague terms like "some", "etc", or "maybe" when specificity is possible.
- No requirement should conflict with another requirement.
- Every migration step should be checkable by query or test.
- Every permission rule should be checkable by role-based test or API response.
- Every UX flow should be checkable by a visible screen state.
- Every automatic action should be checkable by logs, UI feedback, or resulting data state.

## 12.2 Automation Acceptance Criteria
- New workspaces appear usable immediately after creation.
- Accounts with no workspace membership are automatically given a starter personal workspace on first login.
- Common defaults are seeded automatically.
- Users do not need to manually configure every field before they can work.
- High-confidence recommendations may be applied automatically.
- Low-confidence recommendations are shown as suggestions only.
- Users can undo or change automatic decisions where appropriate.

## 12.1 Simplicity Acceptance Criteria
- The first screen after login shows only the most important next action.
- New users are not forced into organization setup.
- Advanced features do not block basic usage.
- Empty states explain what to do in plain language.
- Forms stay short and do not ask for unnecessary fields.
- Users can recover from mistakes without losing work.
- Common tasks should be possible in a few clicks.

## 13. Risks
- legacy data may still contain owner/assignee strings instead of true workspace membership
- permissions can drift if UI and API are not enforced together
- multi-workspace switching may expose hidden assumptions in chat, AI, and reporting
- migrating old data too aggressively could break current production workflows
- onboarding complexity may confuse users if the first-time flow is not kept simple
- too many settings or role choices can overwhelm beginners
- jargon-heavy UI can make the product feel harder than it is
- too much automation can feel opaque if the app does not explain what happened
- unsafe auto-actions could create confusion if confidence and reversibility are not handled well
- ambiguity in the PRD could cause AI or CLI implementation drift

## 14. Decisions Locked In
- Multi-workspace is the target architecture.
- Workspace members are the source of truth for people in a workspace.
- `brain_config.team` is deprecated as a core data source.
- Platform admin and workspace admin are different layers.
- Current app must remain usable during migration.
- Personal workspace is a first-class mode, not a workaround.
- Invite-based onboarding is part of the core product, not an afterthought.
- Simplicity is a product requirement, not a visual preference.
- Default behavior should favor the least confusing path.
- Automation is a product feature, not just a backend convenience.
- Safe defaults are preferred over extra prompts.
- The PRD must remain explicit enough to drive implementation with minimal back-and-forth.
- If a requirement is not clear enough to test, it is not complete enough to ship.

## 15. Current Status Snapshot
- Build and typecheck are green.
- Legacy `team` config rows have been removed from active use.
- Organization membership has been migrated into MySQL tables.
- Admin panel has been split into separate routes.
- AI is already running through Groq.
- The system is ready for the workspace-platform rewrite phase.
- The PRD now includes UX constraints for beginner-friendly onboarding.

## 16. Implementation Handoff
Next work should start from this order:
1. add workspace tables and invite flow
2. map current users into workspace membership
3. scope projects/tasks/chat/agents to workspace
4. finalize login/signup workspace switching
5. add platform admin dashboard for multi-workspace oversight
6. remove remaining single-workspace assumptions from data queries and UI
7. add personal workspace creation as a default onboarding path
8. simplify the first-run experience before adding any advanced setup
9. add automation hooks for smart defaults, suggestions, and auto-seeding
