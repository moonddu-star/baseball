# PixiBrown 이식 구조와 남은 작업

## 현재 상태

**POC 구조 정리 완료 / PixiBrown 이식 미착수.** 템플릿 포크, 엔진 패키지, 기본 intro/game prefab, SceneMaker 연결이 아직 없다. 빈 프리팹이나 가짜 엔진을 만들지 않았다. 아래 경로와 노드명은 이식할 때 사용할 설계이며 현재 파일이 존재한다는 뜻이 아니다.

근거: [SKILL](skills/SKILL.md), [변환 규칙](skills/poc-convert.md), [클라이언트](skills/client.md), [씬 구조](skills/scene-structure.md), [에셋](skills/assets.md), [로컬 서버](skills/local-server.md), [완료 조건](skills/scene-complete.md).

## 목표 파일 구조

템플릿 포크를 받은 뒤 해당 저장소 안에서 구성한다. POC 소스 전체를 `src`로 복사하지 않는다.

```text
src/game/
  baseball-game-main.ts            # GameMain 상속, 응답 변환과 진행 조율
  board/strike-zone-board.ts       # 보드 루트 컴포넌트, 원형+Grid 호스트 참조
  hud/betting-hud.ts               # 입력·잠금·대기/플레이 표시
  hud/scoreboard.ts                # 배당·안타 표시
  fx/pitch-sequence.ts             # 투구/타격 연출 조율
  popup/round-result-popup.ts      # 게임 전용 결과만
src/network/
  types.ts                        # 확정된 게임 Payload 확장
  local_server/                   # 템플릿 폴더명 유지
    local_server.ts               # 기존 로그인/AllState + 게임 요청 분기
    round-generator.ts            # 기존 Mines 룰을 포팅할 때 필요하면 분리
raw-assets/
  common/                         # 템플릿 공용 UI/폰트/사운드
  intro/prefabs/intro.prefab       # 시스템 구조 유지
  intro/scenes/intro.scene
  game/
    prefabs/game.prefab
    prefabs/strike-zone-cell.prefab
    prefabs/round-result-popup.prefab
    scenes/game.scene
    images/stadium/               # 작업자가 제공한 배경 PNG
    images/pitcher/               # 지원 형식으로 준비된 투수 PNG
    images/ui/                    # 작업자가 제공한 UI PNG
    animations/                   # 실제 제작한 anim만
    sounds/                       # 연결할 작업자 사운드만
  localize/common/
  localize/game/
```

템플릿 기존 파일명과 폴더는 유지한다. 신규 파일은 kebab-case, 노드는 PascalCase, 파일당 등록 컴포넌트는 하나다. 추가 번들 대신 `common`, `intro`, `game`, `localize`를 쓴다.

## 야구 게임 씬 역할

현재 게임의 표시/조작을 기준으로 나눈 목표 계층이다. 실제 배치는 같은 1080×1920 논리 해상도의 POC와 비교해서 측정한다. 현재 브라우저 기본 표시는 540×960 CSS px이며 작은 창에서는 반응형으로 변한다.

```text
Root
├── CanvasBG                      # 창 여백 배경, 준비된 이미지가 있을 때만
├── Main [BaseballGameMain]
│   ├── GameBG                    # 게임 캔버스 안 경기장
│   ├── Contents
│   │   ├── Pitcher               # 투수와 릴리스 지점
│   │   ├── StrikeZone [StrikeZoneBoard]
│   │   │   └── TileRoot [Grid]   # 빈 호스트 + strike-zone-cell 원형
│   │   └── PitchEffects          # 공·배트·타격 표현
│   └── HUD
│       ├── Header                # 로고·도움말·사운드
│       ├── Wallet                # 크레딧
│       ├── Scoreboard            # 현재/다음 배당·안타
│       ├── RoundMessage
│       └── BettingHUD
│           ├── ReadySettings    # 기존 베팅 입력·위험 코스 선택
│           ├── PlayingCompare   # 현재/다음 지급액·확률
│           └── Action           # 상태별 시작/확정 버튼
└── Popup
    └── RoundResult              # 게임 전용 결과 팝업
```

