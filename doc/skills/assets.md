# raw-assets

경로·번들·아틀라스 규칙. 진행 방식은 [workflow.md](workflow.md). 씬 노드/UI 구성은 [scene.md](scene.md). 파일 JSON 형식은 [engine-schemas.md](engine-schemas.md). 경로·아틀라스 조회는 [engine-resources.md](engine-resources.md).

## 작업자 이미지 → raw-assets

쓸 이미지는 작업자가 준 PNG다. AI는 이미지를 생성하지 않는다.

- 대상: `{bundle}/images/{atlas}/파일.png` (kebab-case, 경로 조각 4개)
- 받은 PNG를 `raw-assets`로 **복사**한다. 다시 그리지 않는다. 오리지 않는다
- `screen-*.png` 레이아웃 원본은 미리보다. 배경이든 UI든 `image`로 쓰지 않는다
- prefab의 `image`는 복사한 파일들을 가리킨다. 같은 모양은 같은 파일을 가리킨다
- **빈 상자·`white_box.png`로 게임 UI를 채우지 않는다.** 이미지가 없으면 그 노드를 만들지 않는다
- 그림에 들어 있는 고정 글자는 스프라이트 그대로 둔다. 바뀌는 숫자만 Text다
- prefab 배치는 `layout.md`를 따른다. 좌표는 작업자 레이아웃에서 잰다
- 레이아웃·기획과 무관한 장식 PNG를 만들지 않는다

작업 순서:

1. 받은 PNG를 kebab-case로 `raw-assets/{bundle}/images/{atlas}/`에 복사한다
2. prefab `image`에 연결한다. 글자는 Text 노드로 둔다
3. `npm run build:assets:dev` 후 SceneMaker에서 작업자 레이아웃과 **같은 배치**인지 확인한다
4. 개발 서버/프로젝트를 실행하기 **전**에도, 이번 작업에서 에셋이 바뀌었으면 같은 명령을 먼저 돌린다

사운드·폰트·Spine은 작업자 파일이 오기 전에 템플릿 기본(폰트 등)만 쓴다. 작업자가 나중에 같은 경로에 고해상도 PNG를 덮어쓸 수 있다.

하지 말 것:

- 화면을 AI가 처음부터 그리기
- `screen-*.png` 레이아웃을 사각형으로 잘라 `raw-assets`에 넣기
- `screen-*.png`를 배경·UI `image`로 쓰기
- 없는 UI를 `white_box`로 대체하기
- 이미 넣은 같은 모양을 새 파일로 복제하기

## 폴더 구조

템플릿 `raw-assets` 최상위 구조를 유지한다. 번들 = 최상위 폴더명.

```
raw-assets/
├── common/
│   ├── animations/
│   ├── fonts/
│   ├── images/
│   │   ├── loading/          # 아틀라스 소스 폴더
│   │   └── popup/
│   ├── prefabs/
│   └── sounds/
├── intro/
│   ├── prefabs/
│   └── scenes/
├── game/
│   ├── animations/
│   ├── fonts/                # 게임 전용 폰트가 있을 때만
│   ├── images/
│   │   └── {atlas-name}/
│   ├── particles/
│   ├── prefabs/
│   ├── scenes/
│   ├── sounds/
│   └── spines/
└── localize/
    ├── common/               # {lang}.json
    └── game/
```

타입별 폴더명: `images`, `fonts`, `sounds`, `prefabs`, `scenes`, `animations`, `particles`, `spines`. 이 이름을 바꾸지 않는다.

## 필수 번들

| 번들 | 역할 |
|------|------|
| `common` | 로딩, 공용 팝업 스킨, 폰트, 공용 SFX |
| `intro` | intro 프리팹 |
| `game` | 게임 콘텐츠 (이미지, prefab, scene, 사운드, 연출) |
| `localize` | `common/{lang}.json`, `game/{lang}.json` |

추가 번들(`bottom_ui`, `popup` 등)은 만들지 않는 것을 기본으로 한다. 용량·로딩 분리가 필요할 때만 작업자 확인 후 추가한다.

### 참고 예외 (따르지 않음)

