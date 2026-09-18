# Medium / Hard pitching motion edit

## Status

Applied user-supplied replacements on 2026-09-17. Medium now uses a low submarine delivery, and Hard uses a strongly coiled windup. Both supplied files retain 887 x 444 dimensions, RGBA transparency and four pose slots. Their original bytes were copied into POC runtime assets and the static build. Frame-3 release anchors are Medium (8%, 84%) and Hard (13%, 31%); Easy and all gameplay timings/probabilities remain unchanged.

The earlier built-in image edit failed with Windows error 1385, and the API attempt failed with HTTP 429 credit_balance_exhausted. No API image was generated. The current applied images were supplied directly by the user; no further API request was needed.

## Shared constraints

- Sources: `source-assets/images/pitcher-medium.png` and `pitcher-hard.png`.
- Final size: exactly 887 × 444 pixels, PNG with genuine alpha transparency.
- Four horizontal equal-width animation slots, same camera, character scale, margins and foot baseline as the original.
- Sequence: ready / load / release / follow-through. Keep full bodies within their own slots with no overlap or clipping.
- Keep facial identity, complexion, hair, body proportions, uniform colors, glove, cap, shoes and photographic rendering. A crouching pose must become shorter through posture, not through rescaling the person.
- After successful editing: verify alpha, dimensions and frame alignment; back up originals; copy verified images to source-assets and poc assets; calibrate each release-point anchor against frame 3; build dist and inspect day/night playback at 0.4-second pitching timing. Do not change odds or ball timing.

## Research

- Medium: low submarine delivery inspired by Tyler Rogers. MLB describes his unusually low release: https://www.mlb.com/news/tyler-rogers-rising-submarine-slider
- Hard: pronounced torso coil inspired by Johnny Cueto's twisting windup. MLB examples: https://www.mlb.com/news/johnny-cueto-shimmies and https://www.mlb.com/video/johnny-cueto-s-trademark-shimmy
- These are motion references only, not requests to replace the existing players with those athletes. The four-frame interpretation below is a proposed adaptation for the existing POC sprite animation.

## Medium edit prompt

Edit pitcher-medium.png. Preserve the same man's facial identity, complexion, hair and physique; gray jersey and pants, burgundy sleeves and cap, piping, belt, black left-hand glove and cleats. Change only the poses to a right-handed submarine baseball delivery inspired by Tyler Rogers, with deep hip hinge and near-ground release, not a softball windmill. Exact 887x444 transparent-alpha PNG, four equal horizontal slots, original scale and baseline. Frame 1: original ready stance. Frame 2: compact knee lift, torso coiling and lowering into a deep hip hinge. Frame 3: torso almost horizontal, right throwing hand low on viewer-left, stride foot planted, eyes toward catcher. Frame 4: low balanced follow-through, throwing arm across body, trailing leg extended backward. Keep all anatomy coherent and each full figure inside its slot. Never scale the bent poses up to the original standing height. No text, new logos, scenery, checkerboard or opaque background.

## Hard edit prompt

Edit pitcher-hard.png. Preserve the same man's facial identity, beard, complexion, hair and physique; full red jersey and pants, red cap, belt, black left-hand glove and cleats. Change only poses to an unusual twisting right-handed delivery inspired by Johnny Cueto's torso coil. Exact 887x444 transparent-alpha PNG, four equal horizontal slots, original scale and baseline. Frame 1: original ready stance. Frame 2: high left knee across the body, torso rotated strongly away from the catcher showing a three-quarter back view, head turned back toward the target, glove close to upper chest. Frame 3: unwind into a powerful high three-quarter release toward the camera, throwing hand on viewer-left; stable planted stride foot, coherent shoulders and hips. Frame 4: pronounced rotational follow-through with throwing arm finishing across the opposite thigh and back leg swinging through. Convey twist through body pose, not a whole-image rotation. Keep full figures within their slots. No new face, altered build, text, logos, scenery, checkerboard or opaque background.

## Tool path

Built-in imagegen edit was blocked by file read error 1385. User then explicitly authorized API/CLI fallback. Bundled image_gen.py was used unchanged with gpt-image-2.5-sunburst, quality high, size auto, transparent PNG, and the original medium sprite as input. Current official API documentation confirms native transparency for this model: https://developers.openai.com/api/reference/resources/images/methods/edit

The inherited OPENAI_BASE_URL pointed to a company gateway and returned HTTP 401. Setting https://api.openai.com/v1 for the individual command (no persistent settings changes) reached the official API but returned HTTP 429 credit_balance_exhausted. Do not retry until the API credit balance has been resolved. No Hard generation request was sent after the quota failure. Final prompts are prepared in .work/pitcher-medium-api-prompt.txt and .work/pitcher-hard-api-prompt.txt. No credentials are stored in this document or game assets.
