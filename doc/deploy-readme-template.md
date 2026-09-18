# CLUTCH HIT 회사 테스트 배포

## 서버에 올리기

1. ZIP을 압축 해제합니다. 최상위에 index.html, app.js, styles.css, assets/, vendor/가 있습니다.
2. 압축 해제한 내용을 회사 정적 웹서버의 테스트 경로에 그대로 업로드합니다.
3. https://테스트서버/baseball/ 처럼 폴더 URL 끝에 /를 붙여 접속합니다. 웹서버 기본 문서는 index.html로 지정합니다.

루트 경로와 하위 폴더 모두 지원합니다. 폴더 구조를 유지하세요. 파일을 하나씩 섞어 올리지 말고 같은 ZIP 전체를 함께 배포하세요. 서버에서 npm 설치, 빌드 또는 Node.js 실행은 필요하지 않습니다. 외부 CDN이나 Google Fonts 접속 없이 포함된 파일만으로 동작합니다.

## 서버 설정

- HTTP/HTTPS 정적 파일 서비스로 실행하세요. index.html 파일을 직접 더블클릭하는 file:// 방식에서는 효과음 로딩이 제한될 수 있습니다.
- MIME: .html text/html, .js text/javascript, .css text/css, .png image/png, .mp3 audio/mpeg, .ttf font/ttf.
- 테스트 업데이트 후 이전 파일이 보이면 브라우저/서버 캐시를 갱신하세요. 테스트 중 index.html은 Cache-Control: no-cache 설정을 권장합니다.
- 별도 API, 데이터베이스, SPA 라우팅 설정은 필요하지 않습니다.
- 회사 서버가 엄격한 CSP를 적용한다면 동일 출처의 스크립트·스타일·이미지·폰트·음원과 인라인 SVG 조명 필터 및 게임이 갱신하는 스타일 속성이 차단되지 않는지 확인하세요. favicon은 data: SVG를 사용합니다.

## 난이도 및 투수

- Tiger Mines RTP Ver 1 (98%) 확률표 적용. Easy / Medium / Hard 투수 비교 선택창, 라운드 중 변경 잠금.
- 1B ×1.05, 2B ×1.20, 3B ×1.50, HR ×5.00 누적 곱연산. 첫 선택과 이후 선택의 확률표 구분.
- ×10,000 초과 또는 25칸 성공 시 누적 배율 전체 자동 캐시아웃.
- Easy 흰색·남색, Medium 회색·붉은색, Hard 전체 레드 유니폼의 서로 다른 투수와 4개 투구 자세.
- DIFFICULTY에서 세 투수와 성공 확률·결과별 배율/확률을 비교합니다. FIRST PITCH / LATER PITCHES 확률표를 구분하며 카드 선택 즉시 투수가 반영됩니다.
- HOW TO PLAY에서도 현재 난이도의 상세 확률을 확인할 수 있습니다.

## 최신 타구 연출

- Single: 투수 정면을 피해 좌우로 살짝 뜨며 빠르게 뻗는 500ms 타구.
- Double / Triple: 출발 지연 없이 420ms 동안 높은 좌우 방향으로 쭉 뻗어 화면 위로 이탈. 중간 페이드 없음.
- Home Run!: Double / Triple과 같은 420ms의 높은 좌우 방향으로 화면 위로 이탈.
- 배트 스윙 300ms, 출현 확률과 배당은 유지.

## 최신 UI 및 그래픽 변경

- 첫 접속·새로고침 시 간단한 규칙 안내와 실제 준비 진행률을 표시하는 로딩 화면. 약 2.5초 이상 안내 후 준비가 완료되면 시작 화면으로 자동 진입. 필수 파일 로딩 실패 시 TRY AGAIN 제공.

- 화면 너비 541px 이상에서는 중앙 게임 뒤에 생성한 야간 야구장 배경을 표시. WebP로 최적화하며, 좁은 모바일 화면은 기존 구성을 유지.

