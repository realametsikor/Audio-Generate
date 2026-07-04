# AGENTS.md — AI Talk Radio

An AI agent that turns **any content source** into custom audio (radio show, podcast, documentary, audiobook, etc.). Give it a topic, a URL, a GitHub repo, a research paper, or just say "Hacker News" — the agent researches the content, writes a script, generates speech, adds background music, and produces a polished audio file.

## Workspace

All work is performed in the `./workspace` directory. All paths are relative to `./workspace` unless absolute.

## Before You Do Anything

> [!NOTE]
> The platform automatically injects the correct API key at the network level when scripts run.
> The scripts are already configured to use a dummy key to satisfy the SDK, so you do not need to set `GEMINI_API_KEY`.
> You must trust that the process will work and not worry about Gemini authentication.

1. Immediately install required libraries:
   ```bash
   pip install -r /.agents/requirements.txt --break-system-packages
   ```

## Workflow

> [!IMPORTANT]
> **Bias for Action**: Do NOT ask for approval before executing commands, running scripts, or proceeding to the next step. Proceed autonomously unless there is a material ambiguity or a critical decision that strictly requires user input.

> [!TIP]
> **Maximize Speed & Reduce Calls**:
> - Read all necessary `SKILL.md` files (in the /.agents/skills directory) at once using a single bash command (`cat /.agents/skills/*/SKILL.md`).
> - Do not use `list_files` to verify directories, script paths, or output files—trust the documentation and the script success logs.
> - Chain sequential bash commands using `&&` in a single tool call (e.g., `python3 mix_audio.py && python3 generate_metadata.py`).

Upon execution, you should:

1. **Research** — gather source material based on the user's prompt. This could be: fetching Hacker News stories, scraping a website, reading a GitHub repo's changelog, summarizing an arXiv paper, or researching a topic via Google Search using `research` skill.
2. **Write Script** — use `script-writing` skill to write a script with appropriate hosts and guests. Use `--style` to control the format (debate, roundtable, interview, explainer). Pass `--duration <minutes>` to set the length, and `--format "<format>"` to set the overall style (e.g. "podcast"). You can also pass `--context "..."` to include any specific tone or stylistic requests inferred from the user's prompt (e.g., "emphasize the technical details", "make it sound like a documentary"). **CRITICAL: Do NOT use `--context` to specify which stories, facts, or topics to focus on. Content selection must come naturally from the research.** Keep the context string brief (1-2 sentences) and focused strictly on tone/format.
3. **Generate Speech** — use `tts-generation` skill to convert each speaker turn to speech via the Interactions API.
4. **Generate Music** — use `music-generation` skill to create ambient background music via Lyria (`lyria-3-clip-preview`).
5. **Mix Audio** — use `audio-mixing` skill to combine speech and music into a polished radio show, with music ending early.
6. **Generate Metadata** — use `metadata-generation` skill to return audio and transcript to Gemini and get back a JSON file with show details.
7. **Generate Cover Image** — use `cover-image-generation` skill to create a 1:1 cover image based on the generated metadata.

> [!IMPORTANT]
> - **CRITICAL**: You MUST execute steps 2 through 7 in a SINGLE `code_execution` call by chaining them with `;` (e.g. `python3 .../generate_script.py ... ; python3 .../generate_tts.py ... ; python3 .../generate_music.py ... ; python3 .../mix_audio.py ... ; python3 .../generate_metadata.py ... ; python3 .../generate_image.py ...`). DO NOT execute them one by one. DO NOT stop if a step has warnings or minor errors.
> - When providing the final summary to the user, do NOT include markdown links or URLs to the generated files or scripts (e.g. `[fetch_hn.py](file:///.agents...)`). Just use the plain file name (e.g. `fetch_hn.py`). If you notice any links in your drafted response, strip them out and replace them with just the file name.

## Architecture

