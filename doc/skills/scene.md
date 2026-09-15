# 씬 / UI 구성

pixibrown 오브젝트와 UI 컴포넌트로 prefab을 구성한다. 진행 방식은 [workflow.md](workflow.md). 템플릿 기본 스크립트는 수정하지 않는다. 허용 목록은 [client.md](client.md).

에셋 제약은 [assets.md](assets.md)를 따른다.
노드 JSON 필드·transform은 [engine-schemas.md](engine-schemas.md).
이미지 `image` 경로는 [engine-resources.md](engine-resources.md) (반드시 `{bundle}/images/{atlas}/파일`).
HUD/팝업/아이템 prefab 조립은 [pattern-prefab.md](pattern-prefab.md).
씬을 나누고 묶는 원칙은 [scene-structure.md](scene-structure.md). 그 문서의 트리는 예시이며 이 게임 HUD를 다른 프로젝트에 복사하지 않는다.

Sprite `image`는 작업자가 준 PNG를 [assets.md](assets.md)대로 `raw-assets`에 복사한 파일이다. 이미지를 생성하거나 레이아웃을 오리지 않는다. 이미지가 없는 UI는 노드를 만들지 않는다. `white_box.png`나 빈 텍스처로 채우지 않는다. 고정 글자는 스프라이트에 있고, 바뀌는 숫자만 Text다. 같은 모양은 같은 `image` 경로를 쓴다. 배치는 `layout.md`를 따른다. 좌표는 레이아웃 그룹이 못 잡는 앵커에만 쓰고, 작업자 레이아웃에서 잰다.

아래 구성은 위젯을 **새로 붙일 때**의 트리 기본값이다. 이미 있는 UI는 작업자가 바꾸라고 하지 않으면 유지한다. 파일명/노드명/`interactive`/HTML 금지 규칙은 지킨다.

## 공통 규칙

- 노드 이름: **PascalCase** (`BtnBet`, `BottomUI`, `PrizePopup`)
- `interactive`는 입력이 필요한 노드만 켠다. 켠 노드의 **상위 노드도 켜야** 한다. 순수 비주얼(Sprite/Text/Particle)은 끈다
- UI를 HTML / `DOMElement`로 만들지 않는다. SceneMaker에서 prefab을 열면 모든 UI가 보여야 한다
- UI 위치·크기·계층은 prefab 또는 게임 씬에 둔다. 스크립트에서 노드를 생성해 배치하지 않는다. 복잡한 UI는 별도 prefab. 규칙은 [pattern-prefab.md](pattern-prefab.md)
- `intro.prefab` 구조는 **변경 불가**
- `game.prefab`을 게임 씬 기본으로 사용한다. 템플릿은 스텁이므로 HUD·콘텐츠를 여기에 추가한다
- intro 공용 팝업은 중복 제작 금지: `Tutorial`, `HowToPlay`, `BetHistory`, `FreespinStart`, `FreespinEnd`, `CommonPopup`. 게임 전용 모달만 `game.prefab` / `Popup`에 둔다
- 버튼처럼 **스케일 연출**이 있는 UI는 연출 대상 노드의 `pivot`이 **0.5, 0.5**여야 한다 (`StateSize` 등)
- 버튼·토글·슬라이더·입력필드는 **Container 루트**에 컴포넌트를 붙인다. Sprite(이미지)에 `Button` / `Toggle` / `Slider` / `InputField` / `State*`를 붙이지 않는다. 이미지는 항상 그 Container의 자식이다

### Text / 비트맵 폰트 face

prefab `fontFamily`는 에셋 경로다. 예: `game/fonts/brothers.otf`, `game/fonts/win-amount.fnt`.

