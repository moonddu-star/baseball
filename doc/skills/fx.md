# 연출

SceneMaker에서 확인·수정 가능한 형태로 만든다. `.anim` / `.particle` / `components.meta` 형식은 [engine-schemas.md](engine-schemas.md). 에셋 경로는 [engine-resources.md](engine-resources.md). 재생·스폰·DevButton은 [pattern-fx.md](pattern-fx.md). 팝업/아이템 prefab은 [pattern-prefab.md](pattern-prefab.md).

템플릿 인프라 스크립트(`SceneManager`, `GameModule`, `socket.ts`, `adapter.ts` 시스템 경로, `GameMain.ts` 본체)는 수정하지 않는다. 연출용 **새** 컴포넌트만 `src/`에 추가한다. 같은 작업에서 그 UI에 필요한 게임 로직이 있으면 [client.md](client.md) / [local-server.md](local-server.md)대로 붙인다.

## 원칙

| 상황 | 수단 |
|------|------|
| 개별 오브젝트 연출 (팝업 열기/닫기, 아이콘 bounce) | `Animation` + `.anim` |
| 여러 연출이 순차/동시에 맞물림 | 새 Component + Coroutine |
| 카운터 텍스트 등 UI 추가 기능 | 새 Component |
| 캐릭터/심볼 리깅 | Spine |
| 컷신 | `VideoOverlay` |
| 로직 없이 연출만 확인 | `@DevButton` + `IS_DEV` |

HTML / `DOMElement`로 연출 UI를 만들지 않는다.

## Animation

노드에 `Animation` 컴포넌트. clip은 SceneMaker에서 편집 가능한 `.anim`.

팝업 기본:

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

- show = index 0, hide = index 1 관례를 유지한다
- 기존 템플릿 파일명이 `popup_show.anim`이면 그 경로를 그대로 쓴다. 신규 파일만 kebab-case
- `autoPlay`는 루프 대기 연출이 아니면 `False`

## Particle

```json
{
  "objectType": "Particle",
  "name": "FxLight",
  "interactive": false,
  "autoPlay": false,
  "particlepath": "game/particles/fx-light.particle"
}
```

텍스처는 `game/images/particle/` 아틀라스에 둔다. SceneMaker에서 `.particle`을 연다.

## Coroutine으로 여러 연출 연결

게임 로직이 타이밍을 칠 수 있다. 연출만 확인할 때는 **연출 전용 컴포넌트**에 시퀀스를 넣고 DevButton으로 재생한다.

```typescript
private *playResult(): Coroutine {
    this.m_popup.play(0); // show
    yield* this.waitForSeconds(0.2);
    yield* this.m_counter.playTo(this.m_target);
    this.m_fx.play();
}
```

- 순차: `yield*` 중첩
- 병렬: `startCoroutine` 여러 개
- 취소: `stopCoroutine("tag")` 후 다시 시작
- `yield* this.waitForSeconds(n)` / `yield` (1프레임)

## 추가 UI 기능 컴포넌트

예: 카운터. Text 노드가 아니라 **부모 Container**에 붙이고 `@Serialize`로 Text를 받는다.

```typescript
@RegisterComponent('Game/AnimatedCounter')
export class AnimatedCounter extends Component {
    @Serialize(Text) private m_text: Text = null as any;
    @Serialize(Number) private m_duration: number = 0.2;
}
```

prefab에 저장한 뒤 SceneMaker에서 필드를 연결한다. `findByName` 금지.

## Spine / Video

- Spine: `@Serialize(Spine)` 후 `setSkin` / 애니메이션 이름 재생. 에셋 규칙은 [assets.md](assets.md)
- Video: builtin `VideoOverlay`. `@DevButton('Play'|'Stop')`로 확인. HTML `<video>` 금지

## 연출 테스트 컴포넌트 (권장)

특정 상황을 재현하는 테스트 컴포넌트를 둘 수 있다.

```typescript
@DevButton('Play Show')
playShow(): void {
    if (!IS_DEV) return;
    this.startCoroutine(this.playResult());
}
```

- Inspector DevButton으로만 노출
- 항상 `IS_DEV` 가드
- 테스트용 숫자/타깃은 `@Serialize` 필드로 prefab에 저장 (GoldFormula `m_testCol` / `Test Launch` 패턴)

## 하지 말 것

- intro.prefab 시스템 트리 변경
- 템플릿 기본 스크립트 수정
- HTML / `DOMElement`로 연출 UI

확인 목록은 [scene-complete.md](scene-complete.md).
