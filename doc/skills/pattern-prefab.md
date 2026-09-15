# 프리팹 패턴

반복되는 조립 방식이다. GoldFormula 프로젝트를 열지 말고 이 문서를 따른다.

파일 JSON 필드는 [engine-schemas.md](engine-schemas.md). 버튼/토글/슬라이더/입력필드/스크롤 트리는 [scene.md](scene.md). 나누기·묶기는 [scene-structure.md](scene-structure.md). 진행은 [workflow.md](workflow.md).

## SceneMaker vs JSON

1. **기본**: `SceneMaker.exe`로 노드를 놓고, Animation/Particle 에디터로 클립을 만든다.
2. AI가 JSON을 쓸 때: 스키마의 **노드 골격 전체를 복사**한 뒤 `name`·`transform`·`image`만 바꾼다. transform을 생략하지 않는다.
3. 한 파일에 수백 노드를 한 번에 새로 쓰지 않는다. `game.prefab`을 확장하고, 반복 아이템은 **별도 prefab**으로 뺀다.

## UI는 prefab / 씬에 둔다

스크립트는 이미 있는 노드를 `@Serialize`로 받아 **제어만** 한다 (`active`, 텍스트, 연출). 위치·크기·계층을 TypeScript 상수로 박고 `new Container()` / `new Sprite()` / `addChild`로 UI를 조립하지 않는다.

허용:

- `game.prefab`(게임 씬)에 직접 넣기
- 시트·팝업·설정창처럼 덩치가 크거나 재사용하는 UI는 별도 prefab (`raw-assets/game/prefabs/*.prefab`)으로 저장하고, `@Serialize(Asset)`으로 불러와 `clone()`하거나 씬에 중첩

금지 (작업자가 그 방식을 **직접 지시하지 않는 한**):

- prefab 없이 스크립트에서 UI 트리를 만들고 좌표를 배치하는 것
- `Graphics` / 도형으로 시트·칩·구분선을 그려 화면을 구성하는 것

`Prefab.clone()`은 반복 칸·목록 행에 쓴다. **개수가 고정이어도** 인스턴스를 씬에 베이크하지 않는다. 원형은 prefab 파일이어야 한다.

## 아트 입력

UI 이미지는 작업자가 준 PNG다. 절차는 [assets.md](assets.md).

- 게임 UI Sprite는 받은 PNG를 `raw-assets`로 복사해 연결한다. 다시 그리거나 오리지 않는다
- `screen-*.png` 레이아웃 원본은 미리보다. `image`로 쓰지 않는다
- 같은 모양은 같은 파일을 가리킨다
- 고정 글자는 스프라이트. 바뀌는 숫자만 Text. 배치는 `layout.md`
- `common/images/loading/white_box.png`는 템플릿 로딩용이다. 게임 UI에 쓰지 않는다. 이미지가 없으면 노드를 만들지 않는다
- 사운드·Spine·전용 폰트는 작업자 파일이 있을 때만 추가한다
- 레이아웃과 무관한 PNG를 `raw-assets`에 대량 생성하지 않는다

## game.prefab

템플릿 `game.prefab`은 **스텁**이다 (배경 + 안내 텍스트). 공용 시스템 팝업은 **intro.prefab**에 있다. 게임 HUD·콘텐츠는 `game.prefab`에 추가한다.

intro의 `SceneManager` / `GameModule` / `Sequence` / `PopupManager`를 게임 씬에 복제하지 않는다. 큰 껍질만 공통이고 Contents·HUD 안은 게임마다 다르다. [scene-structure.md](scene-structure.md).

```
Root                          # 1080×1920, interactive=true
├── CanvasBG [FitToScreen]   # 창 여백. 게임 배경과 다른 이미지
├── Main [GameMain 서브클래스]
│   ├── GameBG
│   ├── Contents              # 본편. 반복 칸은 아이템 prefab
│   └── (HUD)
└── Popup                     # 게임 전용 모달만
```

이미지가 있는 UI만 노드로 둔다.

## HUD 묶기

한 컨테이너 안에 **같이 켜지는 상태**를 자식으로 겹쳐 두고, 컴포넌트가 `active`로 전환한다. 각 상태 자식은 그 상태에서 보이는 컨트롤을 가진다. 공유되는 것만 밖에 둔다. 대기에서 보일 자식만 `enable: true`.