런타임은 경로의 `/` `\` `.` 을 `_` 로 바꾼 이름을 쓴다.

| prefab `fontFamily` | 엔진이 찾는 이름 |
|----|----|
| `game/fonts/brothers.otf` | `game_fonts_brothers_otf` |
| `game/fonts/win-amount.fnt` | `game_fonts_win-amount_fnt` |

**OTF/TTF:** 로드와 조회가 같은 변환을 쓴다. 경로만 맞으면 된다.

**BitmapText (`.fnt`):** Pixi는 `.fnt`의 `info face="..."` 로 폰트를 등록한다. 이 값이 위 변환 이름과 **같아야** 한다.

```
info face="game_fonts_win-amount_fnt" ...
page id=0 file="number_bitmap.png"
```

- `face`를 원본 파일명(`win-amount-bitmap`)이나 경로(`game/fonts/win-amount.fnt`)로 두면 조회가 실패한다
- 실패하면 노란 비트맵 대신 **캔버스 동적 폰트**(흰 산세리프)가 그려진다
- `textType`은 `BitmapText`. `fontFamily`는 `.fnt` 경로. PNG는 `.fnt`와 같은 폴더, `page file=` 과 파일명이 같아야 한다
- 개발 서버는 `raw-assets`의 `.fnt`를 그대로 쓰므로 **raw 파일의 `face`를 맞춘다.** 빌드 산출물만 고치면 rundev에서 재현된다

Text 그라데이션은 fill과 **곱**한다. 단색을 그라데이션에 넣을 때 fill은 흰색(`16777215`)으로 두고, 보이는 색은 `gradient.startColor` / `endColor`에 둔다. fill과 그라데이션에 같은 색을 넣으면 더 어둡게 보인다.

### Prefab JSON 공통

```json
{
  "version": "1.0",
  "root": { }
}
```

노드 필드: `objectType`, `name`, `enable`, `interactive`, `transform`, `children`, `components`.

`objectType`: `Container` | `Sprite` | `Text` | `Particle` | `Spine`

컴포넌트 직렬화:

```json
{
  "enable": true,
  "componentName": "Button",
  "serializeFields": {
    "listener": ["../.."],
    "callback": ["onClickPlay"],
    "args": [""]
  },
  "serializeTypes": {
    "listener": "object",
    "callback": "default",
    "args": "default"
  }
}
```

참조 경로:

| 값 | 의미 |
|----|------|
| `""` / `"."` | 자기 자신 |
| `"0"`, `"1"` | 직계 자식 인덱스 |
| `"0/1"` | 자식 경로 |
| `"../.."` | 부모로 상승 |
| `"game/animations/popup-show.anim"` | 에셋 경로 |

## intro.prefab (변경 금지)

시스템 노드 이름, `@Serialize` 링크, 팝업 자식 이름, Button callback 문자열을 깨지 않는다.

```
Intro (Container) [Intro]
├── SceneManager (Container) [SceneManager]
├── GameModule (Container) [GameModule]
└── Sequence (Container) [Sequence]
    └── Popup (Container) [PopupManager]
        ├── ColliderContents / Dim
        ├── ContentsPopup
        │   ├── Tutorial
        │   ├── HowToPlay
        │   ├── BetHistory
        │   ├── FreespinStart
        │   └── FreespinEnd
        ├── ColliderCommon / Dim
        └── CommonPopup