- 실제 이미지를 받은 부분만 Sprite 노드를 만든다. 현재 CSS 도형·문자 아이콘을 임의 PNG나 white_box로 대체하지 않는다.
- 새 키패드, 오토베팅, 프리스핀 등 POC에 없는 조작은 추가하지 않는다.
- Header/Wallet 같은 가로 나열은 HorizontalLayoutGroup, HUD 흐름은 VerticalLayoutGroup을 적용한다. 화면보다 긴 내용은 ScrollRect+Mask+LayoutGroup으로 묶는다.
- 25개 칸은 원형 prefab을 런타임에 clone한다. SceneMaker에서 TileRoot가 비어 보이는 것은 정상이며 25개 칸을 미리 심지 않는다.
- Header/잔액/CTA/결과 표시가 연출보다 앞에 보이도록 레이어를 유지한다. 버튼 등 입력 컨트롤은 Container에, 이미지는 자식 Sprite에 둔다.
- POC의 `rules` 도움말은 intro 공용 HowToPlay 콘텐츠로 연결한다. game.prefab에 HowToPlay 등 공용 팝업을 복제하지 않는다.
- 노드·원형·연출 에셋 참조는 `@Serialize`로 저장하고 prefab에서 연결한다. 코드가 새 UI 노드를 생성하거나 좌표로 나열하지 않는다.

## 기능 대응

| POC 원본 | 이식 책임 |
|---|---|
| `domain/mines-engine.js` | 룰/정산을 LocalServer에 포팅; 공통 소켓/Adapter는 유지 |
| `game/game-main.js` | GameMain 상속과 요청/응답·연출 조율 |
| `ui/game-view.js`, `bind-controls.js` | 보드/HUD 컴포넌트와 prefab; 버튼 콜백은 해당 UI에 |
| `ui/result-panel.js` | 게임 전용 결과 prefab 및 컴포넌트 |
| `fx/pitch-effects.js` | Animation/Coroutine 등 실제 엔진 연출 |
| `fx/baseball-swing.js` | 0.2초 상승 스윙·접촉·잔상 없음의 동작 기준; Three.js 렌더러를 통째로 이식하지 않음 |
| `audio/game-audio.js` | 제공된 사운드와 템플릿 Sound 연결 |
| `integration/model-context.js` | POC 전용; 템플릿 이식 대상 아님 |

## 먼저 확정할 연결 조건

1. **템플릿 포크 경로와 실행 환경.** 템플릿의 기본 스크립트와 intro를 유지하고 실제 빌드/SceneMaker 진입점을 확인한다.
2. **다단계 Mines 서버 계약.** 현재 `start → reveal(여러 번) → cashout/out/cleared`다. 문서 예시의 한 번 REQ_BET/RES_BET로 끝나는 게임과 같다고 가정하지 않는다. 시작·코스 공개·상금 확정의 요청/응답, 정산 시점, 중복 요청 처리는 개발팀 계약 확인 후 결정한다. 추가 이벤트는 REQ/RES 쌍이다.
3. **제공 UI 아트와 배트 표현.** 현재 배경/투수 PNG, CSS UI, Three.js 배트 중 무엇을 어떤 엔진 에셋으로 표현할지 확인한다. 없는 UI 아트는 목록으로 요청하고 임의 생성하지 않는다. GLB/JS를 raw-assets에 넣어 엔진 에셋처럼 취급하지 않는다.
4. **계측 레이아웃.** 동일 세로 해상도에서 대기/타격/결과 화면을 비교하고 앵커만 `layout.md`에 기록한다. 흐름 UI는 레이아웃 그룹을 사용한다.

## 검증 완료 조건

- [ ] 템플릿의 기본 부트스트랩·GameMain·GameModule·SceneManager·socket·intro 시스템 트리 보존
- [ ] Serialize 배선, 파일당 등록 컴포넌트 하나, 역할별 UI/보드/연출 분리
- [ ] 실제 prefab·scene·이미지·폰트·사운드 경로 검증
- [ ] raw-assets 변경 뒤 실제 템플릿의 `npm run build:assets:dev` 수행
- [ ] SceneMaker에서 대기 배치 확인(런타임 반복 칸 제외)
- [ ] 시작·HIT·OUT·현금화·전체 성공·중복 입력·잔액 갱신 검증
- [ ] 일반/짧게/모션 줄이기, 배트 200ms·상승 궤적·페이드/잔상 없음 확인

이 체크리스트는 아직 완료하지 않은 **이식 검증**이다. 현재 POC의 `npm run build`는 파일 복사/결합 작업이며 TexturePacker나 PixiBrown 에셋 빌드를 대신하지 않는다. 오해를 막기 위해 POC에는 `build:assets:dev`라는 가짜 명령을 추가하지 않았다.
