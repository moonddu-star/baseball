# 로컬 서버

가이드만으로 게임 룰 전체를 구현하지 않는다. 작업자가 필요한 응답 필드·계산을 요청하면 그 범위만 추가한다. 요청에 없는 보드 로직·RTP를 임의로 넣지 않는다. 기획서에 없으면 묻는다.

대부분의 게임은 `REQ_BET` / `RES_BET`만으로 구현한다. 추가 이벤트가 필요하면 **REQ / RES 쌍**을 유지한다.

씬에 베팅 버튼을 넣을 때 클릭→`REQ_BET`까지 같은 작업에서 다룰 수 있다. 한 번에 게임 전체를 설계하지 않는다. 진행은 [workflow.md](workflow.md).

## 활성화

`project.config.ts`:

```typescript
useLocalServer: true  // IS_DEV && true 이면 apiUrl을 비우고 LocalServer 사용
```

`Sequence.connect()`가 `IS_DEV && project.useLocalServer`일 때 `apiUrl = ''` → Adapter가 LocalServer를 만든다.

## 수정 가능 / 금지

| 허용 | 금지 |
|------|------|
| `src/network/local_server/local_server.ts` | `src/network/socket.ts` |
| `src/network/local_server/` 신규 파일 (generator, config.json) | Adapter의 로그인/AllState 시스템 스위치 본문 |
| `src/network/types.ts` — 게임 Payload 확장 | envelope unwrap / 접속 수명주기 |
| `project.config.ts` (`useLocalServer`, `gameId`, `apiUrl`) | |

필요하면 `ServerAdapter.createLocalServer()`만 오버라이드해 게임용 서브클래스를 주입한다. Adapter 내부를 뜯지 않는다.

## 파일 구성

`local_server.ts`는 소켓과 같은 겉모습(`connect`, `disconnect`, `emit`, `setEventHandler`)을 유지한다. 게임 룰은 여기 본문에 길게 넣지 않는다.

```
src/network/local_server/
  local_server.ts      # 연결, 로그인/AllState, onGameRequest → dispatch
  round_generator.ts   # 보드/라운드 생성. 커질 때만
  config.json          # 가중치·한도 등. 필요할 때만
```

`handleRequest`에서 시스템 이벤트와 게임을 나눈다. 로그인·AllState·세션 연장은 템플릿 구현을 유지한다.

```typescript
private handleRequest(event: string, data: unknown): void {
    switch (event) {
        case SocketEvent.REQ_LOGIN_TOKEN:
            this.onReqLoginToken(data as Payload.Login.Req);
            break;
        case SocketEvent.REQ_ALL_STATE:
            this.onReqAllState();
            break;
        case SocketEvent.REQ_EXTEND_SESSION:
            break;
        default:
            this.onGameRequest(event, data);
            break;
    }
}
```

- 목 유저 상태(`_balance`, `_usn`)는 LocalServer가 들고 `REQ_BET`마다 갱신한다
- `dispatch`는 `setTimeout(..., 0)`으로 비동기처럼 보낸다. Adapter의 envelope unwrap과 맞추려면 실서버와 같이 `{ result_code, value }`이거나, unwrap이 원본을 통과시키는 형태를 유지한다
- `REQ_FIND_ALL_MY_BET`은 템플릿이 처리하면 중복 구현하지 않는다

## 기본 프로토콜

클라이언트 송신:

```typescript
Sequence.instance.sendMessage(SocketEvent.REQ_BET, {
    amount: betAmount,
    is_auto: isAuto,
    freespin_id: Sequence.isFreespin ? Sequence.loginInfo?.freespin?.id : undefined,
});
```

`Payload.Bet.Req`: `{ amount, is_auto, freespin_id? }`

템플릿 `LocalServer.onGameRequest`는 stub이다. 여기서 `REQ_BET`를 받아 `RES_BET`를 `dispatch`한다.

```typescript
protected onGameRequest(event: string, data: unknown): void {
    if (event === SocketEvent.REQ_BET) {
        this.onReqBet(data as Payload.Bet.Req);
        return;
    }
    console.log(`[LocalServer] unhandled: ${event}`, data);
}

private onReqBet(req: Payload.Bet.Req): void {
    const round = generateRound(); // 게임 룰. 별도 파일로 분리 가능
    this.dispatch(SocketEvent.RES_BET, {
        bet_id: Date.now(),
        amount: req.amount,
        balance: /* 갱신된 잔액 */,
        // Payload.Bet.Res 커스텀 필드
    });
}
```

Adapter는 `{ result_code, value }` envelope에서 `result_code === 0`이면 `value`를 꺼낸다. `dispatch` 형태는 기존 LocalServer의 로그인/AllState 응답과 맞춘다.

## Payload 확장

`src/network/types.ts`의 `Payload.Bet.Res`에 게임 결과를 추가한다 (`// add custom fields` 지점).

예 (GoldFormula 참고 — 필드명은 기획에 맞게):

```typescript
export namespace Payload {
    export namespace Bet {
        export interface Res {
            bet_id: number;
            amount: number;
            balance: number;
            freespin_id?: number;
            round_result: unknown; // 게임 보드/스텝
        }
    }
}
```

클라이언트는 `GameMain.onReceiveEvent(SocketEvent.RES_BET, data)`에서 이 형태를 소비한다. 응답 JSON 스키마를 확정해 두면 클라이언트 연결이 단순해진다.

기획에 있으면 아래 필드도 같이 둔다. 없으면 추측해서 넣지 않는다.

| 필드 | 의미 |
|------|------|
| `balance` | 라운드 정산 후 잔액 |
| `bet_result` | 베팅액 차감 직후 잔액 (연출 중 표시용) |
| `profit` / `cash_out` | 지급액 / 배수 |
| `round_result` | 보드·스텝. 게임마다 다름 |

`RES_ALL_STATE.game_setting.slide`는 베팅액 목록이다. 로컬 `buildAllStateResponse`에도 같은 배열을 넣어 HUD와 맞춘다.

## 추가 이벤트

1. `SocketEvent`에 `REQ_FOO` / `RES_FOO` 추가
2. `Payload` 네임스페이스에 Req/Res 타입 추가
3. LocalServer `onGameRequest` (또는 `handleRequest` 게임 분기)에서 처리
4. 클라이언트는 `onReceiveEvent`에서 수신

시스템 이벤트(`REQ_LOGIN_TOKEN`, `REQ_ALL_STATE`, `REQ_FIND_ALL_MY_BET`)는 템플릿 LocalServer가 이미 처리한다. 중복 구현하지 않는다.

## AllState

베팅 한도, RTP, 슬라이드 등 설정은 `RES_ALL_STATE`의 `game_setting`을 사용한다. 로컬에서도 로그인 후 AllState를 내려주도록 템플릿 구현을 유지하고, 게임 전용 설정만 확장한다.

## 참고 예외

GoldFormula는 `round_generator.ts` + `config.json`으로 보드를 만든다. 생성 로직이 커지면 `local_server/` 아래에 파일을 나누되, 소켓 레이어는 건드리지 않는다.