```

SceneManager 기본값 (템플릿): `isSingleScene=true`, `portraitPrefab=common/prefabs/loading.prefab`, `portraitSceneName="game"`.

허용: 팝업 스킨(스프라이트/카피), localize 키. 금지: 노드 삭제·이름 변경·시스템 컴포넌트 제거.

이 팝업은 **intro에만** 둔다. `game.prefab`의 `Popup` 아래에 Tutorial / HowToPlay / BetHistory / FreespinStart / FreespinEnd / CommonPopup을 다시 만들지 않는다.

## game.prefab (권장 기본)

템플릿 `game.prefab`을 확장한다. intro의 SceneManager / GameModule / Sequence / PopupManager를 게임 씬에 복제하지 않는다. Contents·HUD **내부**는 게임마다 다르다. 나누기·묶기는 [scene-structure.md](scene-structure.md).

```
Root
├── CanvasBG [FitToScreen]        # 창 여백. 게임 배경과 다른 이미지
│   └── BG
├── Main [GameMain 서브클래스]
│   ├── GameBG                    # 논리 해상도 안 실배경. FitToScreen 끄기
│   ├── Contents                  # 본편. 보드/페이테이블이 필수는 아님
│   └── (HUD)                    # 이름이 BottomUI가 아니어도 됨
└── Popup                         # 게임 전용 모달만. 공용 팝업은 intro 유지
```

GoldFormula는 루트에 `WideBG` + `Main`(콘텐츠/BottomUI) + `Popup`을 두었다. 계층 참고는 가능하나 번들/씬 이름은 `game`을 유지한다.

## UI 타입 → 컴포넌트

새로 붙일 때 해당 행을 쓴다. 이미 있는 컨트롤은 요청 없이 바꾸지 않는다. 새 입력은 기획서 형태, 없으면 `InputField`.

| 이 조작일 때 | 사용할 컴포넌트 |
|---------|-----------------|
| 버튼 | `Button` + `StateSize` / `StateColor` / `StateSound` |
| 아이콘 토글 | `Toggle` + State* |
| 단일 선택 그룹 | `ToggleGroup` (+ `Grid`) |
| 값 슬라이더 | `Slider` (Container 루트. Track/Fill/Handle은 자식) |
| 텍스트 입력 | `InputField` (Container 루트. Text/Placeholder는 자식) |
| 스크롤 문서 | `ScrollRect` + `Mask` viewport + `Scrollbar` |
| 페이지 리스트 | `Grid` + 페이지 버튼 + 아이템 prefab |
| 모달 팝업 | `Animation` (show/hide) + dim `Collider` |
| 시스템 팝업 | intro `CommonPopup` 재사용 |
| 진행률 | `Progress` |
| 숫자 카운터 | 표시용 `Text`. 롤업은 `AnimatedCounter` |
| 라벨 | `Text` + `Localize` |
| 세로/가로 나열 | `VerticalLayoutGroup` / `HorizontalLayoutGroup` |
| 격자 | `Grid` |
| 전체 화면 배경 | `Sprite` + `FitToScreen` |
| 클리핑 | `Mask` / `AlphaMask` |
| Spine | `objectType: Spine` |
| 파티클 | `objectType: Particle` + `particlepath` |
| 동영상 | `VideoOverlay`. HTML video 태그 금지 |

`DOMElement`는 사용하지 않는다. GoldFormula 가이드 팝업의 DOM/WebView는 참고하지 않는다.

---

## 쿡북 — 버튼

버튼을 만들 때는 **Container를 먼저** 만든다. `Button` / `StateSize` / `StateColor` / `StateSound`는 그 Container에만 붙인다. 이미지·글자는 하위에 둔다.

하지 말 것: Sprite(이미지 오브젝트)에 `Button`이나 State 컴포넌트를 바로 붙이기.

기본 트리:

```
BtnXxx (Container) [Button, StateSize, StateColor, StateSound] interactive=true
  └ Frame (Sprite) interactive=false
  └ Text  (Text)   interactive=false
