# 엔진 리소스 로드

원본: pixibrown `src/resource/resources.ts` (+ `prefab.ts`, `scene.ts`).
경로·번들·확장자 규칙은 이 코드가 기준이다. JSON 필드 목록은 [engine-schemas.md](engine-schemas.md).

## 엔진이 JSON으로 여는 파일

`Resources.initialize`가 PIXI 로더에 등록하는 확장자:

| 확장자 | 로드 결과 |
|--------|-----------|
| `.prefab` | JSON → `Prefab` 객체 (`setPrefabData`) |
| `.scene` | JSON (`bundles`, `rootPrefab`) |
| `.anim` | JSON (Animation 클립) |
| `.particle` | JSON (`{ particleSettings }`) |

그 외는 PIXI 기본 로더: `.png`/아틀라스, `.ttf`, `.mp3`, Spine `.json`+`.atlas` 등.

이 네 확장자만 “씬 그래프 에셋”이다. `.html` 등은 로드 파이프라인에 없다.

## 경로 규칙 (getAsset)

모든 조회는 다음 순서로 정규화한다.

1. **소문자** (`toLowerCase`)
2. 앞의 `/` 제거
3. `/`로 split. **조각이 2개 미만이면 실패**
4. `pathParts[0]` = **번들명**. `LocalizeSystem.getLocalizedBundleName`으로 치환될 수 있음
5. 번들이 `loadBundle` 되어 있지 않으면 `null`

코드가 기대하는 경로 형태:

```
{bundle}/{folder}/.../{file}
```

예: `game/prefabs/game.prefab`, `common/sounds/sfx-ui-button.mp3`

### 이미지 (아틀라스)

`pathParts[1] === 'images'` **이고** `pathParts.length >= 4` 일 때만 스프라이트시트로 처리한다.

```
{bundle}/images/{atlas-name}/{file}.png
```

텍스처 캐시 키: `{bundle}.{atlas-name}.{file}.png`

- `game/images/ui/btn-bet.png` → `game.ui.btn-bet.png` (정상)
- `game/images/btn-bet.png` → 조각 3개. **아틀라스로 안 열고** 번들 키 조회로 실패한다

prefab의 `image` / particle의 `image`는 이 4단계 경로여야 한다.

### 그 외 에셋

번들 객체의 키: `{bundle}/{images가 아닌 나머지 경로}`

`.prefab`이면 JSON을 `new Prefab(path)`에 넣고 반환. `clone()`은 동기.

## 번들과 매니페스트

- 개발: `{rawPath}manifest.json` (보통 `/raw-assets/manifest.json`)
- 배포: `config.resources.manifestPath` + `basePath`

`loadBundle(name)` 이름이 매니페스트 `bundles[].name`과 같아야 한다. 조회 시 번들명도 소문자.

`getBundleSize` / 진행률은 매니페스트의 `bundle.size`를 쓴다.

씬이 필요로 하는 번들은 `.scene`의 `bundles` 배열. `Scene.loadScene`이 여기 적힌 것만 `loadBundle`한다. **적지 않은 번들의 에셋은 getAsset이 실패**한다.

## 씬 파일 위치

빌드가 모든 `.scene`을 가상 번들 **`scenes`** 로 모은다.

`findSceneAssetPath('intro')` → 매니페스트 alias `scenes/intro.scene`

디스크에서는 `intro/scenes/intro.scene`처럼 번들 안에 두지만, 런타임 조회 키는 `scenes/{파일명}.scene`이다. **파일명은 프로젝트 전체에서 unique**해야 한다 (`intro.scene`, `game.scene`).

로드 순서:

1. `scenes/{name}.scene` JSON
2. `bundles[]` 순차 loadBundle
3. `rootPrefab` 경로로 `getAsset` → `clone()`

## Spine

`PixiSpine.from({ skeleton, atlas })`. 경로는 prefab에서 **소문자로 변환**된다.

언로드 시 캐시 키 형태: `{skeleton}-{atlas}-{scale}`  
예: `game/spines/blocks.json-game/spines/blocks.atlas-1`

`.skel` binary는 이 프로젝트 파이프라인에서 쓰지 않는다.

## localize

`loadLocalizeAsset(alias)`는 localize 번들 전체가 아니라 해당 alias만 로드해 `bundleMap['localize']`에 넣는다. 텍스트 JSON 경로: `localize/common/{lang}.json`, `localize/game/{lang}.json`.

## AI 체크

- 경로를 대문자·PascalCase로 쓰지 않는다. 처음부터 kebab + 소문자
- 이미지는 반드시 `{bundle}/images/{atlas}/파일`
- 씬 `bundles`에 `common`과 해당 씬 번들(`intro` 또는 `game`)을 넣는다
- `getAsset` / `clone` 전에 그 번들이 로드되어 있어야 한다 (씬 bundles 또는 이미 로드된 common)
