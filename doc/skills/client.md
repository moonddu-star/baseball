# 클라이언트 로직

만든 씬과 연출을 `GameMain` 서브클래스에 연결한다. 연결 범위는 지금 올리는 UI에 필요한 만큼이다. 요청하지 않은 보드·발사체·오토플레이 전체를 한 번에 짜지 않는다. 진행은 [workflow.md](workflow.md).

## 수정 금지 / 허용

템플릿에서 기본 제공되는 스크립트는 변경하지 않는다. **로컬 서버 구현 파일은 제외.**

### 수정 금지

| 경로 | 이유 |
|------|------|
| `src/common/GameMain.ts` | 상속만. 본체를 고치지 않음 |
| `src/common/GameModule.ts` | 이벤트 브리지 |
| `src/common/SceneManager.ts` | 씬 로드 / 페이드 |
| `src/network/socket.ts` | 실서버 Socket.IO |
| `src/main.ts` / `src/preview.ts` | 부트스트랩 |
| `components.meta/builtin/` | 엔진 컴포넌트 |
| `intro.prefab` 시스템 트리 | [scene.md](scene.md)와 동일 |

`adapter.ts` 시스템 핸들러를 뜯지 않는다. LocalServer 교체가 필요하면 `createLocalServer()`만 오버라이드.

### 수정 허용

- `src/network/local_server/**`
- `src/network/types.ts` 게임 Payload
- `project.config.ts`
- 신규 `src/game/**` (GameMain 서브클래스, UI 컴포넌트)
- 팝업 키/콘텐츠 추가 시에만 popup 쪽 확장
- `Sequence.ts`는 에러 팝업 연결 등 프로젝트 특화가 필요할 때만 최소 수정

## 클래스 배치

게임 코드는 `src/game/**`에 기능별로 나눈다. 한 파일에 Main·HUD·보드·팝업을 몰아 넣지 않는다.

한 `.ts` 파일에 `@RegisterComponent`는 **하나**만 둔다. `BottomUI`와 `AutoSettings`처럼 붙는 노드가 다르면 파일을 나눈다. 헬퍼·타입·상수는 등록 컴포넌트가 없는 파일에 둘 수 있다.

```
src/game/
  my-game-main.ts          # GameMain 서브클래스. 조율만
  bottom-ui/
    bottom-ui.ts           # 베팅 HUD, 레이어, 버튼 콜백
  board/                   # 본편 (보드, 심볼 등). 기획에 맞게
  popup/
    prize-popup.ts         # 게임 전용 모달만
src/network/local_server/
  local_server.ts
  round_generator.ts       # 룰이 커질 때만
  config.json
```

GoldFormula의 보드·발사체·번들명(`goldformula`)은 복사하지 않는다. 아래는 **메시지·조율·UI 제어** 방식만 따른다.

## 서버 메시지

시스템 이벤트와 게임 이벤트를 섞어 처리하지 않는다.

```
UI 클릭
  → BottomUI.onClickPlay
  → MyGameMain.requestBet()
  → Sequence.sendMessage(REQ_BET, payload)
  → Adapter.emit → LocalServer/실서버

응답
  Adapter.handleServerEvent
    ├ RES_LOGIN_TOKEN / RES_ALL_STATE / USER_*  → Sequence 전용 콜백
    │     GameModule.onAllState → GameMain.onAllState
    └ 그 외 (RES_BET 등)        → Sequence.onReceiveEvent
          isEnableGameMessage가 true일 때만
          GameModule.onReceiveEvent → GameMain.onReceiveEvent
```

- 로그인·AllState·킥·잔액 푸시·베팅 내역은 Adapter/Sequence가 처리한다. `onReceiveEvent`에서 `RES_LOGIN_TOKEN` / `RES_ALL_STATE`를 받지 않는다.
- 게임 메시지는 `Sequence.isEnableGameMessage === true`일 때만 온다. 씬 로드 중에는 `false`다. AllState 수신 후 `true`.
- UI는 `Adapter`/`socket`을 직접 부르지 않는다. 송신은 `Sequence.sendMessage` 한 곳. 게임에서는 `MyGameMain.requestBet()`처럼 **Main이 감싼 메서드**만 쓴다.
- `onReceiveEvent`는 `switch (event)`로 게임 이벤트만 분기한다.