```

아이콘 버튼은 `Text` 대신 `Icon (Sprite)`. 이미지가 한 장이어도 Sprite가 루트가 되면 안 된다.

```json
{
  "objectType": "Container",
  "name": "BtnBet",
  "interactive": true,
  "children": [
    { "objectType": "Sprite", "name": "Frame", "interactive": false },
    { "objectType": "Text", "name": "Text", "interactive": false }
  ],
  "components": [
    {
      "componentName": "Button",
      "serializeFields": {
        "listener": ["."],
        "callback": ["onClick"],
        "args": [""]
      }
    },
    {
      "componentName": "StateSize",
      "serializeFields": {
        "targets": [""],
        "normal": ["0"],
        "hover": ["5"],
        "pressed": ["-5"],
        "disabled": ["0"],
        "duration": ["0.1"]
      }
    },
    {
      "componentName": "StateColor",
      "serializeFields": {
        "targets": ["0", "1"],
        "normal": ["#B7C4DE"],
        "hover": ["#FFFFFF"],
        "pressed": ["#FFFFFF"],
        "disabled": ["#495874"],
        "duration": ["0.1"]
      }
    },
    {
      "componentName": "StateSound",
      "serializeFields": {
        "pressed": ["common/sounds/sfx-ui-button.mp3"],
        "normal": [""],
        "hover": [""],
        "disabled": [""],
        "click": [""]
      }
    }
  ]
}
```

필수: 루트는 `objectType: Container`. `interactive=true` + `Button`은 이 Container에만. 스케일 연출(`StateSize`)이 있으면 연출 대상(보통 루트 Container)의 `transform.pivot`은 `{ "x": 0.5, "y": 0.5 }`. `listener`는 콜백이 있는 컴포넌트 소유 오브젝트. 콜백이 아직 없으면 `listener`를 `"."`로 두고, 기능을 붙일 때 연결한다.

---

## 쿡북 — 토글

버튼과 같다. 루트는 Container. `Toggle` / State*는 Container에 붙이고, 아이콘 이미지는 자식 Sprite다.

```
BtnSound (Container) [Toggle, StateSize, StateColor, StateSound] interactive=true
  ├ IconOn  (Sprite)   ← on  = child "0"
  └ IconOff (Sprite)   ← off = child "1"
```

```json
{
  "componentName": "Toggle",
  "serializeFields": {
    "isOn": ["true"],
    "on": ["0"],
    "off": ["1"],
    "listener": ["."],
    "callback": ["onClickMute"],
    "args": [""]
  }
}
```

`StateSize`가 있으면 연출 대상 `pivot`은 0.5, 0.5.

ToggleGroup:

```
ToggleGroup (Container) [ToggleGroup, Grid]
  └ Toggle0..N (Container) [Toggle, State*]
        ├ Off (Container)
        └ On  (Container)
```

```json
{
  "componentName": "ToggleGroup",
  "serializeFields": {
    "toggles": ["0", "1", "2"],
    "selectedIndex": ["0"],
    "listener": ["."],
    "callback": ["onChange"],
    "args": [""]
  }
}
```

개별 Toggle: `"on":["1"]`, `"off":["0"]`.

---

## 쿡북 — 슬라이더

버튼과 같다. 루트는 Container. `Slider`는 그 Container에 붙이고, Track/Fill 이미지는 자식 Sprite다. Sprite에 `Slider`를 붙이지 않는다.

섹션(제목·눈금)과 조작 노드를 나눈다. `Slider` 컴포넌트는 **트랙을 가진 Container**에만 둔다. 바깥 래퍼 이름이 `Slider`여도 컴포넌트는 그 안쪽 조작 노드에 붙인다.

```
PickCount (Container) interactive=true
  ├ Title (Text)
  └ Slider (Container) interactive=true          ← 레이아웃만. 컴포넌트 없음
      ├ PickSlider (Container) [Slider] interactive=true
      │   ├ Track  (Sprite)  fillType None, followParentSize X/Y
      │   ├ Fill   (Sprite)  fillType Right (가로) / Up (세로)
      │   └ Handle (Container)
      │       ├ Frame (Sprite)
      │       └ Value (Text)                     ← Slider.text
      ├ CapMin (Text)                            ← 장식. Slider가 안 씀
      └ CapMax (Text)
