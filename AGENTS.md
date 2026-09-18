# Project working rules

## Current scope — latest user instruction, 2026-09-17

Focus on the existing runnable POC and ZIP distribution until the PixiBrown template prerequisites are available. The user's latest instruction explicitly supersedes the earlier same-day requirement to stop HTML POC UI work.

- Continue implementing and testing UI in the existing HTML/JavaScript POC. Edit sources in poc/, then build dist/; do not edit generated dist files directly.
- Read doc/skills/SKILL.md and relevant documents as the future migration reference. Design markdown documents are secondary where applicable. Do not claim this POC is SceneMaker/Prefab compliant.
- Missing template prerequisites do not block current POC work or require another request for permission to continue it.
- Preserve accepted game rules, probabilities, supplied assets, English UI, and mobile readability. Run checks appropriate to changes.
- Package runnable static files from the build manifest into releases/ ZIPs with deployment instructions and licenses; verify the extracted package. Do not include .git, source-assets, or development-only files.
- When an actual pixibrown_template_blitzcrown fork is supplied and migration is requested, follow doc/skills for SceneMaker/prefabs, serialized references, common intro popups, provided UI assets and asset builds. Do not fabricate engine APIs or a replacement template.
- On 2026-09-18 the user explicitly authorized committing, pushing the current work to https://github.com/moonddu-star/baseball.git, and running the build. ZIP distribution continues alongside GitHub builds. This does not authorize unrelated deployments.
