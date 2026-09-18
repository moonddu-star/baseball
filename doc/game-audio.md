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

## 이전 기록: 홈런·승리 환호음 연결 준비 (2026-09-17)

- 현재 환호 음원은 미제공 상태다. 런타임 URL은 null이며 파일 요청이나 대체 합성 환호음을 발생시키지 않는다.
- 홈런: source-assets/sounds/home-run-cheer.mp3 → poc/assets/sounds/sfx-home-run-cheer.mp3 → dist/assets/sfx-home-run-cheer.mp3.
- 승리 정산: source-assets/sounds/win-cheer.mp3 → poc/assets/sounds/sfx-win-cheer.mp3 → dist/assets/sfx-win-cheer.mp3.
- 한 음원으로 두 이벤트를 처리해도 된다. 두 설정에 같은 URL을 연결하면 된다. 권장 길이는 2–4초이며 앞부분 무음이 짧고 자연스럽게 잦아드는 MP3.
- 파일이 준비되면 위 경로로 복사하고 poc/build-manifest.json에 추가한 뒤 game-main.js의 celebrationFiles에서 home-run과 win의 null을 해당 assets/ URL로 교체하고 빌드한다. 원본 파일만 추가한다고 자동 활성화되지는 않는다.
- 홈런 접촉에서 기존 HIT 효과음과 함께 home-run 이벤트가 발생한다. 이익을 확정한 수동 CASH OUT과 자동 정산에서는 win 이벤트가 발생한다. OUT이나 일반 안타는 환호음을 요청하지 않는다.
- 환호 샘플 gain 0.55, 기존 master 0.8 및 효과음 버스 0.7 적용. 재생 중 BGM을 40%로 낮추며 음원의 최대 첫 4초까지 유지한 뒤 복원한다. 실제 음원 수령 후 청취에 맞춰 조정한다.
- 환호음은 한 번에 하나만 재생한다. 홈런 직후 정산해도 기존 환호음을 겹치거나 잘라 다시 틀지 않는다. 음소거·탭 숨김은 즉시 정지하고 다음 라운드 준비 시 남은 환호음을 정리한다. 로딩이 늦으면 해당 이벤트는 생략하며 뒤늦게 재생하지 않는다.
- 검증: 미제공 음원 요청 없음, 홈런/승리 중복 억제, 음소거 및 탭 숨김 중지, 다음 라운드 정리. 실제 환호 음원의 음량/품질 검증은 파일 제공 후 진행한다.

## 안타별 타격음 (2026-09-17)

- Single: source-assets/sounds/hit_single.mp3 → poc/assets/sounds/sfx-hit-single.mp3 → assets/sfx-hit-single.mp3 (약 0.65초).
- Double: source-assets/sounds/hit_strong.mp3 → poc/assets/sounds/sfx-hit-strong.mp3 → assets/sfx-hit-strong.mp3 (약 0.88초).
- Triple / Home Run!: 기존 hit.mp3 / assets/sfx-hit.mp3 유지 (0.85초).
- 판정된 심볼을 접촉 시 tone(hit, selectedSymbol)에 전달한다. 타격당 선택한 녹음 한 개만 재생하며 홈런 환호 이벤트는 별도로 유지한다.
- 세 음원 모두 0.07초 시작 오프셋과 gain 1.0, 기존 모바일 HIT 전용 보정·접촉 보조음·BGM 덕킹을 사용한다. 새 파일에서 1% 피크를 처음 넘는 시점은 약 0.099초와 0.107초라 선행 무음 일부만 건너뛴다. 원본은 재인코딩하지 않는다.
- 빌드 매니페스트에 두 파일을 포함해 로컬과 다음 배포에 동일하게 반영한다. 환호 음원은 아직 미제공이며 비활성 상태다.

## OUT 연출 통일 (2026-09-17)

현재 게임의 OUT은 모두 miss 이벤트를 사용한다. 기존 헛스윙 바람 소리와 out.mp3를 재생하며 빗맞음(glance) 이벤트는 게임에서 호출하지 않는다. 안타 종류별 타격음과 환호음 준비 설정은 그대로 유지한다.