```

스크롤바 Handle 노드 이름이 `Slider`여도 `UI/Slider`가 아니다. 스크롤은 아래 스크롤 쿡북.

```json
{
  "objectType": "Container",
  "name": "PickSlider",
  "interactive": true,
  "children": [
    { "objectType": "Sprite", "name": "Track", "interactive": false, "fillType": "None" },
    { "objectType": "Sprite", "name": "Fill", "interactive": false, "fillType": "Right" },
    {
      "objectType": "Container",
      "name": "Handle",
      "interactive": false,
      "children": [
        { "objectType": "Sprite", "name": "Frame", "interactive": false },
        { "objectType": "Text", "name": "Value", "interactive": false }
      ]
    }
  ],
  "components": [
    {
      "componentName": "Slider",
      "serializeFields": {
        "direction": ["0"],
        "fill": ["1"],
        "handle": ["2"],
        "text": ["2/1"],
        "padding": ["{\"left\":46.0,\"right\":46.0,\"top\":0.0,\"bottom\":0.0}"],
        "minValue": ["1"],
        "maxValue": ["10"],
        "value": ["10"],
        "step": ["1"],
        "useAnimation": ["true"],
        "animationDuration": ["0.2"]
      }
    }
  ]
}
```

필수:

- 루트는 `objectType: Container`. `interactive=true` + `Slider`는 이 Container에만
- `fill`은 자식 Sprite. 트랙과 **같은 크기**. `fillAmount`로 채움이 보이므로 `fillType`은 가로 `Right`, 세로 `Up`. `None`이면 안 채워진다
- `handle`은 Container. 손잡이 이미지·숫자는 그 자식. Handle `interactive=false` — 히트는 Slider 루트가 받는다
- `padding` left/right(가로) 또는 top/bottom(세로)는 **핸들 두께의 절반**. 없으면 핸들이 트랙 밖으로 나간다
- `text`는 선택. 있으면 값이 그 Text에 쓰인다 (`step>=1`이면 정수)
- `direction`: `0` Horizontal, `1` Vertical
- Track은 직렬화 필드가 아니다. 배경용 자식 Sprite
- 스크립트는 `@Serialize(Slider)`로 조작 노드를 받는다. `.value` / `onValueChanged`

---

## 쿡북 — 입력 필드

새로 만드는 입력이고 기획서에 다른 형태가 없으면 이 쿡북을 쓴다. 이미 키패드 등이 있으면 작업자 요청 없이 `InputField`로 바꾸지 않는다.

루트는 Container. `InputField`는 그 Container에 붙인다. 테두리 이미지(Frame)는 **형제로** 두고, InputField 자식으로 넣지 않는다. Sprite에 `InputField`를 붙이지 않는다.

`DOMElement` / HTML input을 직접 만들지 않는다. 텍스트 입력은 이 컴포넌트만 쓴다. (런타임이 숨은 native input을 붙인다.)

```
OnWin (Container) interactive=true
  ├ Title (Text)
  ├ ToggleGroup ...
  └ Input (Container) interactive=true           ← 비주얼 래퍼
      ├ Frame (Sprite) interactive=false         ← 테두리. InputField 밖
      └ InputField (Container) [InputField] interactive=true
          ├ Text (Text)                          ← 입력값
          └ Placeholder (Text)                   ← 빈 값일 때만 보임
