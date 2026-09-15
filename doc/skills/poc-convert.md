# 기존 POC → 템플릿 변환

이미 돌아가는 PixiJS(또는 동등한 H5) POC를 `pixibrown_template_blitzcrown` 포크에 옮길 때 이 문서를 따른다. 그린필드 제작은 [workflow.md](workflow.md). HTML 금지·prefab·메시지는 스킬 팩이 이긴다. **조작·수치·배치·에셋**은 GDD와 POC가 이긴다.

이 문서는 **변환에서 반복된 실수**를 막기 위한 것이다. 일반 씬/에셋 규칙은 기존 md를 연다. 트리를 유지보수형으로 짜는 원칙은 [scene-structure.md](scene-structure.md).

## 적용

다음이 모두 해당될 때 쓴다.

- 대상 저장소는 템플릿 포크다
- 출처는 템플릿을 쓰지 않은 POC다 (Prefab 없음, `GameMain` 없음, 종종 HTML/DOM UI)
- 목표는 POC와 **같은 화면·같은 루프**를 템플릿 규칙으로 다시 조립하는 것이다

POC 코드를 폴더째 복사하거나 렌더러를 재작성하지 않는다. PNG·사운드·폰트·레이아웃 숫자·룰만 옮긴다.

## 완료 기준

변환이 맞는지의 1차 기준은 개발 서버 런타임이 아니다.

**SceneMaker에서 게임 prefab을 열었을 때 POC 대기 화면과 같은 배치**여야 한다. **같은 중요도로** 트리는 나누고 묶어 유지보수형으로 짠다. [scene-structure.md](scene-structure.md). POC 좌표를 평평하게 옮긴 씬은 미리보기가 같아도 실패다. 이미 있는 UI를 요청 없이 다른 위젯으로 바꾼 씬도 실패다.

SceneMaker는 `GameMain.initialize()`를 실행하지 않는다. 런타임 `Prefab.clone()`으로 채운 격자·목록은 미리보기에서 비어 보인다. 그건 정상이다. 미리보기용 Cell0..N을 베이크하지 않는다. [scene-complete.md](scene-complete.md)와 같다.

비교할 때는 **같은 방향·같은 논리 해상도**로 본다. POC가 세로 논리 해상도면 SceneMaker Preview도 그 기준으로 본다. 가로 창의 여백은 아래 배경 분리 결과이지, 게임 캔버스가 가로로 늘어난 것이 아니다.

변환 순서:

1. 역할 층으로 나눈다 (여백 BG / 게임 배경 / 본편 / HUD / Popup). 안쪽 이름은 이 게임의 것이다
2. 같이 켜지는 것끼리 묶고, 나열은 LayoutGroup / ScrollRect. **조작은 POC 그대로**
3. 반복 칸은 아이템 prefab + 빈 호스트
4. 남은 앵커에만 좌표

HTML input처럼 형태가 없는 새 입력 → `InputField`. 이미 키패드·칩·전용 피커가 있으면 작업자 요청 없이 바꾸지 않는다.

## 역할 분리

| 출처 | 따르는 것 |
|------|-----------|
| 이 스킬 팩 | Prefab에 UI를 둘 것, `@Serialize`, 메시지 경로, 수정 금지 스크립트, 에셋 경로, HTML 금지, 나누고 묶는 방식 |
| GDD + POC | 룰, 배율, 타이밍, 카피, 레이어 순서, **어떤 조작인지**, 어떤 PNG를 어디에 쓰는지 |
| 작업자 | 기획에 없는 페이로드·정책. 추측하지 않고 묻는다 |

POC의 전역 상태 스토어, `Graphics` fallback, HTML 오버레이, Cheat 패널은 가져오지 않는다. 다른 상용 게임 프로젝트를 열어 베끼지 않는다.

## 배경은 두 장

템플릿 루트의 여백용 `BG [FitToScreen]`과 POC의 **게임 캔버스 배경**은 다른 그림이다. 한 노드에 합치지 않는다.

