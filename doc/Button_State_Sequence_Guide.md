# 버튼 상태 시퀀스 가이드

> **적용 우선순위:** [doc/skills](skills/SKILL.md)가 최우선이며, 이 디자인 가이드는 그다음이다. 충돌하면 스킬 규칙을 따른다. 현재 Baseball은 템플릿 이식 전 POC이므로, 아래 PixiBrown 경로·테마·장르별 UI는 해당 환경의 예시다. [현재 적용 범위](design-audit.md)를 먼저 확인한다.

## 1. 목적

이 문서는 화면에 실제로 표시되는 버튼명을 기준으로 시퀀스별 버튼 상태를 정의한다.

특정 장르의 규칙이나 결과 계산 방식은 다루지 않는다.

## 2. 버튼명

### 메인 버튼 명칭 적용 원칙

이 문서의 `BET`과 `STOP {진행 횟수}`는 특정 게임에서 반드시 사용해야 하는 고정 문구가 아니라 메인 버튼의 역할을 구분하기 위한 기준 명칭이다.

제작하는 게임의 장르와 UX에 따라 실제 화면 문구는 달라질 수 있다.

| 이 문서의 기준 명칭 | 의미 | 교체 가능한 예시 |
|---|---|---|
| `BET` | 대기 상태에서 라운드를 시작하는 메인 버튼 | `PLAY`, `START`, `SPIN`, `ROLL`, `DEAL` 또는 프로젝트 전용 문구 |
| `STOP {진행 횟수}` | 자동 연속 실행을 중단하는 메인 버튼 | `STOP`, `CANCEL`, `END AUTO` 또는 프로젝트 전용 문구 |

버튼명이 달라져도 상태 전환 관계는 변경하지 않는다.

- 대기 상태의 메인 버튼: NORMAL
- 메인 버튼을 누른 직후와 일반 라운드 진행 중: DIMMED
- 자동 연속 실행 중의 메인 버튼: ACTIVE
- 자동 정지 요청이 접수된 메인 버튼: PENDING
- 모든 실행이 종료된 뒤: 대기 상태의 기본 명칭과 NORMAL 상태로 복원

`{진행 횟수}` 표시는 선택 사항이다. 다른 장르에서 진행 횟수가 필요하지 않다면 정지 문구만 표시해도 된다.

아래 상태표에서 `BET`은 “대기 상태의 메인 실행 버튼”, `STOP {진행 횟수}`는 “자동 연속 실행 중의 메인 정지 버튼”으로 해석한다.

### 메인 화면

| 화면 표시명 | 역할 |
|---|---|
| `BET` | 라운드 시작 |
| `STOP {진행 횟수}` | 자동 연속 실행 중 `BET` 버튼이 전환된 상태 |
| `AUTO` | 자동 실행 설정 화면 열기 |
| `Turbo` | 속도 옵션 ON/OFF |
| `1/2` | 입력 금액을 절반으로 변경 |
| `2×` | 입력 금액을 두 배로 변경 |
| `Max` | 입력 가능한 최대 금액 적용 |

### AUTO 설정 화면

| 화면 표시명 | 역할 |
|---|---|
| `Basic` | 기본 설정 탭 |
| `Advanced` | 상세 설정 탭 |
| `10`, `25`, `50`, `75` | 실행 횟수 선택 |
| `100`, `500`, `1000`, `∞` | 실행 횟수 선택 |
| `Reset` | 조건 초기화 방식 선택 |
| `Increase %` | 조건별 변경 방식 선택 |
| `START AUTOBET` | 자동 연속 실행 시작 |
| `CANCEL` | 설정을 닫고 메인 화면으로 복귀 |

## 3. 상태 정의

### NORMAL

- 정상적으로 누를 수 있는 상태
- 불투명도 100%
- Hover, Pressed와 클릭 사운드 사용

### SELECTED

- 현재 선택되었거나 ON인 상태
- 탭, 실행 횟수, 조건 버튼과 `Turbo`에 사용
- 선택 강조 색상 또는 외곽선 표시
- 입력 가능

### DIMMED

- 현재 누를 수 없는 상태
- 불투명도 50%
- 클릭, 드래그와 키보드 입력 차단
- Hover, Pressed와 클릭 사운드 제거

### ACTIVE

- 자동 연속 실행 중 `BET`이 `STOP {진행 횟수}`로 전환된 상태
- 현재 진행 중임을 나타내는 전용 색상과 회전 아이콘 사용
- 정지 요청을 위해 입력 가능

### PENDING

- `STOP {진행 횟수}`를 눌러 정지 요청이 접수된 상태
- 어두운 전용 색상과 불투명도 50% 사용
- 라벨과 회전 아이콘은 유지
- 추가 클릭과 Hover 차단

