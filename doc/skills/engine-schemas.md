# 엔진 파일 스키마

원본: pixibrown `src/serialize-define/*.ts`, 인스턴스화는 `src/resource/prefab.ts`.
경로·번들 조회는 [engine-resources.md](engine-resources.md).

추측으로 필드를 만들지 말고 아래 타입을 복제한다. 신규 `.anim` / `.particle`은 SceneMaker가 안전하다.

---

## `.scene` (`SceneData`)

```json
{
  "bundles": ["common", "intro"],
  "rootPrefab": "intro/prefabs/intro.prefab"
}
```

게임: `"bundles": ["common", "game"]`, `"rootPrefab": "game/prefabs/game.prefab"`.

`Scene.loadScene`이 `bundles`만 로드한 뒤 `rootPrefab`을 `clone()`한다.

---

## `.prefab` (`PrefabData`)

```json
{
  "version": "1.0",
  "root": { }
}
```

`version`을 제외한 **첫 번째 키**가 루트 노드다. 키 이름은 보통 `root`. `PREFAB_VERSION`은 `'1.0'`.

`clone()`은 동기. 루트 씬 오브젝트는 로드 후 position/scale/rotation이 리셋되고 pivot·anchor는 0.5로 맞춰진다.

### 공통 노드 (`GameObjectData`)

모든 `objectType`에 필수.

```json
{
  "objectType": "Container",
  "enable": true,
  "name": "BtnBet",
  "interactive": true,
  "followParentSizeX": false,
  "followParentSizeY": false,
  "fitPadding": { "x": 0.0, "y": 0.0 },
  "transform": {
    "position": { "x": 0.0, "y": 0.0 },
    "size": { "width": 200.0, "height": 80.0 },
    "anchor": { "x": 0.5, "y": 0.5 },
    "pivot": { "x": 0.5, "y": 0.5 },
    "rotation": 0.0,
    "scale": { "x": 1.0, "y": 1.0 }
  },
  "color": 16777215,
  "alpha": 1.0,
  "blendMode": "normal",
  "children": [],
  "components": []
}
```

`objectType`: `Container` | `Sprite` | `Text` | `Particle` | `Spine`  
(타입 주석에는 Spine이 없지만 `prefab.ts`가 처리한다.)

`followParentSizeX/Y` → 런타임 `fitWidth` / `fitHeight`. `fitPadding`의 x/y는 각각 width/height 패딩.

`blendMode`: `inherit` | `normal` | `add` | `multiply` | `screen` | `overlay` | `darken` | `lighten` | `color-dodge` | `color-burn` | `hard-light` | `soft-light` | `difference` | `exclusion` | `hue` | `saturation` | `color` | `luminosity`

`color`는 정수 RGB (`16777215` = 흰색). 루트 캔버스 기본 크기 1080×1920.

버튼처럼 스케일 연출(`StateSize` 등)이 있는 노드의 `pivot`은 반드시 `{ "x": 0.5, "y": 0.5 }`. 그 노드는 Container다. Sprite에 `Button` / `Toggle` / `Slider` / `InputField` / `State*`를 붙이지 않는다.

알 수 없는 `objectType`은 Container로 떨어진다.

### 컴포넌트 (`ComponentData`)

```json
{
  "enable": true,
  "componentName": "Button",
  "serializeFields": {
    "listener": ["."],
    "callback": ["onClick"],
    "args": [""]
  },
  "serializeTypes": {
    "listener": "object",
    "callback": "default",
    "args": "default"
  }
}
```

`componentName`으로 `ComponentSystem.createComponentSync`가 생성한다. SceneMaker 등록명과 같아야 한다.

참조 경로: `""`/`"."` 자신, `"0"` 자식 인덱스, `"0/1"` 경로, `"../.."` 부모, 에셋 `"game/animations/foo.anim"`.

`serializeTypes`: `object` | `component` | `asset` | `default`.

### Sprite (`SpriteData`)

공통 노드 + :