| 층 | 역할 | FitToScreen | 출처 |
|----|------|-------------|------|
| 루트 여백 배경 | 창이 캔버스보다 클 때 바깥을 가림 | 켠다 (`enableCrop`은 여백용 이미지에만) | POC 페이지/브라우저 배경 |
| 게임 안 배경 | 논리 해상도 **안**에만 보이는 실배경 | **끄고** 게임 Contents 쪽에 둔다 | POC 캔버스 cover / 스테이지 배경 |

하면 안 되는 것:

- 세로 게임 아트를 여백용 `FitToScreen`에 넣고 crop 하기. 가로 Preview에서 잘려 POC와 다른 장면처럼 보인다
- 여백용 가로 이미지를 게임 캔버스 cover로 쓰기
- POC 페이지가 배경 이미지 위에 반투명 그라데이션을 올리는데 이미지만 넣는 것. 원본 PNG는 같아도 화면이 더 밝아 보인다. Sprite `enableGradient`는 multiply다. 검정에 가까운 오버레이는 `(1 - overlayAlpha)`를 위·아래 색으로 곱한다.

webp는 아틀라스에 안 묶일 수 있다. POC webp는 PNG로 변환한 뒤 `raw-assets/game/images/{atlas}/`에 둔다. 변환은 재생성(다시 그리기)이 아니다.

## 반복 칸은 아이템 prefab

개수가 **기획상 고정**이어도(보드, 페이테이블) 칸을 `game.prefab`에 베이크하지 않는다. 원형 prefab + `TileRoot [Grid]` + 런타임 `clone()`. SceneMaker에서 격자가 비어 보이는 것은 정상이다. [scene-structure.md](scene-structure.md).

`Prefab.clone()`은 원형 파일을 전제로 한다. 고정 격자의 인스턴스를 미리보기에 심지 않는다.

## 레이어 순서

POC 레이어(배경 / 플레이 영역 / HUD)를 Contents 자식 순서로 옮긴다. **나중에 나온 자식이 위에 그려진다.**

자주 나는 실수:

- HUD·헤더를 보드/풀스크린 플레이 영역보다 먼저 두면 뒤 레이어가 앞 UI를 덮는다. 항상 보이는 오버레이는 플레이 영역 **앞**
- 입력용 부모를 논리 해상도 전체 `interactive`로 앞에 두면 뒤 레이어 클릭을 먹는다. 히트는 실제 버튼 크기에 맞춘다

## 스프라이트 크기와 구성

`transform.size`를 레이아웃 박스에 맞추기 전에 **PNG 원본 가로·세로**를 잰다.

POC가 `maxWidth`/`maxHeight`로 맞추면 **균등 스케일**이다. 박스를 채우려고 가로세로를 따로 늘리지 않는다.

```
scale = min(maxW / pngW, maxH / pngH, 1)
size  = (pngW * scale, pngH * scale)
```

버튼은 파일 이름이 비슷해도 POC가 **어떤 텍스처를 몇 장 겹쳤는지**를 따른다. 다른 슬롯의 프레임을 같은 버튼에 넣지 않는다.

POC에 없는 원형 배경·프레임을 아이콘에 덧씌우지 않는다. 글리프만 있으면 글리프만 둔다.

캐릭터·소품·로고도 같다. 레이아웃 박스에 우겨 넣어 비율을 깨지 않는다.

## 텍스트와 폰트

“이미지가 없으면 노드를 만들지 않는다”는 **스프라이트 UI** 규칙이다. POC에 있는 라벨은 `Text`(+ 필요하면 `Localize`)로 만든다. `white_box`로 자리를 메우지 말라는 뜻이지, 글자를 빼라는 뜻이 아니다.