### HIDDEN

- 화면에 표시하지 않는 상태
- 렌더링과 입력을 모두 비활성화

## 4. 전체 상태표

| 시퀀스 | `BET` / `STOP {진행 횟수}` | `AUTO` | `Turbo` | `1/2` · `2×` · `Max` | 슬라이더·값 입력 | AUTO 설정 버튼 |
|---|---|---|---|---|---|---|
| 초기 대기 | `BET` NORMAL | NORMAL | OFF=NORMAL, ON=SELECTED | NORMAL | NORMAL | HIDDEN |
| 숫자 입력창 열림 | DIMMED | DIMMED | DIMMED | DIMMED | 선택한 값만 편집 | HIDDEN |
| AUTO 설정 화면 열림 | 배경 입력 차단 | 배경 입력 차단 | 배경 입력 차단 | 팝업 내부 버튼만 NORMAL | 배경 입력 차단 | 현재 선택에 따라 NORMAL/SELECTED |
| 라운드 시작 직후 | `BET` DIMMED | DIMMED | DIMMED | DIMMED | DIMMED | HIDDEN |
| 일반 라운드 진행 중 | `BET` DIMMED | DIMMED | DIMMED | DIMMED | DIMMED | HIDDEN |
| 종료 연출 중 | `BET` DIMMED | DIMMED | DIMMED | DIMMED | DIMMED | HIDDEN |
| 결과 화면 표시 중 | `BET` DIMMED | DIMMED | DIMMED | DIMMED | DIMMED | HIDDEN |
| 일반 대기 복귀 | `BET` NORMAL | NORMAL | OFF=NORMAL, ON=SELECTED | NORMAL | NORMAL | HIDDEN |
| 자동 연속 실행 중 | `STOP {진행 횟수}` ACTIVE | DIMMED | OFF=NORMAL, ON=SELECTED | DIMMED | DIMMED | HIDDEN |
| 자동 정지 요청 접수 | `STOP {진행 횟수}` PENDING | DIMMED | OFF=NORMAL, ON=SELECTED | DIMMED | DIMMED | HIDDEN |
| 자동 연속 실행 완료 | `BET` NORMAL | NORMAL | OFF=NORMAL, ON=SELECTED | NORMAL | NORMAL | HIDDEN |

## 5. 초기 대기

| 버튼명 | 상태 |
|---|---|
| `BET` | NORMAL |
| `AUTO` | NORMAL |
| `Turbo` OFF | NORMAL |
| `Turbo` ON | SELECTED |
| `1/2` | NORMAL |
| `2×` | NORMAL |
| `Max` | NORMAL |
| 슬라이더 및 값 입력 | NORMAL |

`BET`과 `AUTO`는 동시에 NORMAL이지만 기능은 상호 배타적이다.

- `BET`을 누르면 즉시 `AUTO`를 DIMMED 처리한다.
- `AUTO`를 누르면 설정 화면이 열리고 배경의 `BET` 입력을 차단한다.

## 6. `BET`을 누른 직후

중복 실행 방지를 위해 입력 요청이 접수된 프레임부터 다음 상태를 적용한다.

| 버튼명 | 상태 |
|---|---|
| `BET` | DIMMED |
| `AUTO` | DIMMED |
| `Turbo` | DIMMED |
| `1/2` | DIMMED |
| `2×` | DIMMED |
| `Max` | DIMMED |
| 슬라이더 및 값 입력 | DIMMED |

DIMMED 버튼은 alpha만 낮추지 말고 실제 입력도 차단한다.

## 7. 라운드 진행 및 종료 연출

라운드 시작부터 종료 연출이 완전히 끝날 때까지 상태를 유지한다.

| 버튼명 | 상태 |
|---|---|
| `BET` | DIMMED |
| `AUTO` | DIMMED |
| `Turbo` | DIMMED |
| `1/2` | DIMMED |
| `2×` | DIMMED |
| `Max` | DIMMED |
| 슬라이더 및 값 입력 | DIMMED |

결과 화면을 사용자가 먼저 닫더라도 종료 연출이 남아 있다면 버튼을 NORMAL로 복원하지 않는다.

## 8. 일반 대기 복귀

종료 연출이 완전히 끝난 뒤 한 번에 복원한다.

| 버튼명 | 상태 |
|---|---|
| `BET` | NORMAL |
| `AUTO` | NORMAL |
| `Turbo` OFF | NORMAL |
| `Turbo` ON | SELECTED |
| `1/2` | NORMAL |
| `2×` | NORMAL |
| `Max` | NORMAL |
| 슬라이더 및 값 입력 | NORMAL |

