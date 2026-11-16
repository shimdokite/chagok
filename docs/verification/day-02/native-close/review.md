# iOS 종료 실측 증거 독립 검토

2026-11-16. 기존 종료 코드 reviewer에게 이번 native 로그·파싱/분석·복원 해시·테스트/타입 로그와 증거 범위를 읽기 전용으로 검토하도록 요청했다. 로컬 학습 내용은 검토·인용 범위에서 제외했다.

확인: 웹31/native40이벤트와 원본 행 번호 일치, seq 누락·중복0, mount/close/unmount 각1회, close/unmount 세대2/3 일치. 모든 timer-armed는 같은 revision의 후속 cleared와 짝을 이룸(웹4쌍/native5쌍). 앱/패키지82개 현재/시작/복원 해시 일치. 웹 home diff만으로 홈을 입증하지 않고 사용자 확인과 앞선 도구 관찰을 함께 명시한 범위도 확인했다.

발견과 처리:

1. timer-armed→cleared 수명15.283/10.483ms와 unmount→cleared 간격0.667/0.433ms를 혼동할 수 있는 문구를 발견했다. 두 측정 경계를 명시하고 event-analysis 필드를 추가했다. reset→ready=false→effect 설명은 직접 측정한 원인이 아니라 소스 기반 추론으로 표시했다. reviewer가 문구 수정을 확인했다.
2. log stream 종료 때 원본 끝에 줄바꿈이 추가돼 parsed-events의 원본 SHA-256이 달라졌다. 실제71이벤트/행 번호는 동일했다. reviewer 최종 응답은 이 불일치를 남은 수정으로 표시했으며, 부모 작업자가 원본은 보존한 채 최종 bytes로 해시를 갱신하고 모든 파싱 객체/행 번호 일치를 assertion으로 확인했다. 최종 [문서 검사](document-check.json)에서도 원본 해시를 다시 대조한다. 이 정정은 독립 재리뷰가 아닌 부모의 최종 검사다.

원본 종료 횟수·순서·세대 판정에 대한 추가 불일치는 발견되지 않았다. 물리 기기·Release·임의 native callback 순서/React 동시성 전체와 과거 타임아웃 최종 분기는 판정 범위 밖이다. PR 진행 승인은 아니다.