```

숫자만 받는 칸은 `contentType`을 Integer/Decimal로 둔다. 오토 설정의 금액 칸은 Decimal.

```json
{
  "objectType": "Container",
  "name": "InputField",
  "interactive": true,
  "followParentSizeX": true,
  "followParentSizeY": true,
  "fitPadding": { "x": 15.0, "y": 0.0 },
  "children": [
    { "objectType": "Text", "name": "Text", "interactive": false, "text": "" },
    { "objectType": "Text", "name": "Placeholder", "interactive": false, "text": "Input Value" }
  ],
  "components": [
    {
      "componentName": "InputField",
      "serializeFields": {
        "text": ["0"],
        "placeholder": ["1"],
        "value": [""],
        "characterLimit": ["512"],
        "contentType": ["2"],
        "readOnly": ["false"],
        "caretColor": ["#ffffff"],
        "selectionColor": ["#3390ff"],
        "caretBlinkRate": ["0.5"],
        "listener": [""],
        "callback": [""],
        "args": [""]
      }
    }
  ]
}
```

필수:

- 루트는 `objectType: Container`. `interactive=true` + `InputField`는 이 Container에만
- `text` / `placeholder`는 자식 Text. 둘 다 `interactive=false`. 값은 `value`가 비면 Placeholder가 켜진다
- Frame은 InputField의 **형제**. InputField가 자기 크기로 텍스트를 자르므로 테두리를 자식에 넣으면 잘린다
- 글자 여백은 InputField 노드의 `fitPadding`(부모 Frame 대비 inset). 컴포넌트 `padding` 필드에 의존하지 않는다
- `contentType`: `0` Standard, `1` Integer, `2` Decimal, `3` Password
- `listener` / `callback`은 **포커스를 잃을 때**(엔터·바깥 클릭). 타이핑 중은 `onValueChanged`
- 콜백이 아직 없으면 `listener`를 `""`로 두고, 기능을 붙일 때 연결한다
- 스크립트는 `@Serialize(InputField)`로 `.value`를 읽는다

---

## 쿡북 — 모달 팝업

```
PopupXxx (Container) [Animation] interactive=true
  ├ BG (Container) [Collider]
  │   └ Dim 또는 Frame (Sprite)
  ├ Head
  │   └ BtnClose [Button, State*]
  └ Body
```

```json
{
  "componentName": "Animation",
  "serializeFields": {
    "clips": [
      "common/animations/popup-show.anim",
      "common/animations/popup-hide.anim"
    ],
    "autoPlay": ["False"]
  }
}
```

템플릿/참고의 clip 경로가 `popup_show.anim`이면 **기존 파일을 그대로 참조**한다. 새로 만들 파일만 kebab-case.

게임 전용 팝업은 `game.prefab`의 `Popup` 아래에 둔다. dim Collider는 팝업이 열릴 때 입력을 막는다. 공용 시스템 팝업은 intro `PopupManager`를 사용한다.

---

## 쿡북 — 로딩

`common/prefabs/loading.prefab` (템플릿 유지, 스킨만 교체):

```
Loading
├── BG [FitToScreen]
│   └── ...
└── ProgressBar [Progress]
    ├ Frame
    └ Bar / percent (Text)
```

```json
{
  "componentName": "Progress",
  "serializeFields": {
    "direction": ["0"],
    "fill": [""],
    "minSize": ["0"],
    "text": ["1"]
  }
}
```

---

## 쿡북 — 스크롤 (HowToPlay 패턴)

pixibrown 내장 `ScrollRect`를 쓴다. 관성·휠·러버밴드는 이 컴포넌트에 들어 있다. 커스텀 `MomentumScroll` / `WheelScroll` / `ScrollbarOverscroll`은 쓰지 않는다.

```
ScrollRules (Container) [ScrollRect] interactive=true
  └ Viewport (Container) [Mask]
      └ Content (Container)
          └ LabelRules (Text)
Scrollbar (Container) [Scrollbar] interactive=true
  ├ Track (Sprite)
  └ Handle (Sprite)