## 현재 관중 환호음 적용 (2026-09-17, 이전 준비 기록보다 우선)

| 결과 | 원본 | 런타임 | 길이 |
|---|---|---|---|
| Double / Triple | source-assets/sounds/cheer_normal.mp3 | assets/sfx-cheer-normal.mp3 | 약 3.43초 |
| Home Run! | source-assets/sounds/cheer_strong.mp3 | assets/sfx-cheer-strong.mp3 | 약 3.65초 |

- 기존 안타별 타격음과 함께 접촉 시 환호를 시작한다. Single에는 환호를 추가하지 않는다. 별도 정산용 win 음원은 아직 연결하지 않았다.
- MP3를 재인코딩 없이 poc/assets/sounds로 복사하고 빌드 매니페스트로 dist/assets 및 다음 배포에 포함한다. 편집용 WAV/PKF는 배포하지 않는다.
- 두 환호 모두 원본 처음부터 gain 0.55로 재생한다(master 0.8, 효과음 버스 0.7 적용). 환호 길이 동안 BGM을 40%로 낮추며 최대 4초 유지 후 복원한다.
- 연속 장타는 이전 환호를 80ms 동안 줄여 정지시키고 새 결과의 환호로 바꾼다. OUT은 남은 환호를 80ms 동안 줄여 정지시킨다. 음소거/탭 숨김/다음 라운드 정지는 기존 처리와 같다.
- 정상 디코딩, 각 결과의 실제 음원 선택, 연속 재생 전환, OUT 정지, 원본과 배포 파일 일치를 검증한다. 실제 기기 청취 음량은 사용자 확인에 따라 조정한다.

## 연속 장타 환호 음량 (2026-09-17)

- 2루타·3루타·홈런을 장타로 묶고 실제 타격 순서의 연속 횟수로 음량을 정한다. 종류가 달라도 연속으로 인정한다. 음소거 중의 결과도 횟수에 반영한다.
- 환호 샘플 gain: 첫 장타 0.55 → 2연속 0.60 → 3연속 0.65 → 4연속 이상 0.70. 최대 기존 대비 약 27% 증가이며 효과음 버스·마스터는 그대로다.
- 1루타가 나오면 연속 횟수가 끊기며, OUT·정산 후 새 라운드에서는 첫 장타 음량으로 시작한다. 슬롯 위치 순서가 아니라 엔진의 실제 선택 이력을 역순으로 읽으므로 별도 저장/초기화 상태가 필요하지 않다.
- 기존 음원 선택, 80ms 환호 전환, BGM 덕킹, OUT·음소거·탭 전환 중지 기능을 유지한다. 승리 정산용 환호 gain은 기본 0.55로 유지하며 현재 win 음원은 미연결이다.

## 3루타 환호 강조 (2026-09-17)

3루타는 기존 cheer_normal.mp3를 그대로 쓰면서 별도 gain을 적용한다: 첫 장타 1.00 → 2연속 1.05 → 3연속 1.10 → 4연속 이상 1.15. 일반 장타의 첫 환호 gain 0.55 대비 약 5.2dB 높은 기본 설정이다. 2루타·홈런은 기존 0.55–0.70 단계를 유지한다. 기존 연속 횟수 계산, 1루타/새 라운드 초기화, 80ms 전환 및 음소거/OUT 정지는 유지한다.

## 홈런 타격음 최대 강조 (2026-09-17)

홈런의 기존 hit.mp3 샘플 gain을 1.0에서 2.0으로 높여 안타 중 가장 강한 타격 입력을 사용한다. 1·2·3루타는 기존 gain 1.0, 0.07초 시작 오프셋을 유지한다. 기존 HIT 전용 컴프레서와 소프트 리미터를 그대로 거치므로 설정 gain 2배가 체감 음량 2배를 뜻하지 않는다. 관중 환호음 단계·배경음악 기본 음량·효과음 버스·마스터는 변경하지 않는다.