POC 전용 폰트(OTF/TTF, 비트맵 폰트)는 `raw-assets/game/fonts/`로 복사하고 prefab `fontFamily`에 그 경로를 넣는다. 템플릿 기본 폰트를 POC 전용 서체 자리에 그대로 두지 않는다.

고정 문구가 PNG에 박혀 있으면 스프라이트를 쓰고, 바뀌는 숫자만 Text다. 이 구분도 POC를 본다.

## 좌표

POC가 캔버스 좌상단 (0,0)이면 PixiBrown Root는 pivot 0.5, 0.5다. 논리 해상도가 `W×H`일 때:

```
pos.x = pocCenterX - W / 2
pos.y = pocCenterY - H / 2
```

POC가 좌상단으로 둔 노드는 먼저 **중심 좌표**로 바꾼 다음 위 식을 쓴다. 레이아웃 기록에 POC 원값과 변환값을 같이 적는다. 레이아웃에 없는 위치는 추측하지 않는다.

같은 레이아웃 숫자라도 **기준점이 함수마다 다르다.** `x, y`를 무조건 좌상단으로 넣지 않는다. POC에서 스프라이트 `anchor` / 컨테이너 원점을 확인한다.

| POC 쪽 | 의미 | 변환 |
|--------|------|------|
| `anchor.set(0.5)` 후 `x, y` | 그 좌표가 **중심** | 중심 상대 `pos` |
| 기본 Sprite (anchor 0) | **좌상단** | 좌상단 → 중심으로 바꾼 뒤 `pos` |
| `anchor.set(1, 0)` 등 | **한쪽 모서리** | 그 모서리를 기준으로 중심을 역산 |

PixiBrown `transform.anchor`는 **부모 크기 오프셋**이다 (`anchor.x * parent.width`). POC 텍스트 `anchor`를 여기에 넣으면 라벨이 화면 밖으로 밀린다. `anchor`는 0.5, 0.5로 둔다.

글자를 가운데 맞출 때는 `align: center`를 쓰고, 기준 박스와 **같은 x**에 둔다. 글자 폭·자간을 계산해 x를 밀지 않는다. 박스 위 캡션은 박스 중앙 상단(같은 x, 박스 위)이다. 왼쪽/오른쪽 정렬도 `align`으로 한다. 자간은 스크립트로 보정하지 않는다.

한 줄에 여러 스탯이 있어도 기준점이 다를 수 있다. 한쪽은 중앙, 다른 쪽은 우측 정렬이면 같은 `y`를 쓰되 `x`·`align`만 다르게 둔다. 부모 컨테이너를 서로 다른 `y`에 두면 캡션 높이가 어긋난다.

스케일 연출이 있는 버튼 pivot은 0.5, 0.5. 버튼·슬라이더·입력필드는 Container 루트에 `Button`/`Slider`/`InputField`/`State*`를 붙이고 이미지는 자식 Sprite다. POC가 텍스처 한 장만 써도 Sprite에 이 컴포넌트를 붙이지 않는다. 새 입력이고 기획에 형태가 없으면 `InputField`. 이미 있는 키패드 등은 요청 없이 바꾸지 않는다. [scene.md](scene.md)

전체 폭 설정 패널을 작은 카드로 줄이지 않는다. POC 제목·섹션 라벨·푸터(BET / 시작 버튼)를 유지한다.

이 절은 **이 Keno POC의 AUTO PLAY 패널**(섹션 나열 + 텍스트 입력)을 옮길 때의 메모다. 다른 게임에 이미 있는 키패드·칩 UI를 이 위젯 조합으로 바꾸지 않는다.

AUTO PLAY처럼 섹션이 많은 패널은 **호출부 비주얼**(fontSize, fill, 텍스처)을 따르되, Y 배열을 씬에 옮기지 않는다. 이 패널의 조작이 토글·슬라이더·텍스트 칸이면 `ScrollRect` + Content `VerticalLayoutGroup` + 해당 쿡북. [scene-structure.md](scene-structure.md).