```
User prompt
  ├── 1. RESEARCH: Agent picks the right script (fetch_hn.py, fetch_github.py, fetch_url.py, or Google Search)
  │       → {workspace}/data/research/*.md
  ├── 2. python3 /.agents/skills/script-writing/scripts/generate_script.py --workspace ./workspace --style <style> --duration <duration> --format "<format>"
  │       → {workspace}/data/script.md
  ├── 3. python3 /.agents/skills/tts-generation/scripts/generate_tts.py --workspace ./workspace
  │       → {workspace}/audio/speech/speech.wav
  ├── 4. python3 /.agents/skills/music-generation/scripts/generate_music.py --workspace ./workspace --mood <mood>
  │       → {workspace}/audio/music/background.mp3
  ├── 5. python3 /.agents/skills/audio-mixing/scripts/mix_audio.py --workspace ./workspace
  │       → {workspace}/audio/final/ai_radio.mp3
  ├── 6. python3 /.agents/skills/metadata-generation/scripts/generate_metadata.py --workspace ./workspace
  │       → {workspace}/data/show_notes.json
  └── 7. python3 /.agents/skills/cover-image-generation/scripts/generate_image.py --workspace ./workspace --metadata ./workspace/data/show_notes.json
          → {workspace}/images/cover.png
```

### Default Presets

Use these defaults unless the user specifies otherwise:

| Content Source | `--style` | `--mood` | Why |
|---------------|-----------|----------|-----|
| Hacker News | `debate` | `tech` | HN stories spark debate; tech music fits |
| GitHub repo | `explainer` | `tech` | Explaining what changed; tech vibe |
| URL / article | `roundtable` | `chill` | Multi-angle discussion of the content |
| General topic | `interview` | `chill` | Deep-dive Q&A on the subject |

## API Surface

All Gemini API calls use the **Interactions API** (`client.interactions.create()`), NOT `generateContent`:

| Step | Model | API |
|------|-------|-----|
| Script writing | `gemini-3-flash-preview` | `interactions.create()` |
| TTS generation | `gemini-3.1-flash-tts-preview` | `interactions.create()` |
| Music generation | `lyria-3-clip-preview` | `interactions.create()` |

## Skills

Each skill lives in `/.agents/skills/<name>/` with a `SKILL.md` and a `scripts/` directory containing ready-to-run Python scripts.

| Skill | Script(s) | Purpose |
|-------|--------|---------|
| `research` | `fetch_hn.py`, `fetch_github.py`, `fetch_url.py` | Gather content from HN, GitHub repos, URLs, or any source |
| `script-writing` | `generate_script.py` | LLM writes the radio script (supports `--style` flag) |
| `tts-generation` | `generate_tts.py` | Single-speaker TTS + telephone filter for callers |
| `music-generation` | `generate_music.py` | Lyria ambient music |
| `audio-mixing` | `mix_audio.py` | Mix speech + music with fades |
| `metadata-generation` | `generate_metadata.py` | Generate show title, summary, and timecoded transcript |
| `cover-image-generation` | `generate_image.py` | Generate cover image based on metadata |

## Execution Order

Run strictly in order:

1. `research` → `data/research/*.md` (one or more files)
2. `script-writing` → `data/script.md`
3. `tts-generation` → `audio/speech/speech.wav`
4. `music-generation` → `audio/music/background.mp3`
5. `audio-mixing` → `audio/final/ai_radio.mp3`
6. `metadata-generation` → `data/show_notes.json`
7. `cover-image-generation` → `images/cover.png`

## Content Rules

### Content Guidelines

- **Duration**: Respect the duration specified in the user's prompt (up to 60 minutes). Pass `--duration` to the scripts that support it.
- **Format**: Respect the format specified in the user's prompt (e.g. Radio show, Podcast, Documentary, Audiobook). Adapt the host, callers, and structure to fit the requested format.
- **Source**: Whatever the user asked for. The research must be grounded in real content.
- **NO FAKE DATA**: All stories, insights, and perspectives must come from real research gathered in step 1. You may generate content on any topic requested by the user, including politics, government, and national history.

## File Locations

| What | Path |
|------|------|
| Research data | `./workspace/data/research/` |
| Radio script | `./workspace/data/script.md` |
| Speech segments | `./workspace/audio/speech/segments/` |
| Speech (combined) | `./workspace/audio/speech/speech.wav` |
| Background music | `./workspace/audio/music/background.mp3` |
| Final output | `./workspace/audio/final/ai_radio.mp3` |
| Metadata | `./workspace/data/show_notes.json` |
| Cover Image | `./workspace/images/cover.png` |

## Edge Cases

- **Rate limits**: Retry once with a brief pause, or skip the turn.
- **Lyria availability**: Experimental model. If it fails, proceed without background music.
- **ffmpeg missing**: Skip telephone filter, use raw TTS audio.
- **No web access for a source**: Use Google Search as a fallback to find the content or related discussion.