- CLUTCH HIT 타이틀, 상단 좌우 정보의 기준선 정렬 및 확대된 배수 숫자.
- 우측 상단은 HIT STREAK의 연속 안타 수를 크게 강조하고 HIT CHANCE는 작은 보조 정보로 표시.
- 성공 시 배수와 CASH OUT 금액이 실제 정산값까지 짧게 올라가는 연출. 시스템 모션 감소 설정에서는 즉시 반영.
- 페이지를 연 뒤 첫 안타에서 KEEP SWINGING OR CASH OUT 안내를 한 번만 표시.
- 실패는 헛스윙 완료 → 세 번째 스트라이크 점등(320ms) → STRIKEOUT! 표시(1200ms) → 결과창 순서.
- 전체 Barlow 폰트: Regular / SemiBold / Bold / ExtraBold를 로컬 파일로 포함.
- YOU’RE AT BAT / 2 STRIKES 표시는 배경 프레임 없이 표시. OUT에서는 3 STRIKES로 전환.
- 첫 시작 안내의 배트는 손잡이를 중심으로 2.8초 주기로 작게 움직임. 시스템 모션 감소 설정에서는 정지.
- 안내와 배트는 페이지 로드마다 처음 한 번 표시. 게임 시작 후 다음 라운드와 RESET에서는 숨기고, 새로고침하면 다시 표시.
- BALANCE는 하단 우측에 표시. 메인 하단 RTP·숨은 존 설명은 제거, HOW TO PLAY 상세 규칙은 유지.
- 모바일 설정 패널 64px 유지. 경기장은 화면 가로폭 기준으로 표시하며 주소창·하단 바 높이 변화로 축소되지 않음. 세로 공간이 부족하면 페이지 스크롤로 하단 설정 접근.
- HOW TO PLAY 및 결과 팝업 닫기 버튼 가독성과 터치 영역 확대.
- 성공 칸은 최초 크기의 70% 야구공 PNG와 1B / 2B / 3B / HR 배지로 구분.
- 배트의 과한 노란빛을 줄인 밝은 베이지색 나무 재질.
- 타격 결과는 SINGLE / DOUBLE / TRIPLE / HOME RUN! 대문자로 표시. 결과 아래 보너스 문구는 표시하지 않음.
- 사용자 교체본: Medium 언더핸드, Hard 몸통 회전 투구폼. 887×444 투명 PNG 원본 유지, 각 손 위치에 맞춰 공 출발점 조정.
- 성공 칸은 그린색으로 표시. 상단 시계 아이콘에서 RECENT PLAYS 히트맵 확인.
- 난이도별 최근 30라운드의 실제 선택 빈도와 1B/2B/3B/HR/OUT 집계. 종료 후 공개되는 미선택 칸은 집계하지 않음.
- 히트맵은 승률 예측이 아닌 과거 선택 기록. 기록은 세션 메모리에만 보관되어 새로고침하면 초기화.

## 포함된 오디오 수정

- Single: hit_single, Double: hit_strong, Triple / Home Run: 기존 hit 음원. 홈런 타격 게인은 최대 설정(2).
- Double / Triple: cheer_normal, Home Run: cheer_strong. 연속 장타는 환호 볼륨을 단계적으로 높이며 Triple은 더 큰 볼륨 적용.
- OUT은 빗맞음 없이 헛스윙으로 표현.

모바일에서 HIT가 약하거나 짧게 들리는 현상에 맞춰 중음역과 잔향을 보강하고 순간 피크를 제한했습니다. PC/터치 에뮬레이션 검증은 완료했으며 실제 안드로이드에서 재확인하세요. 전체 ZIP을 다시 올린 뒤 새로고침해 이전 app.js 캐시가 남지 않도록 합니다.

## 테스트 항목

- 첫 버튼 조작 후 음악 재생. 인트로 15%, 경기 BGM 16%, 마스터 80%.
- ? → GAME SETTINGS → GAME TIME에서 DAY GAME / NIGHT GAME 전환. 새로고침 후 선택 유지.
- 베팅 금액·난이도 설정 → 타격존 선택 → HIT/OUT → CASH OUT/NEXT ROUND.
- 소리 버튼 음소거 및 설정 유지. 모바일 화면 크기와 브라우저 UI 변화에 따른 하단 버튼 표시 확인.

## 테스트 빌드 범위

현재 HTML/JavaScript POC이며 가상 크레딧으로 동작합니다. 회사 계정·실제 정산 서버와의 연동은 포함하지 않습니다. 새로고침하면 라운드/잔액은 초기화되고, 낮·밤 및 음소거 설정만 브라우저에 저장됩니다.

THIRD-PARTY.md 및 assets/fonts/*-license.txt, vendor/*LICENSE.txt에 출처와 라이선스가 포함됩니다. source-assets 및 개발용 .work, .git, 원본 개발 문서는 배포물에 포함하지 않습니다.

패키지: {{PACKAGE_NAME}}
빌드 시각(UTC): {{BUILD_TIME_UTC}}
SHA256SUMS.txt: 각 배포 파일의 SHA-256 체크섬(자기 자신 제외).