```typescript
requestBet(betAmount: number, isAuto: boolean): void {
    Sequence.instance.sendMessage(SocketEvent.REQ_BET, {
        amount: betAmount,
        is_auto: isAuto,
        freespin_id: Sequence.isFreespin ? Sequence.loginInfo?.freespin?.id : undefined,
    });
}

onReceiveEvent(event: string, data: unknown): void {
    switch (event) {
        case SocketEvent.RES_BET:
            const bet = data as Payload.Bet.Res;
            this.m_round = this.convertRoundResult(bet); // 서버 JSON → 클라이언트 타입
            this.m_board.roundStart();
            this.m_prizePopup.roundStart();
            this.m_bottomUI.balance = bet.balance;
            break;
    }
}
```

서버 Payload를 HUD/보드가 그대로 파싱하지 않는다. Main에서 클라이언트용 타입으로 바꾼 뒤 자식은 그 타입만 본다.

## GameMain 훅

템플릿 `GameMain` 본체는 수정하지 않는다. 서브클래스에서 필요한 훅만 구현한다.

| 훅 | 누가 부르나 | 할 일 |
|----|-------------|--------|
| `afterDeserialize` | 엔진 | `super.afterDeserialize()` 필수 (`GameModule.gameMain = this`) |
| `initialize` / `awake` | 게임 씬 | 자식 `initialize(this)` |
| `onAllState` | AllState 수신 | 베팅 슬라이드·기본 베팅을 BottomUI에 전달 |
| `onReceiveEvent` | 게임 소켓 이벤트 | `RES_BET` 등 |
| `onFreespinStart` / `onFreespinResult` | Sequence | HUD 레이어를 FreeRound ↔ Normal |
| `onStopAutoplay` | 호스트 `stopAutoplay` | 오토 중지 |
| `onUpdateBalance` | 호스트 `updateBalance` | 잔액 표시 갱신 |

`onAllState` 예:

```typescript
onAllState(data: unknown): void {
    const allState = data as Payload.AllState.Res;
    this.m_bottomUI.setGameSettings(
        allState.game_setting.slide,
        allState.game_setting.default_bet ?? 0,
    );
}
```

## GameMain 상속

```typescript
@RegisterComponent('Game/MyGame/MyGameMain')
export class MyGameMain extends GameMain {
    @Serialize(BottomUI) private m_bottomUI: BottomUI = null as any;
    @Serialize(PrizePopup) private m_prizePopup: PrizePopup = null as any;

    afterDeserialize(): void {
        super.afterDeserialize(); // GameModule.gameMain = this
    }

    awake(): void {
        this.initialize();
    }

    initialize(): void {
        this.m_bottomUI.initialize(this);
        this.m_prizePopup.initialize(this);
    }

    onAllState(data: unknown): void { /* 베팅 한도, 잔액 */ }

    onReceiveEvent(event: string, data: unknown): void {
        if (event === SocketEvent.RES_BET) {
            this.startCoroutine(this.playRound(data));
        }
    }
}
```

- 클래스를 `game.prefab`의 `Main`(또는 지정 루트)에 부착한다
- 씬 이름: `portraitSceneName = "game"` (intro SceneManager). GoldFormula의 `"goldformula"`는 따르지 않음

## @Serialize (필수)

씬 노드와 에셋을 스크립트에서 이름으로 찾지 않는다. `@Serialize` 항목을 추가해 prefab에 저장한 뒤 사용한다.

pixibrown 시리얼라이즈 타입은 원래 이름으로 import 한다. `as`로 바꾸지 않는다.