아래는 베팅 HUD가 있는 게임의 **예시**다. 모드 이름·버튼을 다른 게임에 복사하지 않는다.

```
(HUD 루트)
└ (피벗)
    ├ (일반 상태)
    ├ (다른 상태들)         # 기본 enable false
    ├ (공유 컨트롤)
    └ (메뉴 등)
```

버튼·토글·슬라이더·입력필드는 씬 문서 쿡북. 루트는 항상 Container이고 `Button`/`Toggle`/`Slider`/`InputField`/`State*`는 그 Container에 붙인다. 이미지는 하위 Sprite. Sprite에 이 컴포넌트를 붙이지 않는다.

`Button.listener`는 **그 HUD 컴포넌트가 붙은 노드**, `callback`은 그 컴포넌트 메서드명. Main에 클릭 핸들러를 두지 않는다.

클릭 후 서버 송신은 BottomUI → `gameMain.requestBet()` → `Sequence.sendMessage`. 레이어 전환·`isPlaying` 잠금은 [client.md](client.md) BottomUI 제어.

메뉴/팝업에는 `Animation` 클립을 붙이고, 연출만 확인할 때는 DevButton을 쓸 수 있다. HowToPlay / BetHistory는 intro 공용 팝업을 연다.

## 모달 팝업

```
PopupXxx [Animation] interactive=true   # clips: show=0, hide=1, autoPlay false
  ├ Dim 또는 BG [Collider]              # 바깥 클릭 흡수
  ├ Frame
  ├ Title (Text + Localize)
  ├ Body
  └ BtnClose [Button, State*]
```

게임 전용은 `game.prefab` / `Popup` 아래. 다음 이름은 intro에만 둔다. 게임 씬에 복제하지 않는다: `Tutorial`, `HowToPlay`, `BetHistory`, `FreespinStart`, `FreespinEnd`, `CommonPopup`.

제어 컴포넌트 최소 API: `show()` → `animation.play(0)`, `hide()` → `play(1)`.

## 반복 아이템 prefab

리스트 행, 보드 칸, 페이테이블 칸, 알림 토스트처럼 **여러 개 찍는 것**은 씬에 복제해 두지 말고 단독 prefab. 개수가 고정이어도 같다. `game.prefab`에는 `TileRoot [Grid]`만 둔다. SceneMaker에서 격자가 비어 보이는 것은 정상이다.

```
raw-assets/game/prefabs/history-item.prefab
raw-assets/game/prefabs/keno-tile.prefab
raw-assets/game/prefabs/paytable-tile.prefab
```

아이템 루트에 전용 컴포넌트 + 표시용 자식(Text/Sprite/Spine). 부모는 `@Serialize(Asset) itemPrefab`과 `@Serialize(Container) itemRoot`를 가진다.

스폰:

```typescript
const node = this.m_itemPrefab.clone();
this.m_itemRoot.addChild(node);
const item = node.getComponent(HistoryItem);
item.bind(data);
```

`Prefab.clone()`은 이 엔진에서 **동기**다 (`Promise`가 아님). 풀: 숨긴 인스턴스를 배열에 넣고 `active = false` 후 재사용.

그리드: 부모에 builtin `Grid` + `itemRoot`. 칸 위치는 Grid가 잡거나, 테스트에선 `@Serialize`된 `cellWidth`/`cellHeight`로 `transform.position`을 직접 넣는다.

## 커스텀 컴포넌트를 prefab에 붙이는 순서

1. `src/game/**`에 `@RegisterComponent` + `@Serialize` 클래스 작성. **파일당 등록 컴포넌트 하나.** 두 클래스를 한 파일에 두지 않는다. 시리얼라이즈 타입은 `as`로 바꾸지 않는다. 기본 `Number`/`String`/`Boolean`이 필요하면 pixibrown에서 그 이름을 import 하지 않는다
2. `components.meta/custom/{Class}.json` — SceneMaker 스캔 또는 [엔진 스키마](engine-schemas.md)대로 작성
3. prefab 노드 `components`에 `componentName` (클래스명 또는 등록 경로의 마지막 토큰 — SceneMaker가 쓰는 이름과 동일하게)
4. SceneMaker에서 Serialize 슬롯을 드래그해 연결. JSON로 할 때는 `serializeFields` 경로를 손으로 넣는다

`findByName` / `children[i]`로 런타임 탐색하지 않는다.
