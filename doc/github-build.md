# GitHub 빌드와 ZIP 배포

저장소: https://github.com/moonddu-star/baseball

현재 POC 원본은 poc/이며, dist/는 빌드 결과입니다. 원본을 수정하고 빌드합니다.

## 로컬 실행 및 ZIP 생성

Windows, Node.js 24와 기본 Windows PowerShell을 사용합니다. 외부 npm 의존성 설치는 필요 없습니다.

~~~powershell
npm start
npm run release
~~~

- npm start: 빌드 후 http://127.0.0.1:4173/ 서버 실행.
- npm run release: 빌드 → 원본/산출물 검사 → 자동 테스트 → ZIP 생성 → 압축 해제 검증 → ZIP 체크섬 생성.
- 결과: releases/clutch-hit-release-날짜시간-고유값.zip 및 .zip.sha256.
- ZIP 내부 최상위에 index.html이 위치합니다. ZIP에 포함된 DEPLOY-README.md에 정적 서버 업로드 방법이 있습니다.
- poc/build-manifest.json의 파일만 포함하며 THIRD-PARTY.md, DEPLOY-README.md, SHA256SUMS.txt를 추가합니다.
- 개발 파일, source-assets, .git, 오래된 dist 에셋은 ZIP에 넣지 않습니다.
- 새 ZIP은 Git 추적에서 제외합니다. 이미 추적 중이던 과거 ZIP의 이력은 유지합니다.

## GitHub에서 빌드

.github/workflows/build-zip.yml은 소스가 GitHub에 올라간 뒤 push, pull_request, 수동 실행에 반응합니다.

1. 개발자 승인 후 필요한 프로젝트 파일과 워크플로를 커밋하고 origin에 푸시합니다.
2. 저장소의 Actions → Build ZIP and deploy Pages에서 실행 결과를 확인합니다.
3. 성공한 실행의 Artifacts에서 clutch-hit-build-실행번호-재시도번호를 다운로드합니다.
4. 내려받은 아티팩트 묶음을 풀면 실제 배포 ZIP과 ZIP 체크섬 파일이 있습니다. 배포 ZIP 안의 내용을 회사 테스트 서버에 업로드합니다.

GitHub에서도 동일한 npm run release를 사용합니다. Windows 실행 환경과 Node.js 24를 지정했으며, 검증을 통과한 해당 실행의 ZIP만 아티팩트로 보관합니다(30일). 아티팩트의 수동 다운로드 방법은 [GitHub 공식 문서](https://docs.github.com/en/actions/managing-workflow-runs/downloading-workflow-artifacts)를 참고하세요.

## GitHub Pages 웹 배포

게임 주소: https://moonddu-star.github.io/baseball/

저장소 Settings → Pages → Build and deployment → Source를 GitHub Actions로 사용합니다.
master 푸시 또는 master에서 수동 실행하면 검증된 ZIP과 동일한 파일을 Pages에 게시합니다. PR과 다른 브랜치는 빌드/ZIP 검사만 수행합니다.

build 작업은 contents: read 권한으로 검사와 ZIP 생성을 합니다. deploy 작업에만 pages: write, id-token: write를 부여하고 github-pages 환경을 사용합니다. 업로드 대상은 압축 해제 검증을 통과한 폴더이므로 원본 저장소나 오래된 dist 에셋이 섞이지 않습니다.

[GitHub Pages 공식 워크플로 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

GitHub Release 게시 기능은 별도입니다. ZIP은 기존처럼 로컬 releases/와 Actions Artifacts에서 받습니다.

## 배포 내용 관리

- 배포 파일 목록: poc/build-manifest.json
- ZIP 내부 안내문: doc/deploy-readme-template.md
- 원본 출처/라이선스: THIRD-PARTY.md 및 매니페스트에 등록된 라이선스 파일
- 패키징: tools/package-release.ps1, tools/prepare-release.cjs
- 압축 해제 후 검증: tools/verify-release.cjs

검증기는 파일 목록·체크섬·현재 빌드의 바이트 일치를 확인합니다. 실제 모바일 기기의 터치·사운드·브라우저 바 표시 상태는 회사 테스트 서버에서 별도로 확인하세요.

## 현재 연결 상태

origin을 공유받은 저장소 주소로 설정했습니다. 2026-09-18 사용자 승인으로 현재 작업의 커밋·푸시·빌드를 진행합니다. 푸시 후 Actions에서 해당 커밋의 빌드 결과를 확인합니다.
