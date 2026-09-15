# STRIKE ZONE · Stadium Live

야구 타격존으로 표현한 Mines POC v12.2입니다. **현재는 HTML·JavaScript POC**이며, `doc/skills`가 전제하는 PixiBrown/SceneMaker 템플릿으로의 이식은 아직 진행하지 않았습니다.

## 실행

Node.js에서 외부 패키지 설치 없이 실행합니다.

```powershell
cd C:\Work\Baseball
npm start
```

[로컬 데모](http://127.0.0.1:4173/) · 기존 `node server.cjs` 명령도 동작합니다. 시작 시 원본을 자동 빌드합니다. 서버가 이미 켜져 있으면 `npm run build` 후 브라우저를 새로고침하세요.

오프라인 실행은 `npm run build` 후 `dist/index.html`을 여세요. `poc/index.html`은 빌드 입력이므로 직접 열지 않습니다.

## 어디를 수정하나요?

| 작업 | 원본 위치 |
|---|---|
| 게임 진행·연출 순서 | `poc/src/game/game-main.js` |
| 보드·HUD·컨트롤·결과 팝업 | `poc/src/game/ui/` |
| 투수·공·배트 연출 | `poc/src/game/fx/` |
| 사운드 | `poc/src/game/audio/game-audio.js` |
| 룰·배당·정산 | `poc/src/domain/mines-engine.js` |
| 화면 골격·스타일 | `poc/index.html`, `poc/styles/game.css` |
| 현재 POC 이미지 | `poc/assets/images/` |
| 받은 제작 원본 | `source-assets/` |

**`dist/`는 빌드 산출물입니다. 원본은 `poc/`에서 수정하세요.** 기존 가상 크레딧 규칙, 0.2초 상승 스윙과 배트 잔상·페이드 제거 동작을 유지했습니다.

```powershell
npm run build  # dist 재생성
npm run check  # 원본/산출물 일치 및 문법 확인
npm test       # 룰·정산·서버 회귀 검사
```

`npm start`/`npm run dev`는 자동 빌드 후 정적 서버를 실행합니다. 파일 감시는 하지 않습니다. PixiBrown 전용 에셋 빌드는 템플릿 이식 후 해당 프로젝트에서 수행합니다.

## 개발 문서

- [현재 폴더 구조·코드 의존성·에셋 관리](doc/project-structure.md)
- [PixiBrown 목표 구조·씬 계층·이식 조건](doc/pixibrown-migration.md)
- [제공받은 개발 스킬](doc/skills/SKILL.md)
- [공통 디자인 가이드](doc/00_공통가이드_인덱스.md)
- [v12.2까지의 상세 작업 기록](doc/history/poc-v12-2.md)
- [외부 라이브러리와 모델 출처](THIRD-PARTY.md)

화면은 1080×1920 세로 구도, 기본 브라우저 표시 540×960 CSS px를 기준으로 합니다. 가상 크레딧 POC이므로 새로고침하면 라운드와 크레딧이 초기화됩니다.
