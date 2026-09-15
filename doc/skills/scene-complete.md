# 씬 데이터 완료

SceneMaker에서 게임이 **보이게** 끝난 상태인지 확인한다. 페이즈 번호 없이 지금 있는 레이아웃·이미지만으로 본다. 트리 원칙은 [scene-structure.md](scene-structure.md).

## 씬 / 에셋

- [ ] `intro/scenes/intro.scene` — bundles `common`, `intro` / rootPrefab `intro/prefabs/intro.prefab`
- [ ] `game/scenes/game.scene` — bundles `common`, `game` / rootPrefab `game/prefabs/game.prefab`
- [ ] `intro.prefab` 시스템 트리(SceneManager, GameModule, Sequence, PopupManager) 유지
- [ ] `game.prefab`에 Tutorial / HowToPlay / BetHistory / FreespinStart / FreespinEnd / CommonPopup이 **없음**
- [ ] `game.prefab`에 BG / Main/Contents / HUD / Popup 계층이 있음 (이름은 게임마다 다름. 이미지가 있는 부분만)
- [ ] 이미지가 있는 게임 전용 UI가 씬 노드 또는 아이템 prefab으로 존재. intro 공용 팝업은 intro.prefab 노드를 씀
- [ ] 반복 칸은 아이템 prefab + 호스트. 씬에 Cell0..N이 없음. SceneMaker에서 격자가 비어도 됨
- [ ] 나열은 LayoutGroup / ScrollRect. 자식 `pos.y` 스택이 아님
- [ ] 기획서에 적힌 새 입력 형태를 따름. 없으면 InputField. 이미 있는 UI는 요청 없이 유지
- [ ] 같이 켜지는 HUD 상태가 있으면 상태 자식으로 묶음. 예시 트리(AutoSettings 등)를 다른 게임에 복사하지 않음
- [ ] 스크립트가 `new Container` / `new Sprite`로 UI를 조립하지 않음. SceneMaker에서 연 배치가 곧 게임 UI
- [ ] 이미지가 없는 UI는 노드가 없음 (빈 상자/`white_box` 자리 잡기 없음)
- [ ] 이미지 경로는 `{bundle}/images/{atlas}/파일` (조각 4개)
- [ ] HTML / `DOMElement` / `textType: HTMLText` 없음
- [ ] `npm run build:assets:dev` 후 SceneMaker에서 `game.prefab`을 열면 작업자 레이아웃과 **같은 배치**로 보임. 런타임 clone 격자는 비어 있어도 됨
- [ ] 에셋이 바뀐 뒤 개발 서버를 띄우기 **전**에 `npm run build:assets:dev`를 돌렸다
- [ ] prefab `image`가 작업자가 준 PNG를 복사한 파일임. `screen-*.png`를 오린 조각이 아님
- [ ] 버튼·토글·슬라이더·입력필드 루트는 Container. `Button`/`Toggle`/`Slider`/`InputField`/`State*`는 그 Container에만. 이미지는 하위 Sprite
- [ ] 스케일 연출이 있는 UI(버튼 등)의 `pivot`이 0.5, 0.5

## 연출

- [ ] 팝업·메뉴 등 열기/닫힘이 필요한 노드에 `Animation` clips (0=show, 1=hide)
- [ ] 신규 `.anim` / `.particle`은 스키마를 따르고 SceneMaker에서 재생됨
- [ ] 연출 확인용 `@DevButton`이 있으면 `IS_DEV` 가드
- [ ] 커스텀 연출 컴포넌트는 `components.meta/custom` + prefab `@Serialize` 연결
- [ ] SceneMaker에서 대표 연출(팝업 열기 등)을 재생해 봄

## 아트 투입

1. 작업자가 준 PNG를 kebab-case로 `raw-assets/{bundle}/images/{atlas}/`에 복사한다. 다시 그리지 않는다. `screen-*.png` 레이아웃 원본은 복사하지 않는다
2. prefab `image`를 그 경로에 연결한다. 고정 글자는 스프라이트, 바뀌는 숫자는 Text. 같은 모양은 같은 파일. 배치는 `layout.md` (작업자 레이아웃에서 잰 값)
3. `npm run build:assets:dev`
4. SceneMaker에서 레이아웃과 같은 배치인지 확인한다. 개발 서버로 볼 때도 이 빌드 뒤에 실행한다

작업자가 이후 같은 경로에 고해상도 PNG를 덮어쓸 수 있다. 파일명은 kebab-case.
