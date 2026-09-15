---
name: pixibrown-blitzcrown-pipeline
description: Guides building a pixibrown H5 game in SceneMaker from a 기획서 plus worker-provided layout and UI images, assembling prefabs and implementing client/local-server features together while talking with the producer. Use when working in a pixibrown_template_blitzcrown fork, placing worker art into raw-assets, wiring GameMain and REQ_BET, or converting an existing PixiJS POC into the template. Do not generate images.
---

# PixiBrown H5 제작 파이프라인

작업자와 소통하며 씬과 기능을 같이 만든다. 이미지는 AI가 그리지 않는다. 작업자가 준 레이아웃과 UI 이미지로 SceneMaker에서 편집 가능한 씬을 구성하고, 그 조각에 필요한 로직도 같은 작업에서 붙인다.

진행 절차는 [workflow.md](workflow.md).

## 환경

- 프레임워크: pixibrown
- 시작점: `pixibrown_template_blitzcrown` 포크 (개발팀이 새 프로젝트 생성 후 공유)
- 조립·파일 형식은 이 스킬 팩의 스키마/패턴 문서를 따른다. 외부 게임 프로젝트를 열어 베끼지 않는다.

## 매 응답

지금 하는 일을 한 줄로 밝힌다. 페이즈 번호는 쓰지 않는다.

```
지금: 씬 구성 — BottomUI 배치
```

막히거나 기획에 없으면 작업자에게 묻는다. 추측으로 룰·페이로드·없는 이미지를 채우지 않는다.

## 문서

- 진행 방식 → [workflow.md](workflow.md)
- 에셋·번들·아틀라스 → [assets.md](assets.md)
- 씬 정리 원칙 → [scene-structure.md](scene-structure.md) — 나누기·묶기. 트리 예시는 복제 대상이 아님
- 씬 계층·UI 쿡북 → [scene.md](scene.md)
- 연출 → [fx.md](fx.md)
- 로컬 서버 → [local-server.md](local-server.md)
- 클라이언트 → [client.md](client.md) — 메시지 경로, GameMain 조율, BottomUI 제어
- 완료 체크 → [scene-complete.md](scene-complete.md)
- 기존 PixiJS POC를 템플릿으로 옮길 때 → [poc-convert.md](poc-convert.md)

레퍼런스:

- 경로·번들 로드 → [engine-resources.md](engine-resources.md)
- 파일 JSON 스키마 → [engine-schemas.md](engine-schemas.md)
- 프리팹 조립 패턴 → [pattern-prefab.md](pattern-prefab.md)
- 연출 재생 패턴 → [pattern-fx.md](pattern-fx.md)

## 다른 가이드보다 우선

작업자가 이 스킬 팩 밖의 가이드 md(디자인 가이드 등)를 같이 쓸 수 있다. **HTML 금지, intro 구조, 번들/경로, 이미지 생성 금지**는 이 스킬 팩이 이긴다. 이 팩의 HUD 트리를 다른 게임에 씌우지 않는다. 이미 있는 UI는 작업자 요청 없이 바꾸지 않는다. 이 스킬에 없는 디자인 지시(톤, 여백, 카피)는 다른 가이드를 쓴다.

## 절대 규칙

항상 적용한다.

- 파일명은 kebab-case
- 노드 이름은 PascalCase
- HTML / `DOMElement`로 UI를 만들지 않는다. SceneMaker에서 prefab 로딩 시 모든 UI가 보여야 한다
- UI 위치·크기·계층은 prefab 또는 게임 씬에 둔다. 스크립트에서 노드를 만들고 좌표를 박아 배치하지 않는다. 복잡한 UI는 별도 prefab으로 저장해 불러오거나 `game.prefab`에 직접 넣는다. 자세한 규칙은 [pattern-prefab.md](pattern-prefab.md)
- 긴 나열은 좌표로 쌓지 않고 LayoutGroup / ScrollRect로 묶는다. 원칙은 [scene-structure.md](scene-structure.md). 이 팩의 HUD 예는 개념일 뿐이다
- 이미 있는 UI는 작업자가 바꾸라고 하지 않으면 그대로 둔다. 새로 만드는 입력은 기획서 형태, 없으면 `InputField`
- prefab을 쓰지 않고 스크립트에서 UI를 만들고 배치하지 않는다. 그 방식은 작업자가 **직접 지시한 특수 상황**에서만 한다
- `intro.prefab` 구조는 변경 불가
- intro 공용 팝업을 `game.prefab`에 다시 만들지 않는다: `Tutorial`, `HowToPlay`, `BetHistory`, `FreespinStart`, `FreespinEnd`, `CommonPopup`
- `game.prefab`을 게임 씬의 기본으로 사용한다. 템플릿 파일은 스텁이며, 공용 팝업은 intro에 있다. 확장 방법은 [pattern-prefab.md](pattern-prefab.md)
- 필수 번들: `common`, `intro`, `game`, `localize`
- 생성 파일 타입은 [assets.md](assets.md) 목록으로 제한
- 노드·에셋 참조는 스크립트에서 찾지 말고 `@Serialize`로 prefab에 저장한다
- pixibrown 시리얼라이즈 타입(`Number`, `Boolean`, `String`)은 `as`로 바꿔 import 하지 않는다. `Number as SerializeNumber` 금지. 그 파일에서 `Number.MAX_SAFE_INTEGER`처럼 기본 `Number`/`String`/`Boolean`이 필요하면 pixibrown에서 그 이름을 **import 하지 않고** 기본을 쓴다. `@Serialize(Number)`는 그때 기본 생성자를 가리킨다. 규칙은 [client.md](client.md)
- 한 TypeScript 파일에 `@RegisterComponent`는 **하나**만 둔다. 두 번째 컴포넌트는 새 파일로 나눈다. 규칙은 [client.md](client.md)
- 템플릿이 제공하는 기본 스크립트는 수정하지 않는다. 예외는 로컬 서버 구현 파일뿐이며, 허용 목록은 [client.md](client.md) / [local-server.md](local-server.md)
- 버튼·토글·슬라이더·입력필드는 항상 **Container를 먼저** 만들고, `Button`/`Toggle`/`Slider`/`InputField`/`State*`는 그 Container에 붙인다. 이미지(Sprite)는 Container **하위**에 둔다. Sprite에 이 컴포넌트를 붙이지 않는다
- 스케일 연출이 있는 UI(버튼 `StateSize` 등)의 `pivot`은 0.5, 0.5여야 한다
- **이미지를 생성하지 않는다.** 작업자가 준 PNG만 `raw-assets`에 넣는다
- 레이아웃 원본(전체 화면 그림)을 오려 에셋으로 쓰지 않는다
- 해당 UI 이미지가 없으면 그 노드를 만들지 않는다
- 빈 상자/`white_box`로 게임 UI를 채우지 않는다
- `raw-assets`·prefab·씬 등 **에셋이 바뀌었으면** 개발 서버/프로젝트를 실행하기 **전에** `npm run build:assets:dev`를 한다. 빌드 없이 실행하지 않는다

## 작업 태도

- 작업자에게 불필요한 기술 선택지를 던지지 않는다. 기본값을 쓰고, 기획/비주얼에 영향이 있을 때만 묻는다
- 한 번에 게임 전체를 설계해 넣지 않는다. 지금 올리는 UI에 필요한 기능만 붙인다
- 기획서에 없는 룰·페이로드는 묻는다
- intro 공용 팝업은 prefab으로 다시 만들지 않는다