- 섹션 라벨 fontSize는 함수마다 다를 수 있다. `NUMBER OF ROUNDS`만 34이고 나머지는 `createSectionTitle`의 30이다. 전부 34로 맞추지 않는다
- 구분선은 섹션 사이 레이아웃 자식이다. POC Y 배열(`[126, afterRounds(402, 800, 1068)]`)을 좌표로 넣지 않는다
- `afterRounds(1166)` 선은 ADVANCED OPTIONS 버튼 한가운데다. POC는 구분선을 먼저 그려 버튼이 가린다. 이 선은 빼 둔다
- 구분선은 Graphics/`white-dot`이 아니라 `game/images/ui/line.png`(10×2 흰 선)를 폭에 맞게 늘리고 POC 색을 틴트한다. 폭은 `followParentSizeX`
- 푸터 금액(`createSummaryValue`) fill은 `0xffffff`다. 라벨이 금색이라고 금액까지 금색으로 바꾸지 않는다. 푸터는 스크롤 **밖**
- START AUTO BET는 POC가 `button.png`를 못 찾으면 `paytable-cell-active` + AUTO_SLICE(15)를 쓴다. `btn-bonus`(리벳 나무판)를 넣지 않는다. 선택 글자 fill은 `0xffd200`
- Advanced 본문은 Preview에서 닫혀 보여야 한다. `Toggle`이 패널 `active`를 연다. 목록은 `enable: true`로 두고 `awake()`에서 `active = false`로 닫는다

## 닫힘 / 펼침 두 상태

왼쪽 하단 메뉴는 POC `createMenuPanel`이다. 아이콘은 **뒤로가기 / 기록 / 도움말 / 사운드** 네 개다. 넓은 카드에 기록·도움말·사운드만 두지 않는다. 아이콘 표시 크기는 PNG 원본(111)이다. 메뉴가 열리면 원형 버튼의 햄버거를 숨기고 X를 보여 준다.

트리는 작은 패널만 두지 않는다. 전체화면 `Collider` + 안쪽 `VerticalLayoutGroup`. 음소거는 `Toggle`. [scene-structure.md](scene-structure.md).

콤보·메뉴처럼 상태가 둘이면 **닫힌 헤더**와 **펼친 목록**을 따로 맞춘다. 헤더 높이를 목록까지 포함한 박스로 키우거나, 헤더 텍스처를 목록 행에 재사용하지 않는다.

- 닫힘: 헤더 높이·POC와 같은 라벨 정렬·개폐 표시
- 펼침: 헤더 아래에 POC `gap`만큼 띄운 행. 행은 헤더와 **다른** 스프라이트일 수 있다. 선택 행만 마커
- 비교용 스크린샷이 펼친 모습이어도 Preview는 닫혀 있어야 한다
- 목록을 prefab에서 `enable: false`로 두면 `@Serialize`가 비고, 버튼을 눌러도 펼쳐지지 않는다. 목록은 `enable: true`로 두고 `awake()`에서 `active = false`로 닫는다
- 개폐 표시가 POC `Graphics` 다각형이면 꼭짓점 박스(가로·세로)를 따른다. 유니코드 기호는 그 박스가 차도록 fontSize를 맞춘다. 작은 fontSize로 넣으면 실제 삼각형보다 작다

## 표시 크기는 호출부를 본다

PNG 원본 크기 ≠ 화면에 그린 크기. POC가 표시 픽셀을 **명시**하면 그 값을 쓴다. 원본 PNG 크기를 그대로 넣으면 아이콘이 커지거나 작아진다.

색·fontSize는 POC `style.fill` / `fontSize`를 그대로 옮긴다. 역할(“금액이니까 금색”)로 추측하지 않는다. hex는 `0xRRGGBB` 리터럴로 두고 십진수로 손으로 바꾸지 않는다. 캡션·값·게이지·셀 숫자까지 POC `fill`을 한 번에 대조한다.

## Graphics HUD

