# 현재 POC 사운드

문서 우선순위: `doc/skills` → 디자인 MD. 단일 오디오 진입점은 `poc/src/game/audio/game-audio.js`다. 사용자 제공 음원을 원본 그대로 복사해 사용한다.

## 연결한 소리 (2026-09-16)

| 이벤트 | 원본 | 길이 |
|---|---|---|
| 대기·다음 라운드 준비 | `source-assets/sounds/intro_bg.mp3` | 약 17.26초, 반복 |
| 라운드 진행·결과 화면 | `source-assets/sounds/baseball_bg.mp3` | 약 30초, 반복 |
| 버튼·설정 선택 | `source-assets/sounds/click.mp3` | 약 0.32초 |
| HIT | `source-assets/sounds/hit.mp3` | 약 0.85초 |
| 빗맞음·헛스윙 OUT | `source-assets/sounds/out.mp3` | 약 1.25초 |
| 투구·접촉/헛스윙 보조음·상금 확정 | 기존 Web Audio 합성 효과 | 이벤트별 짧은 효과 |

화면에는 실패 유형과 관계없이 OUT!만 표시한다. 결과를 닫기만 하면 라운드 BGM을 유지하며, NEXT ROUND나 RESET으로 준비 상태가 되면 인트로 BGM으로 전환한다.

## 재생 및 음량

- 첫 버튼 클릭/설정 선택으로 오디오를 활성화한다. 자동재생은 하지 않는다.
- BGM은 하나의 Audio 요소를 사용해 중복 재생을 방지한다. 곡 전환 시 새 곡을 처음부터 재생하고 0.8초 동안 볼륨을 올린다.
- 파형 검사에서 인트로 RMS가 기존 BGM보다 약 4.6배 높았다. 인트로 gain은 사용자 요청에 따라 0.15, 라운드 BGM은 0.16으로 맞췄다. master 0.8, 효과음 버스 0.7.
- 샘플별 gain: 클릭 0.35, HIT 1.0, OUT 0.35. 원본 파일을 수정하거나 다시 인코딩하지 않는다.
- HIT의 선행 무음을 고려해 0.07초부터 재생한다. OUT은 0.015초부터 재생한다.
- HIT 시 BGM을 45%로 0.5초, OUT은 65%로 1.1초, 정산은 70%로 0.4초 낮춘 뒤 0.35초 동안 복원한다.
- 효과음 파일을 미리 요청하고 첫 사용자 동작에서 생성한 AudioContext로 한 번 디코딩해 재사용한다. 준비 전 첫 클릭이나 로딩 실패에는 기존 합성음을 사용하며, 나중에 지연 재생하지 않는다.
- 같은 효과의 중복 간격을 제한한다(클릭 40ms, 나머지 80ms). 종료된 재생 노드를 정리한다.
- 음표 버튼은 BGM과 효과음을 함께 제어한다. 음소거 설정은 로컬에 저장한다.
- 숨긴 탭·페이지 이탈 시 음악을 멈추고 효과음을 정리한다. 복귀하면 활성화/음소거 설정에 따라 이어 재생한다.

## 배포와 검증

원본은 `source-assets/sounds`에 보존한다. 배포 입력은 `poc/assets/sounds`의 `intro-bg.mp3`, `baseball-bg.mp3`, `sfx-click.mp3`, `sfx-hit.mp3`, `sfx-out.mp3`이며 빌드 매니페스트가 `dist/assets`로 복사한다. 출처는 `THIRD-PARTY.md`에 기록한다.

MP3 디코딩·길이·피크/RMS·앞뒤 무음을 검사했다. 브라우저에서 대기/라운드 BGM 전환, 단일 BGM 인스턴스, 실제 샘플 사용과 시작 오프셋, OUT 두 유형, 음소거 저장, 탭 숨김/복귀, MP3 MIME 및 원본/배포 바이트 일치를 검증했다. 스피커에서의 체감 음량은 사용자 청취에 따라 추가 조정할 수 있다.

## HIT audibility adjustment

Company tester reported that BGM/click/OUT were audible but HIT was not. Local browser measurements confirmed that the supplied HIT sample was scheduled during contact and reached master output (peak ~0.34 before adjustment); the deployed company page requires login, so its exact cause could not be verified. HIT sample gain was raised from 0.6 to 1.0, a short synchronized noise/wood-resonance body is now always played, and BGM ducks to 45% for 0.5 seconds. Other effect gains and music base levels remain unchanged. This improves audibility and provides an independent contact cue if the sample is unavailable; company playback still needs confirmation after re-upload.

## Android / short HIT report

User narrowed the issue to Android Chrome or an in-app browser: HIT was audible but weak/brief; PC was normal. This does not establish an autoplay/decoder failure. The company page requires login and no physical Android device was available.

A deterministic OfflineAudioContext render of the actual game audio code measured the old HIT: 90% energy by 0.067 s and full-band peak 0.562. The new mix reaches 90% energy by 0.185 s with a lower peak of 0.407. A 500–5000 Hz analysis band has about 25% higher RMS, and its 25–200 ms body RMS rises about 17%. This band is a rough audibility check, not a simulation of a specific phone speaker.

HIT-only processing: 120 Hz high-pass, +3 dB presence at 1.8 kHz, compressor (-23 dB threshold, 18 dB knee, 5:1 ratio, 2 ms attack, 90 ms release), 1.7 makeup gain, and a soft limiter. Contact noise now lasts 65 ms; the main resonance is 660→520 Hz over 160 ms, with an 85 ms higher resonance. Both the recorded sample and synthesized contact body use the same HIT bus. Click/OUT/music levels remain unchanged.

Checks: actual sample and fallback paths, mute persistence, visibility return, Chromium Android Pixel 7 profile with touch interaction, desktop playback, and extracted deployment package. Real Android speaker playback must be confirmed after upload.

Reference considered during diagnosis: [Chrome Web Audio autoplay policy](https://developer.chrome.com/blog/web-audio-autoplay). The existing gesture activation was retained; no device-specific autoplay cause is claimed.