```json
{
  "objectType": "Sprite",
  "spriteType": "Simple",
  "image": "game/images/ui/btn-bet.png",
  "sliceInfo": {
    "leftWidth": 5,
    "rightWidth": 5,
    "topHeight": 5,
    "bottomHeight": 5
  },
  "tileInfo": {
    "tilePosition": { "x": 0.0, "y": 0.0 },
    "tileScale": { "x": 1.0, "y": 1.0 },
    "tileRotation": 0.0
  },
  "enableGradient": false,
  "gradientColors": [16777215, 16777215, 16777215, 16777215],
  "fillType": "None",
  "fillAmount": 1.0
}
```

- `spriteType`: `Simple` | `Sliced` | `Tiled`. 없으면 Simple
- `Sliced`는 `sliceInfo` 필수, 없으면 Simple으로 폴백
- `Tiled`는 `tileInfo` 필수
- `image`는 [리소스 경로](engine-resources.md) 4단계 아틀라스 경로. 빈 문자열이면 빈 텍스처
- `fillType`: `None` | `Up` | `Down` | `Left` | `Right` | `Clockwise` | `CounterClockwise`
- 게임 UI: 작업자가 준 PNG를 `raw-assets/{bundle}/images/{atlas}/`에 복사한 파일. `screen-*.png` 레이아웃을 오리지 않는다. `common/images/loading/white_box.png`는 템플릿 로딩용이며 게임 UI에 쓰지 않는다. 이미지가 없으면 해당 노드를 만들지 않는다

### Text (`TextData`)

공통 노드 + :

```json
{
  "objectType": "Text",
  "textType": "Text",
  "text": "0.00",
  "fontFamily": "common/fonts/opensans-bold.ttf",
  "fontSize": 32,
  "fill": 16777215,
  "align": "center",
  "alignVertical": "center",
  "wordWrap": false,
  "bestFit": false,
  "bestFitMinSize": 0,
  "bestFitMaxSize": 0,
  "ellipsis": false,
  "ellipsisString": "…",
  "outline": { "color": 0, "alpha": 1.0, "width": 0 },
  "shadow": { "color": 0, "alpha": 1.0, "blur": 0, "angle": 0.0, "distance": 0 },
  "gradient": {
    "startPos": { "x": 0.0, "y": 0.0 },
    "endPos": { "x": 0.0, "y": 1.0 },
    "startColor": 16777215,
    "endColor": 16777215
  }
}
```

- `textType`: `Text` | `BitmapText` | `HTMLText`
- **`HTMLText` 사용 금지.** SceneMaker에서 일반 Text로 보여야 한다
- `fontFamily`는 로드 시 소문자화된다
- `wordWrap: true`이면 wrap 너비 = `transform.size.width`
- outline은 `width > 0`일 때만 stroke. shadow는 `distance > 0`일 때만. gradient는 start/end color가 다를 때만

### Particle 노드 (`ParticleData`)

공통 노드 + :

```json
{
  "objectType": "Particle",
  "autoPlay": false,
  "particlepath": "game/particles/fx-light.particle"
}
```

`particlepath`로 `.particle`을 `getAsset`한다. `autoPlay` 기본은 코드상 true. 테스트가 아니면 `false`.

### Spine (prefab.ts, serialize-define에 타입 파일 없음)

공통 노드 + :

```json
{
  "objectType": "Spine",
  "premultiplied": false,
  "atlasPath": "game/spines/blocks.atlas",
  "skeletonPath": "game/spines/blocks.json",
  "currentSkin": "default"
}
```

경로를 소문자로 바꿔 `PixiSpine.from({ skeleton, atlas })`. 둘 중 하나라도 없으면 빈 Spine. 생성 직후 마지막 애니메이션을 loop 재생한다. `.skel` 불가.

---

## `.anim` (`AnimationData`)

```json
{
  "version": "1.0",
  "totalTime": 0.15,
  "loop": false,
  "animationTracks": [
    {
      "objectName": ".",
      "applyChannels": { "r": true, "g": true, "b": true, "a": true },
      "subtracks": {
        "enableKeys": [],
        "positionKeys": [],
        "rotationKeys": [],
        "scaleKeys": [],
        "colorKeys": [],
        "spriteAnimationKeys": [],
        "customEventKeys": [],
        "soundKeys": []
      }
    }
  ]
}
```