POC가 `Graphics`로 그린 것이 **플레이스홀더**면 옮기지 않는다. `white_box`로 재현하지 않는다.

POC가 `Graphics`로 그린 것이 **실제 HUD**(진행 바, 트랙, 칸 뒤 슬롯 등)면 빼지 않는다. 무늬 있는 게임 PNG를 빌려 쓰지 않는다. 가로 구분선은 `game/images/ui/line.png`에 POC 색을 곱한다. 그 외 단색 막대는 템플릿의 틴트용 점 스프라이트(`common/images/common/white-dot.png`)에 POC 색을 곱한다. 소스가 원형이면 9-slice가 대상 높이의 절반 이상일 때 불투명 가운데가 사라지고 색이 연해 보인다. slice는 가운데가 남도록 잡는다. `white_box`는 쓰지 않는다.

칸 뒤에 깔린 슬롯은 칸 노드 자식이 아니다. 칸이 줄어들 때 슬롯이 보여야 하면 칸과 형제로, 더 아래 레이어에 둔다.

## 회전

PixiJS `rotation`은 라디안, PixiBrown `transform.rotation`은 도다. POC 라디안 값을 그대로 넣으면 거의 안 돌아간다.

```
degrees = radians * 180 / Math.PI
```

좌우 대칭 소품도 각각 POC의 대기 각도를 도로 바꾼다. 부호만 맞추고 단위를 섞지 않는다.

## 에셋 복사

- 원본은 POC `raw-assets` / 아틀라스 PNG만. `public/assets` 해시 파일은 소스가 아니다
- kebab-case로 `raw-assets/game/images/{atlas}/`에 복사. 아틀라스는 용도별로 나눈다
- 사운드는 `game/sounds/`, 파일명 `sfx-` / `bgm-`
- 에셋이 바뀌면 실행 전에 `npm run build:assets:dev`
- `game.prefab`은 SceneMaker가 원본이다. `_gen-prefabs.mjs`는 기본으로 `game.prefab`을 쓰지 않는다. 작업자 수정을 덮어쓰지 않는다. 정말 다시 쓸 때만 `node tools/_gen-prefabs.mjs --write-game`

첫 시작 튜토리얼(AIM! SHOOT! WIN! 4행)은 intro 공용 `Tutorial`이 아니다. `game.prefab` `/Popup/TutorialPopup`에 게임 전용으로 둔다. 노드 이름은 `TutorialPopup`, 컴포넌트는 `Game/Keno/KenoTutorialPopup`이다. intro `Game/TutorialPopup`과 이름을 섞지 않는다.

Cash Out / One More Shot 카드는 화면 가운데가 아니다. POC `CASHOUT_POPUP.y`는 패널 **좌상단** 1150이다. 높이 680이면 중심은 1490 → prefab `pos (0, 530)`. `1150 - 960 = 190`으로 두면 보드 한가운데에 뜬다. 위쪽은 적중 수+별+금액, 버튼 글자는 `CASH OUT`이다.

Free Rounds HUD는 PLAY 자리의 뱃지만이 아니다. POC `LAYOUT.FREE_ROUNDS_HUD`를 그대로 둔다. 뱃지 크기는 Normal PLAY와 같다(264×270). HUD의 260은 쓰지 않는다. 위 `FREE ROUNDS` 플레이트(240×55, `paytable-cell` slice 10), 뱃지 안 9/구분선/10, 오른쪽 아래 총당첨 박스(95×60, slice 15). 타이틀은 뱃지보다 위에 그린다. Preview 대기는 PLAY이므로 `FreeRounds`는 `enable: false`다.

## 코드 매핑

POC 루프는 `src/game/**`의 GameMain 서브클래스와 UI 컴포넌트로 다시 짠다. 허용·금지 파일은 [client.md](client.md).