`Turbo`의 ON/OFF 값은 라운드가 종료되어도 유지한다.

## 9. `AUTO`를 누른 상태

`AUTO`를 누르면 AUTO 설정 화면이 열린다. 배경 버튼은 보이더라도 입력할 수 없다.

| 버튼명 | 상태 |
|---|---|
| 배경의 `BET` | 입력 차단 |
| 배경의 `AUTO` | 입력 차단 |
| 배경의 `Turbo` | 입력 차단 |
| 배경의 `1/2`, `2×`, `Max` | 입력 차단 |
| `Basic` | 기본 진입 시 SELECTED |
| `Advanced` | 기본 진입 시 NORMAL |
| `START AUTOBET` | NORMAL |
| `CANCEL` | NORMAL |

`Basic`과 `Advanced`는 단일 선택 그룹이다.

- `Basic` 선택: `Basic` SELECTED, `Advanced` NORMAL
- `Advanced` 선택: `Basic` NORMAL, `Advanced` SELECTED

## 10. 실행 횟수 버튼

다음 버튼은 하나만 SELECTED가 될 수 있다.

`10`, `25`, `50`, `75`, `100`, `500`, `1000`, `∞`

| 구분 | 상태 |
|---|---|
| 현재 선택한 횟수 | SELECTED |
| 선택하지 않은 횟수 | NORMAL |
| AUTO 설정 화면이 닫힌 경우 | HIDDEN |

다른 횟수를 누르면 이전 버튼은 NORMAL, 새 버튼은 SELECTED로 같은 프레임에 변경한다.

## 11. `Reset`과 `Increase %`

같은 조건 그룹 안에서 하나만 SELECTED가 될 수 있다.

| 선택값 | `Reset` | `Increase %` |
|---|---|---|
| Reset 선택 | SELECTED | NORMAL |
| Increase 선택 | NORMAL | SELECTED |
| 해당 설정 영역 비활성 | DIMMED | DIMMED |

여러 조건 그룹이 있다면 각 그룹별 선택 상태는 서로 독립적으로 유지한다.

## 12. `START AUTOBET`

`START AUTOBET`을 누르고 입력 검사를 통과하면:

1. AUTO 설정 화면을 닫는다.
2. `BET` 버튼을 `STOP {진행 횟수}`로 변경한다.
3. `STOP {진행 횟수}`를 ACTIVE 상태로 표시한다.
4. `AUTO`를 DIMMED 처리한다.
5. `1/2`, `2×`, `Max`를 DIMMED 처리한다.
6. 슬라이더 및 값 입력을 DIMMED 처리한다.
7. `Turbo`만 현재 값에 따라 NORMAL 또는 SELECTED로 유지한다.

입력 검사에 실패하면:

- AUTO 설정 화면 유지
- `START AUTOBET`은 NORMAL 유지
- 문제가 있는 입력 영역에만 오류 표시

## 13. 자동 연속 실행 중

| 버튼명 | 상태 |
|---|---|
| `STOP {진행 횟수}` | ACTIVE |
| `AUTO` | DIMMED |
| `Turbo` OFF | NORMAL |
| `Turbo` ON | SELECTED |
| `1/2` | DIMMED |
| `2×` | DIMMED |
| `Max` | DIMMED |
| 슬라이더 및 값 입력 | DIMMED |

`STOP {진행 횟수}`에는 진행 중임을 나타내는 회전 아이콘을 표시한다.

자동으로 다음 라운드를 기다리는 짧은 구간에도 위 상태를 유지한다. 이 구간에서 `AUTO`나 입력 버튼을 NORMAL로 보이게 하면 사용자가 조작 가능한 것으로 오해할 수 있다.

## 14. `STOP {진행 횟수}`를 누른 직후

정지 요청이 접수되면 즉시 PENDING 상태로 바꾼다.

| 버튼명 | 상태 |
|---|---|
| `STOP {진행 횟수}` | PENDING |
| `AUTO` | DIMMED |
| `Turbo` OFF | NORMAL |
| `Turbo` ON | SELECTED |
| `1/2` | DIMMED |
| `2×` | DIMMED |
| `Max` | DIMMED |
| 슬라이더 및 값 입력 | DIMMED |

PENDING 상태의 `STOP {진행 횟수}`:

- 라벨 유지
- 회전 아이콘 유지
- 라벨과 아이콘 alpha 50%
- 버튼을 어두운 활성 색상으로 변경
- 추가 클릭 차단
- Hover 제거
- 클릭 사운드 차단

`Turbo`는 정지 요청 후에도 입력 가능 상태를 유지한다.

## 15. 자동 연속 실행 완료

