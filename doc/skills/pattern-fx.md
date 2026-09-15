# 연출 패턴

SceneMaker에서 재생·수정 가능해야 한다. 라운드 결과·네트워크 연결은 [client.md](client.md) / [local-server.md](local-server.md).

파일 형식은 [engine-schemas.md](engine-schemas.md). 팝업/아이템 트리는 [pattern-prefab.md](pattern-prefab.md).

## Animation

노드에 builtin `Animation`. `clips` 배열 순서 = 인덱스.

```typescript
const duration = animation.play(0); // show. 반환값 = 초
yield* this.waitForSeconds(duration);
animation.play(1); // hide
```

- `play` 인자: 인덱스 `number` | 클립 이름 `string` | 배열(순차)
- 반환: 재생 길이(초). 없으면 `0`
- 팝업 관례: `0` show, `1` hide, `autoPlay: false`
- 템플릿 클립 `popup_show.anim` / `popup_hide.anim`이 있으면 경로를 그대로 쓴다

숨김이 끝나면 노드 `active = false`가 필요할 수 있다. hide 클립 끝의 `enableKeys`가 `false`면 트랙이 꺼 준다.

대기 루프 연출만 `autoPlay: true` + `.anim`의 `"loop": true`.

## 팝업 컨트롤러

```typescript
@RegisterComponent('Game/Fx/ModalPopup')
export class ModalPopup extends Component {
    show(): void {
        this.gameObject.active = true;
        this.gameObject.getComponent(Animation)?.play(0);
    }

    hide(): void {
        const anim = this.gameObject.getComponent(Animation);
        if (anim) anim.play(1);
        else this.gameObject.active = false;
    }
}
```

`getComponent(Animation)`은 **자기 노드**에 붙인 클립용. 다른 노드의 Animation은 `@Serialize(Animation)`으로 받는다.

## 여러 클립 시퀀스

```typescript
private *playSequence(): Coroutine {
    const a = this.m_intro.play(0);
    yield* this.waitForSeconds(a);
    this.m_fx.startParticle();
    const b = this.m_idle.play(0);
    yield* this.waitForSeconds(b);
}
```

병렬: `startCoroutine`을 여러 개. 재진입 시 `stopCoroutine("result")` 후 다시 시작.

## Particle

노드 `objectType: Particle` + `particlepath`.

표시:

```typescript
node.active = true; // autoPlay true면 재생
```

컴포넌트 방식 (`ParticleComponent`):

```typescript
particle.startParticle();
particle.stopParticle();    // 남은 입자 수명 유지
particle.destroyParticle(); // 즉시 제거
```

연출만 확인할 때는 노드 `autoPlay` + DevButton으로 `active` 토글이면 충분하다.

## Spine

```typescript
spine.setSkin('plus');
spine.clearTracks();
const entry = spine.play(0, 'block_show', false); // track, animName, loop
// entry.animationEnd 초 후 다음 동작
spine.play(0, 'plus_idle', true);
```

prefab에 `atlasPath` / `skeletonPath` / `currentSkin`. 스킨·애니메이션 이름은 Spine 프로젝트에 있는 문자열만 쓴다.

## 카운터

Text가 아니라 **부모 Container**에 컴포넌트. Text는 `@Serialize(Text)`.

표시 갱신:

```typescript
this.m_counter.onValueChanged.add((v) => {
    this.m_label.text = v.toFixed(2);
});
this.m_counter.setValue(target, true);
```

템플릿/기존 프로젝트에 `AnimatedCounter`가 있으면 새로 만들지 말고 재사용한다.

## Prefab 스폰으로 연출 테스트

보드·리스트를 로직 없이 확인하려면 아이템 prefab + DevButton.

```typescript
@DevButton('Spawn Test')
spawnTest(): void {
    if (!IS_DEV) return;
    const node = this.m_itemPrefab.clone();
    this.m_itemRoot.addChild(node);
}

@DevButton('Play Show')
playShow(): void {
    if (!IS_DEV) return;
    this.startCoroutine(this.playSequence());
}
```

테스트용 좌표·타입은 `@Serialize(Number)`로 prefab에 저장한다.

## Video

builtin `VideoOverlay`. `@DevButton('Play'|'Stop')`. HTML `<video>` / `DOMElement` 금지.

## 하지 말 것

- intro 시스템 트리 변경
- `SceneManager`, `GameModule`, `socket.ts` 수정
- HTML로 연출 UI