```

감속·휠 거리 등을 기본값에서 바꿀 때만 같은 노드에 `ScrollExtraSettings`를 붙인다.

```json
{
  "componentName": "ScrollRect",
  "serializeFields": {
    "viewport": ["0"],
    "content": ["0/0"],
    "scrollDirection": ["1"],
    "movementType": ["0"],
    "inertia": ["true"],
    "autoHideScrollbar": ["false"],
    "horizontalScrollbar": [""],
    "verticalScrollbar": ["../5"],
    "listener": [""],
    "callback": [""]
  }
}
```

```json
{
  "componentName": "Scrollbar",
  "serializeFields": {
    "handleRect": ["1"],
    "direction": ["2"],
    "value": ["0"],
    "size": ["0.2"],
    "minSize": ["24"],
    "numberOfSteps": ["0"]
  }
}
```

필수:

- 루트는 `objectType: Container`. `interactive=true` + `ScrollRect`는 이 Container에만. Sprite에 붙이지 않는다
- `viewport`는 자식 Container + `Mask`. `content`는 viewport의 자식. 본문은 content 아래에 둔다
- `scrollDirection`: `0` Horizontal, `1` Vertical, `2` Both
- `movementType`: `0` Elastic (경계에서 러버밴드), `1` Clamped (경계에서 정지)
- `verticalScrollbar` / `horizontalScrollbar`는 `Scrollbar` **컴포넌트** 참조 (`serializeTypes`: `component`). 형제이면 `../N`. HowToPlay intro는 `"../5"`
- 휠은 `ScrollRect` 내장이라 `WheelScroll`을 붙이지 않는다
- 스크롤바 Handle 노드 이름이 `Slider`여도 `UI/Slider`가 아니다
- 스크립트는 `@Serialize(ScrollRect)` 또는 `getComponent(ScrollRect)`. 맨 위로 되돌릴 때 `.goto(x, 0, true)`

리스트를 페이지로 넘기는 경우 `ScrollRect` 대신 `Grid` + 페이지 버튼 + 아이템 prefab.

---

## 쿡북 — 레이아웃 그룹

긴 폼·뱃지·메뉴를 `pos.y`로 쌓지 않는다. 언제 쓸지는 [scene-structure.md](scene-structure.md).

```
Title (Container) [HorizontalLayoutGroup]
  ├ Frame (Sprite)  followParentSize X/Y
  └ Label (Text)
```

세로 나열은 `VerticalLayoutGroup`. 스크롤 본문은 Viewport 안 Content에 붙인다.

```json
{
  "componentName": "HorizontalLayoutGroup",
  "serializeFields": {
    "padding": ["{\"left\":12.0,\"right\":12.0,\"top\":3.0,\"bottom\":3.0}"],
    "spacing": ["0"],
    "fitToContents": ["true"],
    "childAlignment": ["4"],
    "controlChildSizeWidth": ["true"],
    "controlChildSizeHeight": ["false"],
    "childForceExpandWidth": ["false"],
    "childForceExpandHeight": ["false"]
  }
}
```

필수:

- `fitToContents: true` — 자식 크기에 부모가 맞춰진다. 글자 뱃지·알림에 쓴다
- Frame은 자식 Sprite + `followParentSizeX/Y`. 9-slice. 프레임 size를 손으로 키우지 않는다
- `padding`은 컨텐츠 inset. `spacing`은 자식 간격
- `childAlignment`: `4`는 Center (엔진 enum)
- 자식 폭을 줄이려면 `LayoutElement` 또는 그 노드 `fitPadding`
- 패널 Shade inset도 `followParentSize` + `fitPadding` (좌표로 줄이지 않는다)

---

## 쿡북 — 카운터 텍스트

```
Prize (Container)
  └ Value (Text)  "0.00"
```

롤업이 필요하면 `AnimatedCounter`를 부모 Container에 붙인다. 이미지가 없는 카운터 슬롯은 노드를 만들지 않는다.

## HUD 묶기 (예시)

아래 트리는 **한 게임의 베팅 HUD 예시**다. 다른 게임에 `Normal` / `AutoSettings` / `BtnBet`를 그대로 만들지 않는다. 같이 켜지는 상태를 자식으로 겹치고, 공유 크롬만 밖에 두는 **묶기**만 따른다. [scene-structure.md](scene-structure.md).

이미지가 있는 레이어만 만든다. 대기에서 보일 레이어만 `enable: true`.

```
(HUD 루트) [해당 컴포넌트]
└ (피벗)
    ├ (모드 A)            # 그 상태에서 보이는 컨트롤
    ├ (모드 B)            # 기본 enable false
    ├ (공유 ± 베팅 등)
    └ (메뉴 등)
```

버튼·토글·슬라이더·입력필드는 위 쿡북을 따른다. 버튼을 넣을 때 `StateSize`·pivot·필요하면 클릭→`REQ_BET`까지 같은 작업에서 다룬다.

SceneMaker 확인은 [scene-complete.md](scene-complete.md).