GoldFormula는 게임 번들명이 `goldformula`이고 `bottom_ui`/`popup` 번들을 썼다. **새 프로젝트는 `game` 번들을 쓴다.**

## 씬 파일 (템플릿 구성 유지)

| 파일 | bundles | rootPrefab |
|------|---------|------------|
| `intro/scenes/intro.scene` | `common`, `intro` | `intro/prefabs/intro.prefab` |
| `game/scenes/game.scene` | `common`, `game` | `game/prefabs/game.prefab` |

씬 파일명은 프로젝트 전체에서 unique해야 한다. `initialScene`은 `intro`.

## 이미지 아틀라스

```
{bundle}/images/{atlas-name}/*.png     ← 소스. 폴더 1개 = 아틀라스 1장
{bundle}/images/{atlas-name}.json      ← 빌드 산출물. 직접 만들지 않음
{bundle}/images/{atlas-name}.webp      ← 빌드 산출물. 직접 만들지 않음
```

- `images/` **직하위 폴더만** TexturePacker 아틀라스가 된다
- **`images/` 직하의 파일은 빌드가 전부 삭제한다.** 확장자를 가리지 않는다(`prepare-dev.js`가 `images/` 직하 파일을 `unlink`). 소스 PNG를 여기에 두면 `build:assets:dev` 한 번에 사라진다. 소스는 반드시 `images/{atlas-name}/` 안에 둔다
- 빌드: `npm run build:assets:dev` (에셋 변경 후, 프로젝트 실행 전에 필수)
- 런타임 프레임 키: `{bundle}.{atlas-name}.{filename}.png`
  - 예: `game/images/ui/btn-bet.png` → `game.ui.btn-bet.png`
- 빌드가 경로를 소문자로 정규화한다. 처음부터 소문자 kebab-case로 둔다
- 권장 한 장 최대 2048. 넘으면 아틀라스 폴더를 나눈다

## 파일명

**kebab-case** (소문자, 하이픈).

권장 접두:

| 종류 | 접두 | 예 |
|------|------|-----|
| 버튼 | `btn-` | `btn-bet.png` |
| 아이콘 | `icon-` | `icon-sound-on.png` |
| 배경 | `bg-` | `bg-portrait.png` |
| UI 이미지 | `img-` | `img-popup-frame.png` |
| FX | `fx-` | `fx-light.png` |
| SFX | `sfx-` | `sfx-ui-button.mp3` |
| BGM | `bgm-` | `bgm-play.mp3` |
| 애니 | `*-show` / `*-hide` | `popup-show.anim` |

폰트 벤더명(`opensans-bold.ttf`)은 kebab으로만 바꾼다.

## 생성 가능한 파일 타입

이 목록 외의 파일을 `raw-assets`에 만들지 않는다.

| 타입 | 확장자 |
|------|--------|
| 이미지 | `*.png` 또는 pixibrown이 로드하는 이미지 |
| 폰트 | `*.ttf` 또는 pixibrown이 로드하는 폰트 |
| 사운드 | `*.mp3` 또는 pixibrown이 로드하는 사운드 |
| Spine | `*.atlas` + `*.json` + `*.png` 묶음 (같은 폴더) |
| 프리팹 | `*.prefab` |
| 씬 | `*.scene` |
| 애니메이션 | `*.anim` |
| 파티클 | `*.particle` |

로컬라이즈 JSON(`localize/**/*.json`)은 텍스트 번들이므로 허용한다.

만들지 말 것: `.html`, `.css`, `.js` 에셋, Spine binary (`.skel`), 임의 스크립트를 `raw-assets`에 두는 행위.

## Spine

- 위치: `game/spines/{name}/` 또는 `game/spines/{name}.{atlas,json,png}`
- JSON 스켈레톤만. `.skel` 불가
- 경로 소문자
- 멀티 페이지 텍스처는 같은 폴더

## 로컬라이즈

```
localize/common/{lang}.json    # 에러, 공통 버튼, NOTICE_*
localize/game/{lang}.json      # 게임 카피. 같은 키면 game이 우선
```

로케일 이미지 번들(`bundle.json`, `localize_assets*`)은 기본 사용하지 않는다.

SceneMaker 확인은 [scene-complete.md](scene-complete.md).
