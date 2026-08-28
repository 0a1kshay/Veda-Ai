# VedaAI — AI Assessment Extraction & Answer Mapping

VedaAI is an AI-powered assessment grading and answer mapping platform for educators. It automates the extraction of questions from question papers, detects handwritten answers from student answer sheets, maps answers to their corresponding questions (including out-of-order and multi-page answers), pinpoints exact answer regions on the canvas, and generates automated grading with pedagogical AI feedback.

---

## 🚀 Key Features

->**Question Extraction**: Automatically parses printed exam papers into structured questions, preserving original order, numbers, subquestions (e.g. `11(a)`, `11(b)`), and mark allocations.
->**Handwritten Answer Extraction**: Extracts student handwriting from scanned answer sheets using Gemini Vision with normalized bounding boxes (`[ymin, xmin, ymax, xmax]`).
->**Multi-Tier Question ↔ Answer Mapping**:
  1. **Exact Number Match** (Confidence: 1.0)
  2. **Normalized Number Match** (Confidence: 0.98, handles variations like `Q. 11 (a)`, `11 ( B )`, `3(ii)`)
  3. **Semantic AI Fallback** (Confidence $\ge$ 0.65 for unlabeled / unnumbered answers)

->**Out-of-Order & Subpart Handling**: Seamlessly maps answers submitted out of order while keeping the Question Paper's logical order intact. Subparts `11(a)` and `11(b)` remain separate.

-> **Exact Answer Region Highlighting**: When clicking any question, the answer sheet viewer automatically jumps to the target page and highlights the exact answer region with zoom and responsive scaling support.

-> **Multi-Page Answer Support**: Preserves and highlights answers spanning multiple pages (e.g. `Q12` across Page 3 & Page 4) with 1-click part switching.

->**Unanswered & Unmapped Answer Classification**:
  - Questions without answers are marked `unanswered` with zero ghost highlights.
  - Extraneous answers (e.g. `Q99`) are categorized in an `Unmapped Answers` drawer with full inspection capabilities.

->**Automated AI Grading & Pedagogical Feedback**:
  - Scores answers against maximum question marks ($0 \le \text{score} \le \text{maxScore}$).
  - Evaluates definitions, numerical steps, and explanations.
  - Provides constructive feedback notes, strengths, and areas for improvement.

---

## 🛠 Tech Stack

* **Framework**: Next.js 16 (App Router, Turbopack & Route Handlers)
* **UI & Styling**: React 19, Tailwind CSS, Lucide React Icons
***AI Model & SDK**: Google Gemini (`gemini-3.6-flash`) via `@google/genai` (SDK v2.19.0)
* **Language & Validation**: TypeScript (Strict Mode), ESLint

---

## 🏗 Architecture

```text
Question Paper (PDF / Image)           Student Answer Sheet (PDF / Image)
            │                                           │
            ▼                                           ▼
 POST /api/extract-questions                 POST /api/extract-answers
            │                                           │
    questions[] (1..16)                         answers[] (with bboxes)
            │                                           │
            └───────────────────┬───────────────────────┘
                                │
                                ▼
                       POST /api/map-answers
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
      mappings[] (QP Order)             unmappedAnswers[] (Q99)
              │
              ▼
       POST /api/grade
              │
              ▼
   grades[] + Overall Summary
              │
              ▼
   Interactive Mapping Workspace
   (Canvas Highlighting + Multi-Page Navigation + AI Feedback)
```

---

## 💻 Local Setup

### 1. Clone & Install Dependencies

```bash
cd veda-ai
npm install
```

### 2. Configure Environment Variables

Create `.env.local` in the project root:

```env
# Gemini API Key (Server-side only — never expose to client)
GEMINI_API_KEY=your_gemini_api_key_here

# Configured Gemini model
GEMINI_MODEL=gemini-3.6-flash
```

> **Security Note**: Never prefix `GEMINI_API_KEY` with `NEXT_PUBLIC_`. All AI calls are executed server-side in API route handlers.

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

The repository contains automated unit and pipeline test suites:

```bash
# Run Question ↔ Answer mapping engine tests (27/27 assertions)
npx tsx scripts/test-mapping.ts

# Run complete Phase 4-6 pipeline tests (33/33 assertions)
npx tsx scripts/test-full-pipeline.ts

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint
npm run lint

# Run Production Build
npm run build
```

---

## ⚠️ Limitations & Notes

1. **Handwriting Legibility** — Highly degraded, faded, or heavily illegible handwriting can reduce extraction accuracy.

2. **Bounding Box Precision** — Bounding boxes are generated in normalized 0–1000 coordinate space and projected onto the rendered page dimensions. Minor camera or scan skew may introduce slight padding.

3. **API Rate Limits** — Gemini API usage is subject to model- and project-specific rate limits. The application minimizes unnecessary API calls and provides sample data for development/testing.

4. **Teacher Oversight** — AI grading is designed as an assessment assistant. Educators should review AI-generated grades, particularly for high-stakes examinations.

---

## ✅ Assignment Requirements

|              Requirement                  | Status |
|-------------------------------------------|--------|
| Question paper upload                      | ✅ |
| Student answer sheet upload                | ✅ |
| Processing progress                        | ✅ |
| Question extraction in printed order       | ✅ |
| Subquestion extraction (`11(a)`, `11(b)`)  | ✅ |
| Out-of-order answer mapping                | ✅ |
| Unanswered question detection              | ✅ |
| Unmapped answer detection                  | ✅ |
| Exact answer-region highlighting           | ✅ |
| Multi-page answer support                  | ✅ |
| AI-assisted grading                        | ✅ |
| AI feedback                                | ✅ |
| Live deployment                            | ✅ |

---

## 🌐 Deployment

VedaAI is deployed on Vercel.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Configure the following environment variables:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL=gemini-3.6-flash`
4. Deploy the application.

The following API routes are deployed as Next.js Route Handlers:

- `/api/extract-questions`
- `/api/extract-answers`
- `/api/map-answers`
- `/api/grade`