```typescript
import { Number, Boolean, String } from '@brown/pixibrown';

@Serialize(Number) private m_boardColumn: number = 0;
```

하지 말 것: `import { Number as SerializeNumber }` 후 `@Serialize(SerializeNumber)`.

그 파일에서 `Number.MAX_SAFE_INTEGER`, `String(...)`, `Boolean(...)`처럼 **기본** `Number` / `String` / `Boolean`이 필요하면 pixibrown에서 그 이름을 import 하지 않는다. `@Serialize(Number)`는 기본 생성자를 쓴다.

```typescript
import { Serialize } from '@brown/pixibrown';
// Number 를 pixibrown에서 import 하지 않음

@Serialize(Number) private m_cap: number = Number.MAX_SAFE_INTEGER;
```

`Boolean`, `String`도 같다.

스크립트는 prefab에 있는 노드를 제어한다. `new Sprite()` / `new Container()`로 UI를 만들고 `transform.position`에 레이아웃 상수를 넣어 화면을 짜지 않는다. 복잡한 UI는 별도 prefab으로 저장해 불러오거나 `game.prefab`에 직접 넣는다. prefab 없이 스크립트에서 UI를 배치하는 것은 작업자가 그 방식을 **직접 지시한 특수 상황**에서만 한다. 자세한 규칙은 [pattern-prefab.md](pattern-prefab.md).

```typescript
@Serialize(Container) private m_betLayerNormal: Container = null as any;
@Serialize(Button) private m_btnBetUp: Button = null as any;
@Serialize(Slider) private m_pickCount: Slider = null as any;
@Serialize(InputField) private m_stopOnProfit: InputField = null as any;
@Serialize(Text) private m_betAmount: Text = null as any;
@Serialize(Asset) private m_blockItemPrefab: Prefab = null as any;
@Serialize(Spine) private m_blockObject: Spine = null as any;
```

prefab JSON 필드명은 `m_` 없는 camelCase (`betLayerNormal`). SceneMaker에서 연결한다.

`ContentsPopup` 템플릿 코드의 `findText`는 레거시다. **신규 게임 UI는 사용하지 않는다.**

## UI 컴포넌트 독립성

표시/제어 컴포넌트는 가급적 독립 구조로 둔다.

- 각 컴포넌트는 `@Serialize`로 자기 트리만 안다
- `initialize(gameMain)`으로 Main 참조를 받고, 이후에는 public 메서드·콜백만 쓴다
- 다른 UI를 `parent.parent.find` / `findByName` 하지 않는다
- 소켓 송신·라운드 시작은 Main만 한다. HUD는 `this.m_gameMain.requestBet(...)`만 호출한다
- 조율은 `MyGameMain`만 담당한다. 보드는 팝업을 직접 열지 않고 Main에 알린다 (`onFinishRound` 등)
- Main은 자식 getter로 읽기만 열어 줄 수 있다 (`get bottomUI()`, `get roundData()`). 자식끼리 트리를 건너다니지 않는다

```
MyGameMain
  ├ BottomUI.initialize(main) / onFinishRound() / setGameSettings()
  ├ Board.initialize(main) / roundStart()
  └ PrizePopup.initialize(main) / roundStart()
```

## BottomUI 제어

버튼 `callback`은 **BottomUI 메서드**다. listener는 BottomUI 노드. Main에 `onClickPlay`를 두지 않는다.

권장 상태 (`UIState`). 레이어 Container를 겹쳐 두고 `active`만 바꾼다.

| 상태 | 보이는 레이어 |
|------|----------------|
| Normal | 일반 베팅 |
| SetAuto | 오토 횟수 선택 |
| PlayAuto | 오토 진행 중 |
| FreeRound | 프리스핀 |

