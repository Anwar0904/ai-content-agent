<div align="center">

# AI Content Agent

**Open-source AI content automation platform for short-form video creation, human review, and multi-platform social publishing.**

Turn a single content idea into a publish-ready short-form video — automatically scripted, rendered, reviewed, and published across social platforms.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-green?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-video%20engine-red?logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Stars](https://img.shields.io/github/stars/Anwar0904/ai-content-agent?style=social)](https://github.com/Anwar0904/ai-content-agent/stargazers)

**AI content automation · Short-form video generation · Social media automation · Next.js · MongoDB · FFmpeg**

</div>

---

## Table of Contents

- [Why AI Content Agent](#why-ai-content-agent)
- [Key Features](#key-features)
- [Current Status](#current-status)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Design Principles](#design-principles)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why AI Content Agent

Creating consistent short-form video content for TikTok, Instagram Reels, and Facebook usually means stitching together a dozen disconnected tools — one for research, one for scripting, one for AI voiceover, one for editing, one for scheduling, one for analytics.

**AI Content Agent** is an open-source, self-hostable alternative: a single **AI content automation pipeline** that takes you from raw idea to a rendered, human-approved, multi-platform-published video — without leaving one system.

> Content creation should be a workflow, not a pile of disconnected tools.

If you're searching for an **open-source AI video generation tool**, a **social media automation platform**, or a **self-hosted alternative to closed content pipelines**, this project is built for that use case.

---

## Key Features

- 🎯 **Campaign-based content planning** — define topic, audience, style, and video count once; generate many related videos from it
- 🤖 **AI-assisted script & content generation** *(in progress)* — structured pipeline from idea → hook → script → scene → caption → hashtags
- 🎬 **Automated short-form video rendering** via **FFmpeg** *(in progress)* — narration, visuals, subtitles, and templates combined into vertical, platform-ready video
- ✅ **Human-in-the-loop review** — approve, reject, or regenerate before anything goes live
- 📤 **Multi-platform publishing** *(in progress)* — Facebook, Instagram, and beyond, each as an independent, retryable job
- 📊 **Performance analytics & optimization loop** *(planned)* — learn from published content to improve future output
- 🧩 **Provider-agnostic architecture** — not locked into a single LLM or publishing API

---

## Current Status

**Actively in development.** Already working:

- Dashboard interface
- Full campaign creation workflow (frontend → API → MongoDB)
- Zod-based request validation
- The architectural foundation for AI generation, video rendering, and publishing

**Coming next:** AI script generation, FFmpeg-based video rendering, human approval workflow, and Meta (Facebook/Instagram) publishing.

---

## How It Works

```
Idea → Campaign → AI Script → Scenes & Assets → Rendered Video
     → Human Review → Multi-Platform Publish → Analytics → Optimization
```

Instead of one opaque AI agent, AI Content Agent is a **deterministic, inspectable pipeline** — every step produces structured data you can review, edit, or regenerate before it moves forward. This makes it a practical foundation for teams who want **AI-powered content automation** without giving up editorial control.

---

## Architecture

```
Next.js App → API Layer → Campaign Management / AI Services / Publishing Services
                                    │             │                │
                                MongoDB          LLMs          Social APIs
                                                   │
                                            Video Pipeline (FFmpeg)
                                                   │
                                            Human Approval → Publishing
```

UI, API logic, database models, AI services, video processing, and publishing providers are kept in separate layers by design — so any piece can be tested, swapped, or extended independently.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Next.js Route Handlers, Node.js, TypeScript, Zod |
| **Database** | MongoDB, Mongoose |
| **AI Layer** | Provider-agnostic — works with modern LLM & generative media APIs |
| **Video Engine** | FFmpeg |
| **Planned Integrations** | Meta Publishing API, Facebook Pages, Instagram |

---

## Data Model

```
Campaign ──< Video ──< PublishJob >── SocialAccount
```

One campaign → many videos. One video → many publish jobs, one per destination. Simple on purpose — the complexity lives in the pipeline, not the schema.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- MongoDB
- FFmpeg

### Installation

```bash
git clone https://github.com/Anwar0904/ai-content-agent.git
cd ai-content-agent
npm install
cp .env.example .env.local   # set MONGODB_URI at minimum
npm run dev
```

Open **http://localhost:3000/dashboard**.

### Quick Start

1. Go to `/campaigns/new`
2. Fill in topic, audience, style, video count, and target duration
3. Submit — validated on the client and again on the server
4. View it live at `/campaigns`, reading straight from MongoDB (no mock data)

---

## API Reference

### Create a Campaign

```http
POST /api/campaigns
Content-Type: application/json
```

```json
{
  "title": "AI Tools for Developers",
  "topic": "AI tools for developers",
  "audience": "Developers",
  "videoCount": 3,
  "style": "Educational",
  "durationMin": 30,
  "durationMax": 45
}
```

Returns `201 Created` with the new campaign.

### List Campaigns

```http
GET /api/campaigns
```

Returns all campaigns, newest first.

---

## Design Principles

- **Automation with control** — AI handles the repetitive work; a human still approves what ships
- **Structured output over raw text** — generated content is validated, storable data, not a blob to parse later
- **Provider independence** — AI and publishing services sit behind interfaces, so swapping a vendor doesn't mean rewriting the app
- **Deterministic before agentic** — a reliable pipeline comes first; autonomous behavior is layered on only once that foundation holds

---

## Security

API keys, OAuth tokens, and database credentials are server-side only — never exposed to the client. Publishing jobs are isolated per destination, so a failed post can be retried without affecting anything else.

---

## Roadmap

| Area | Planned |
|---|---|
| **Content Intelligence** | Idea, hook, script, caption & hashtag generation; content quality scoring |
| **Video Production** | Scene & asset generation, AI voiceover, subtitles, reusable templates, automated rendering |
| **Publishing** | Social account connections, Facebook & Instagram publishing, scheduling, retries, history |
| **Analytics** | Performance collection, engagement analysis, AI-generated insights |
| **Optimization** | A feedback loop that uses performance data to improve future content |

---

## Why This Project Exists

Generating a script with AI is the easy part. Generating something consistently *useful*, getting it reviewed, rendering it correctly, publishing it reliably across platforms, and learning from how it performs — that's the real engineering problem. This project explores that boundary between **AI generation** and **real-world content automation**.

---

## Contributing

Contributions are welcome. Open an issue before starting on anything sizable so the approach can be discussed first. Keep PRs focused, follow existing TypeScript conventions, and add tests where it makes sense. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

---

## License

Licensed under the [MIT License](LICENSE).

---

<div align="center">

Built by **[Anwar Ul Haq](https://github.com/Anwar0904)**

*An open-source exploration of AI automation, short-form video generation, and social publishing infrastructure.*

⭐ **If this project is useful to you, consider starring the repo — it helps others discover it.**

</div>