| 키 배열 | 항목 |
|---------|------|
| `enableKeys` | `time`, `enable` |
| `positionKeys` / `scaleKeys` | `time`, `x`/`y`: `{ value, curveType, inTangent, outTangent }` |
| `rotationKeys` | `time`, `rotation`: KeyData |
| `colorKeys` | `time`, `r`/`g`/`b`/`a`: KeyData |
| `spriteAnimationKeys` | `time`, `sprite` |
| `soundKeys` | `time`, `sound`, `volume` |
| `customEventKeys` | `time`, `event` |

`objectName`: `"."` = 클립이 붙은 노드. `applyChannels` 미지정 시 RGBA 모두 적용.

빈 배열도 생략하지 않는다. `curveType`은 보통 `"Linear"`.

팝인 show 예: scale 0.6→1.0, color.a 0→1, `totalTime` 0.15. hide는 반대 + 마지막 `enable: false`.

템플릿 `common/animations/popup_show.anim` / `popup_hide.anim`이 있으면 **파일명을 바꾸지 말고 참조**한다.

prefab `Animation.clips` = 경로 배열. 관례 index 0 = show, 1 = hide.

---

## `.particle` 파일 (`ParticleSettings`)

노드가 아니라 **에셋 파일**. `getAsset` 결과는 `{ particleSettings: ParticleSettings }`.

```json
{
  "particleSettings": {
    "image": "game/images/particle/fx-light.png",
    "blendMode": "add",
    "follow": true,
    "looping": true,
    "duration": 4.0,
    "lifeTimeType": "Random",
    "lifeTimeFixed": 2.0,
    "lifeTimeRand": [0.0, 0.8],
    "velocityType": "Random",
    "velocityFixed": [0.0, 80.0],
    "velocityRandX": [-80.0, 80.0],
    "velocityRandY": [-90.0, -10.0],
    "velocityVector": 1.0,
    "gravity": [0.0, 10.0],
    "startColor": [1.0, 0.77, 0.0, 0.98],
    "endColor": [1.0, 0.98, 0.94, 0.0],
    "startSizeType": "Random",
    "startSizeFixed": 10.0,
    "startSizeRand": [1.0, 14.0],
    "endSizeType": "Random",
    "endSizeFixed": 5.0,
    "endSizeRand": [4.0, 60.0],
    "startRotationType": "Random",
    "startRotationFixed": 0.0,
    "startRotationRand": [-20.0, 20.0],
    "endRotationType": "Random",
    "endRotationFixed": 0.0,
    "endRotationRand": [-60.0, 60.0],
    "emissionRate": 80.0,
    "maxParticles": 100,
    "emissionType": "Box",
    "emissionRadius": 200.0,
    "emissionSize": [200.0, 200.0],
    "emissionLineLength": 50.0,
    "emissionLineRotation": 0.0
  }
}
```

`image`가 문자열이면 로드 시 `getAsset`으로 Texture 변환. 아틀라스 4단계 경로여야 한다. 색은 RGBA 0–1.

미세 조정은 SceneMaker. AI는 이 골격을 복사한 뒤 `image`·색·emission만 바꾼다.

---

## `components.meta/custom`

엔진 serialize-define 밖이지만 SceneMaker가 `@Serialize`를 붙일 때 필요하다. `builtin/`은 수정 금지.

```json
{
  "path": "Game/Fx/ModalPopup",
  "registered": true,
  "sourceFile": "src/game/fx/modal-popup.ts",
  "fields": [
    { "type": "Animation", "name": "animation", "typeInfo": "component" },
    { "type": "Number", "name": "delay", "typeInfo": "default", "default": "0.2" },
    { "type": "Container", "name": "root", "typeInfo": "object" },
    { "type": "Asset", "name": "itemPrefab", "typeInfo": "asset" }
  ]
}
```

| typeInfo | @Serialize |
|----------|------------|
| `object` | Container, Text, Sprite, GameObject, Spine |
| `component` | Button, Slider, InputField, Animation, 커스텀 |
| `asset` | Prefab |
| `default` | Number, String, Boolean |

`path` = `@RegisterComponent('...')`. 필드 `name`은 prefab JSON camelCase (`m_delay` → `delay`).

enum: `components.meta/custom/enum/{Name}.json` — `{ key, value }[]`. 기존 PopupKey를 깨지 않는다.
`src/network/`의 `.ignorescancomponent` 폴더에 게임 컴포넌트를 두지 않는다.