```typescript
set currentState(value: UIState) {
    this.m_currentState = value;
    this.m_layerNormal.active = value === UIState.Normal;
    this.m_layerSetAuto.active = value === UIState.SetAuto;
    this.m_layerPlayAuto.active = value === UIState.PlayAuto;
    this.m_layerFreeRound.active = value === UIState.FreeRound;
    this.updateInteractive();
}

onClickPlay(): void {
    this.m_isPlaying = true;
    this.updateInteractive();
    this.m_gameMain.requestBet(this.currentBetAmount, this.currentAutoCount > 0);
}

onFinishRound(): void {
    if (this.currentAutoCount > 0) {
        this.currentAutoCount--;
        if (this.currentAutoCount > 0) {
            this.m_gameMain.requestBet(this.currentBetAmount, true);
            return;
        }
    }
    this.m_isPlaying = false;
    this.currentState = UIState.Normal;
}
```

- `isPlaying`이 true면 베팅 레이어·베팅액 버튼을 잠근다 (`interactive = false`)
- 베팅액 목록은 `onAllState`의 `game_setting.slide`다. 하드코딩하지 않는다
- 잔액 표시는 setter (`balance = n`). 라운드 중 차감/지급 시점은 Main이 정한다
- 메뉴 HowToPlay / BetHistory는 intro 공용 팝업을 연다. `game.prefab`에 복제하지 않는다
- `Sound.global.mute`는 토글 콜백에서만 다룬다

레이어 트리는 [pattern-prefab.md](pattern-prefab.md).

## 이벤트 흐름

```
intro: Intro.start → Sequence.connect → login
     → GameModule.loadGame("game")
     → SceneManager.loadScene
     → RES_ALL_STATE → GameMain.onAllState
     → isEnableGameMessage = true

play: BottomUI.onClickPlay → MyGameMain.requestBet
     → Sequence.sendMessage(REQ_BET)
     → LocalServer/Server → RES_BET
     → Adapter (시스템 이벤트 아님) → Sequence.onReceiveEvent
     → GameMain.onReceiveEvent → 자식 roundStart
     → 보드/연출 끝 → Main.onFinishRound → BottomUI.onFinishRound
```

베팅 중 입력 잠금은 BottomUI `isPlaying`. 호스트 오토 중지·잔액 갱신은 `onStopAutoplay` / `onUpdateBalance`.

## Coroutine

연출을 라운드에 연결한다.

```typescript
private *playRound(data: unknown): Coroutine {
    const res = data as Payload.Bet.Res;
    this.m_bottomUI.setPlaying(true);
    yield* this.m_board.play(res);
    yield* this.m_prizePopup.play(res);
    yield* this.waitForSeconds(this.m_finishDelay);
    this.m_bottomUI.onFinishRound();
}
```

이전 라운드 코루틴은 tag로 `stopCoroutine` 한다.

## 로컬라이즈

정적 라벨: prefab `Localize` 컴포넌트 + 키.  
동적 문구: `LocalizeSystem.getString(key)`.  
게임 카피는 `localize/game/{lang}.json`.

## 체크리스트

- [ ] `MyGameMain extends GameMain` + `@RegisterComponent` + prefab 부착
- [ ] 한 `.ts`에 `@RegisterComponent`가 하나뿐임
- [ ] UI 트리가 prefab/씬에 있음. 스크립트가 레이아웃을 조립하지 않음
- [ ] 모든 노드/에셋 참조가 `@Serialize`
- [ ] pixibrown 시리얼라이즈 타입을 `as`로 바꿔 import 하지 않음. 기본 `Number`/`String`/`Boolean`이 필요하면 그 이름을 pixibrown에서 import 하지 않음
- [ ] UI 컴포넌트가 서로 트리를 탐색하지 않음
- [ ] 버튼 콜백은 BottomUI(해당 UI 컴포넌트). 송신은 Main.requestBet → Sequence.sendMessage
- [ ] `onReceiveEvent`는 게임 이벤트만. 로그인은 여기서 처리하지 않음
- [ ] `REQ_BET` / `RES_BET`만으로 한 라운드가 끝남 (추가 이벤트는 쌍)
- [ ] 템플릿 금지 파일을 수정하지 않음
- [ ] HTML UI 없음