- 클릭 → 해당 UI 컴포넌트 콜백 → Main → `Sequence.sendMessage`. Adapter/socket을 UI에서 부르지 않는다
- 노드 참조는 `findByName`이 아니라 `@Serialize`
- POC가 스크립트로 UI를 그렸어도 템플릿에서는 prefab/씬으로 옮긴다. 스크립트 레이아웃은 가져오지 않는다. 규칙은 [pattern-prefab.md](pattern-prefab.md)
- 요청 payload는 POC 필드명을 `types.ts`에 맞추되, 실서버 이름이 다르면 작업자에게 확인한다. 없는 필드를 만들지 않는다
- 로컬 서버 수치(배당, 보너스 규칙)는 GDD/POC와 같게. 임의 RTP를 넣지 않는다

순환 import가 나면 GameMain 타입을 UI에서 직접 가져오지 않는다. 그 UI가 부르는 메서드만 받는 인터페이스를 둔다.

## 가져오지 말 것

- HTML / `DOMElement` / CSS 오버레이
- POC처럼 런타임에 노드를 만들고 좌표를 박아 UI를 짜는 코드. 같은 화면은 prefab/씬으로 다시 조립한다
- POC 좌표를 평평한 트리로 옮기기. 나누고 묶어 재조립한다 ([scene-structure.md](scene-structure.md))
- 이미 있는 UI를 작업자 요청 없이 `InputField` / `Slider` / `ToggleGroup`으로 교체하기
- Cheat·디버그 패널 (요청 없는 한)
- intro 공용 팝업을 게임 prefab에 복제
- 템플릿 `GameMain.ts` / GameModule / SceneManager / socket / main·preview 수정
- `intro.prefab` 시스템 트리 변경
- POC `Graphics`로 그린 플레이스홀더를 `white_box`로 재현

## 변환 체크

- [ ] 여백 `BG [FitToScreen]`과 논리 해상도 게임 배경이 **다른 이미지·다른 노드**
- [ ] 반복 칸은 아이템 prefab + 호스트. 씬에 Cell0..N이 없음. SceneMaker 격자가 비어도 됨
- [ ] 나열은 LayoutGroup / ScrollRect. POC Y 스택이 아님
- [ ] 이미 있는 UI는 요청 없이 유지. 새 입력은 기획서 형태, 없으면 InputField
- [ ] 같이 켜지는 HUD 상태가 있으면 상태 자식으로 묶음. 이 게임의 BottomUI 트리를 복사하지 않음
- [ ] Contents 자식 순서가 POC 레이어와 같음 (오버레이가 플레이 영역 앞)
- [ ] 스프라이트 `size`가 PNG 비율을 유지. POC와 다른 텍스처를 같은 슬롯에 넣지 않음
- [ ] POC 라벨은 Text로 있음. 게임 폰트가 연결되어 있음
- [ ] 좌표가 중심 상대. 레이아웃 기록에 POC 값이 있음
- [ ] SceneMaker 미리보기를 POC와 **같은 방향**으로 비교함
- [ ] POC `x,y`의 앵커(중심/좌상단/우측)를 확인함
- [ ] 아이콘 표시 크기가 POC 호출부(원본 PNG가 아님)와 같음
- [ ] 콤보·메뉴는 Preview에서 닫혀 보임. 목록은 enable true, `awake()`에서 닫음
- [ ] 한 줄 텍스트는 `anchor`가 아니라 `pivot`으로 POC 앵커를 옮김 (`anchor`는 0.5 유지)
- [ ] 텍스트 fill·fontSize가 POC `style`과 같음. hex는 리터럴로 둠
- [ ] 같은 줄의 스탯은 같은 기준 `y`, 정렬만 POC 앵커를 따름
- [ ] 실제 HUD Graphics는 틴트/Progress로 있음. 다른 UI PNG를 빌려 쓰지 않음
- [ ] Pixi `rotation`(라디안)을 도으로 바꿨음
- [ ] `npm run build:assets:dev` 후 prefab을 다시 연 상태임