현재 진행 단계가 끝나고 종료 처리가 완료된 뒤 복원한다.

| 버튼명 | 상태 |
|---|---|
| `BET` | NORMAL |
| `AUTO` | NORMAL |
| `Turbo` OFF | NORMAL |
| `Turbo` ON | SELECTED |
| `1/2` | NORMAL |
| `2×` | NORMAL |
| `Max` | NORMAL |
| 슬라이더 및 값 입력 | NORMAL |
| 회전 아이콘 | HIDDEN |

`STOP {진행 횟수}`의 라벨, 색상과 기능을 같은 프레임에서 `BET`으로 복원한다.

## 16. `CANCEL`

AUTO 설정 화면에서 `CANCEL`을 누르면:

- AUTO 설정 화면 닫기
- 메인 화면의 `BET`: NORMAL
- 메인 화면의 `AUTO`: NORMAL
- `Turbo`: 기존 ON/OFF 상태 복원
- `1/2`, `2×`, `Max`: NORMAL
- 슬라이더 및 값 입력: NORMAL

AUTO 설정 화면에서 선택한 값의 저장 여부는 별도 데이터 정책으로 처리하고 버튼 상태 시퀀스와 분리한다.

## 17. 상태 우선순위

상태가 겹치면 다음 순서로 판단한다.

1. HIDDEN
2. PENDING
3. DIMMED
4. ACTIVE
5. SELECTED
6. NORMAL

예외:

- 자동 연속 실행 중 `STOP {진행 횟수}`는 전체 입력 잠금보다 우선하여 ACTIVE가 된다.
- `STOP {진행 횟수}`를 누르면 ACTIVE보다 PENDING이 우선한다.
- `Turbo`는 ON/OFF 선택 상태와 입력 가능 상태를 별도로 관리한다.

## 18. 구현 체크리스트

- 초기 대기 상태에서 `BET`과 `AUTO`가 NORMAL인가?
- `Turbo` ON이 SELECTED로 표시되는가?
- `BET`을 누른 즉시 `BET`, `AUTO`, `Turbo`, `1/2`, `2×`, `Max`가 DIMMED 되는가?
- 진행 중 DIMMED 버튼의 실제 입력도 차단되는가?
- 종료 연출 전 결과 화면을 닫아도 버튼 잠금이 유지되는가?
- `Basic`과 `Advanced` 중 하나만 SELECTED인가?
- `10`, `25`, `50`, `75`, `100`, `500`, `1000`, `∞` 중 하나만 SELECTED인가?
- 같은 그룹의 `Reset`과 `Increase %` 중 하나만 SELECTED인가?
- `START AUTOBET` 이후 `BET`이 `STOP {진행 횟수}`로 바뀌는가?
- 자동 연속 실행 중 `STOP {진행 횟수}`가 ACTIVE인가?
- 자동 연속 실행 중 `AUTO`, `1/2`, `2×`, `Max`와 값 입력이 DIMMED인가?
- 자동 연속 실행 중 `Turbo`만 NORMAL 또는 SELECTED로 유지되는가?
- `STOP {진행 횟수}` 클릭 직후 PENDING으로 바뀌는가?
- PENDING 상태에서 추가 정지 입력과 Hover가 차단되는가?
- 자동 연속 실행 완료 후 라벨, 색상, 아이콘과 입력 상태가 동시에 복원되는가?
- 시각 상태와 실제 입력 가능 상태가 항상 일치하는가?


## Baseball POC 적용

현재 POC에는 AUTO/STOP/프리스핀이 없다. 위 멀티 게임 예시를 추가 기능의 요구사항으로 해석하지 않는다.

| 실제 상태 | 메인 버튼 | 베팅/위험 코스 | 보드 |
|---|---|---|---|
| 대기 | 타석에 들어서기, 활성 | 기존 입력 표시 | 비활성 |
| 시작 후 첫 코스 선택 전 | 코스를 선택하세요, 비활성 | 잠금; 같은 영역에 비교 정보 | 미공개 코스 활성 |
| 투구/타격 중 | 타격 중, 비활성 | 잠금 | 비활성 |
| HIT 후 | 상금 확정, 활성 | 잠금 | 남은 코스 활성 |
| 결과 팝업 | 모달 밖 입력 차단 | 모달 밖 입력 차단 | 모달 밖 입력 차단 |
| 결과 닫기/다음 라운드 준비 | 기존 POC 흐름에 따라 재시작 | 기존 설정 유지 | 결과 또는 대기 표시 |

Mines는 HIT 뒤 계속 타격하거나 상금을 확정할 수 있다. 일반 라운드 내내 CTA를 잠그는 예시 규칙으로 이 선택을 막지 않는다.
