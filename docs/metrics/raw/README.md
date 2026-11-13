# 실측 원본

실제 iOS 시뮬레이터 앱에서 내보낸 원본을 보관합니다.

- `day-01-bridge.json`: 준비 3회 + 본 측정 20회 기준선, 20/20 성공.
- `day-01-bridge-lifecycle.json`: 동일 기준선, close 취소, reload 취소, 재진입 후 20/20 성공의 4개 실험.

Share→Copy→simctl pbpaste로 저장한 JSON이며 원본 값은 편집하지 않았습니다. 첫 파일과 전체 이력 첫 실험은 동일합니다. 테스트 가짜 시계·fixture가 아닙니다. 실제 iPhone 성능으로 간주하지 않습니다.

내보내기 구조는 `apps/mobile/src/metrics/bridge-benchmark.ts`의 `BenchmarkResult`·`Sample`입니다.

- run: experimentId, status(completed/cancelled), reason, requestedCount, warmupCount, intervalMs, timeoutMs, environment, warmups, samples, summary
- sample: experimentId, sessionId, sampleId, requestId, sentAtMonotonicMs, receivedAtMonotonicMs, durationMs, status(success/failure/timeout/cancelled), reason, device, OS, appBuild, webBuildMode, sourceRef, measuredAtKst
- summary: attempts, success, failure, timeout, cancelled, medianMs, minMs, maxMs

각 실험의 warmups와 본 samples는 분리합니다. cancel된 run은 samples가 20보다 작아도 정상적인 **취소 기록**입니다. 전송 전 취소된 요청은 가짜 시도 수로 채우지 않습니다. 지연 타이머 전에 도착해도 실제 경과 시간이 3,000ms를 넘으면 timeout으로 분류합니다.

화면 종료 후 원본은 메모리에 최근 10건만 보관되며 홈 개발 도구에서 공유할 수 있습니다. 앱 종료·개발 Fast Refresh 전에는 공유로 별도 저장하세요. 영구 저장·DB는 1일차 범위가 아닙니다. 이번 원본은 확인된 기기·빌드·웹 모드·소스 해시와 대조했습니다. 다른 환경의 새 측정에서는 EXPO_PUBLIC_BENCHMARK_* 설정을 다시 확정해야 합니다.
