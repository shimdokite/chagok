# 코드 스타일

이 문서는 차곡 저장소의 지속 적용 규칙이다. 루트 `AGENTS.md`에서 매 코드 작업 시작 시 읽도록 연결한다. React Native·Next.js·API·공유 패키지·테스트·스크립트에 적용하며 하위 `AGENTS.md`의 프레임워크 지침도 함께 따른다.

목표는 처음 읽는 사람이 데이터와 실행 흐름을 쉽게 따라가는 코드다. 짧은 코드 자체보다 명확한 이름·책임·의존 관계를 우선한다. 기존 코드 전체를 한 번에 재구성하지 않고, 작업 범위 안에서 적용한다.

## import 묶음 뒤·함수 앞뒤 빈 줄

import 묶음 뒤와 함수를 정의한 문장 또는 멤버 앞·뒤에 인접한 문장/멤버가 있으면 **빈 줄 한 줄**을 둔다. 공백 문자를 채운 줄이 아니라 실제 빈 줄을 사용한다. 이 규칙은 매 작업의 기본값이며 사용자가 다시 요청할 필요가 없다.

- 연속된 import 문끼리는 붙여 두고 마지막 import와 다음 선언·문장을 한 줄 띄운다. 여러 줄 import, `import type`, 부수 효과 import, TypeScript의 `import = require(...)`에도 적용한다. 동적 `import()` 호출은 import 선언이 아니다.
- `export function`, `export default function`, `async function` 앞에도 빈 줄 한 줄을 둔다. export 여부와 관계없이 아래의 함수 정의 대상에 동일하게 적용한다. 선언의 JSDoc·설명 주석이 있다면 주석 앞을 띄우고 주석과 선언은 붙인다.
- `function` 선언, 변수에 대입한 화살표 함수/함수 표현식, 클래스 생성자·메서드·접근자·함수 필드, 객체 메서드·함수 속성에 적용한다. 한 줄 함수도 동일하다.
- `useCallback`, `memo`, `forwardRef`로 감싼 함수 선언도 포함한다. 함수 뒤의 같은 줄 설명 주석은 함수에 붙이고 그 다음에 빈 줄을 둔다. 다음 선언의 JSDoc은 그 선언과 붙여 둔다.
- 파일/블록의 첫 선언 앞, 마지막 선언 뒤나 닫는 중괄호 바로 앞에는 불필요한 빈 줄을 추가하지 않는다. import만 있는 파일 끝에도 빈 줄을 추가하지 않는다. 파일 마지막 개행은 유지한다.
- JSX prop·배열·호출 인자 안의 인라인 콜백에는 억지로 빈 줄을 삽입하지 않는다. `map`, `useEffect`, `it` 호출 자체는 함수 선언이 아니다. 서로 다른 논리 단위 사이의 빈 줄은 별도로 사용할 수 있다.
- 함수 타입·인터페이스 메서드·overload 시그니처 등 구현 본문이 없는 선언에는 이 규칙을 적용하지 않는다.
- 문자열·템플릿 리터럴·JSX 텍스트·주석 내용·생성 파일·외부 코드·과거 증거 자료는 간격 정리를 위해 수정하지 않는다.

```ts
import { createContext } from "react";
import type { SessionController } from "./session";

const Context = createContext<SessionController | null>(null);

export function getSessionContext() {
  return Context;
}

function formatAmount(amount: number) {
  return amount.toLocaleString("ko-KR");
}

const isRejected = (status: ClaimStatus) => status === "REJECTED";

const label = formatAmount(65000);
```

`npm run style:check`가 직접 작성한 `apps/`, `packages/`, `scripts/`의 JS/TS/JSX/TSX를 검사한다. 의존성·생성 디렉터리와 `.d.ts`는 제외한다. `npm test`의 `pretest`에도 연결되어 누락 시 테스트 전에 실패한다. 이 검사는 자동 수정 도구가 아니며, 임의의 사용자 정의 함수 래퍼까지 의미를 추론하지 않는다.

Prettier는 기존 빈 줄을 보존하고 여러 빈 줄을 하나로 줄이지만, 누락된 import 묶음 뒤·함수 앞뒤의 빈 줄을 만들어 주지는 않는다. 기존 Prettier를 사용하되 간격 검사를 함께 실행한다. 이번 규칙을 위해 새로운 포맷 패키지는 설치하지 않는다.

## 단순하고 읽기 쉬운 로직

오랫동안 쓰인 KISS(단순하게), 단일 책임, DRY(같은 업무 규칙의 중복 방지), YAGNI(필요한 것만 구현)를 다음처럼 적용한다. 모든 상황에 동일한 줄 수나 설계 패턴을 강제하는 규칙은 아니다.

1. **의도가 보이는 이름:** `data`, `temp`, `flag`보다 `session`, `availableAmount`, `isExpired`처럼 의미를 드러낸다. 이벤트 핸들러는 `handleSubmit`, 콜백 prop은 `onSubmit`, 실제 Hook은 `useSession`처럼 쓴다. 타입와 컴포넌트는 PascalCase, 함수·변수는 camelCase를 따른다.
2. **한 함수에 한 책임:** 계산·검증·저장·화면 조작이 섞이면 분리를 검토한다. 공유 계산은 순수 함수, 상태나 외부 동기화를 포함하는 React 로직은 의미 있는 custom Hook, 서버 업무 규칙은 서비스에 둔다.
3. **정상 흐름이 잘 보이는 분기:** 오류·빈 값은 guard clause로 먼저 처리한다. 중첩 삼항 연산자를 새로 추가하지 않는다. 복잡한 조건에는 이름을 붙이고, 여러 단계 중첩은 분리를 검토한다. 단순한 이항 조건의 삼항 표현식은 허용한다.
4. **의미 있는 단위로 분리:** 무조건 함수 20줄·파일 200줄 같은 기준을 강제하지 않는다. 두세 번 중첩되어 조건을 기억하기 어렵거나, 서로 다른 변경 이유가 한 함수에 모이면 분리 신호로 본다. 이름만 늘리는 한 줄 래퍼나 과도한 파일 분리는 피한다.
5. **업무 규칙의 중복 방지:** 금액·권한·상태 전이 같은 같은 의미의 규칙은 한 곳에서 관리한다. 우연히 모양이 비슷한 UI 두 곳을 곧바로 범용 추상화로 묶지 않는다.
6. **명시적인 입력과 실패:** `const`를 기본으로 쓰고 변경이 필요할 때만 `let`을 쓴다. `any`, 근거 없는 `!`, 오류를 숨기는 빈 `catch`를 새로 추가하지 않는다. 외부 입력은 경계에서 검증하고 실패 상태·재시도·취소를 구분한다.
7. **왜 그런지 설명하는 주석:** 코드를 한국어로 되풀이하기보다 제약·업무 이유·예외를 적는다. 주석 없이 이해하기 어려운 조건은 먼저 이름과 구조를 개선한다.
8. **동작과 스타일을 구분:** 순서·이름·함수 분리를 바꾸면 동작이 같아 보이더라도 관련 테스트로 확인한다. 기존 복잡한 로직은 별도 변경 계획과 회귀 근거 없이 정리하지 않는다.

## React 컴포넌트 구조

2026-11-17에 React 공식 문서를 확인했다. 공식 문서는 Hook 호출 규칙과 순수성·Effect 사용을 설명하지만, 모든 컴포넌트에 강제되는 내부 선언 순서를 정하지 않는다. 아래 순서는 그 원칙을 적용하기 위한 **이 저장소의 기본 컨벤션**이며 개발자 전체의 통일된 표준이나 인기 순위라는 뜻은 아니다.

파일은 대체로 import → props/type → 모듈 상수·순수 helper → 주 컴포넌트 순서로 구성한다. 모듈에 이미 있는 export 방식과 라우트의 default export 요구를 유지한다. 함수 스타일 통일만을 위해 기존 화살표 함수를 전부 `function`으로 바꾸지 않는다.

컴포넌트 안의 기본 읽기 순서:

1. props 해석과 Hooks: context/router/theme, state/ref, 필요한 데이터 Hook.
2. 기존 props/state에서 계산할 수 있는 파생 값.
3. 사용자 동작을 처리하는 이벤트 핸들러.
4. 외부 시스템과 동기화하는 Effect와 cleanup.
5. 로딩·오류·빈 결과에 대한 조건부 반환.
6. 주 JSX 반환.

이 순서보다 **Hook 호출 규칙과 값의 실제 의존 관계**가 우선한다. `useMemo`·`useCallback`도 Hook이므로 조건부 반환보다 먼저 호출한다. Effect가 필요로 하는 함수·값은 먼저 정의하고, 순서를 맞추려 Hook을 조건문 안으로 옮기지 않는다. 없는 항목을 빈 주석 블록이나 형식적인 Hook으로 채우지 않는다.

```tsx
type CounterProps = { initialCount?: number };

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);
  const label = `선택 ${count}건`;

  function handleIncrement() {
    setCount((current) => current + 1);
  }

  return <Button title={label} onPress={handleIncrement} />;
}
```

예시는 `useState`와 플랫폼에 맞는 `Button`을 import한 상황이다. 필요 없는 Effect·메모이제이션·custom Hook은 만들지 않는다.

- 렌더 중에는 props/state를 변경하거나 API 호출·저장 같은 부수 효과를 실행하지 않는다.
- 파생할 수 있는 값은 별도 state와 Effect로 복제하지 않는다. 버튼 클릭의 결과는 해당 핸들러에서 처리한다.
- Effect는 타이머·구독·외부 시스템 동기화에 사용하고 해제·취소를 짝지어 둔다. 의존성 경고를 피하려 dependency를 임의로 누락하지 않는다.
- 여러 컴포넌트가 공유하거나 독립적인 책임이 있는 상태 로직만 custom Hook으로 분리한다. 짧은 함수마다 `use`를 붙이지 않는다.
- JSX 안의 긴 분기·계산은 의미 있는 값이나 함수로 옮긴다. 독립적으로 이해할 수 있는 UI 단위는 컴포넌트로 분리하되 작은 요소마다 파일을 만들지 않는다.
- `memo`, `useMemo`, `useCallback`은 성능 측정이나 참조 안정성 등 필요 근거가 있을 때 사용한다. 관습적으로 모든 함수에 붙이지 않는다.
- React Native에서는 기존 테마·Safe Area·접근성 방식을 유지한다. Next.js는 서버/클라이언트 경계를 유지하며 클라이언트 기능이 필요할 때만 `use client`를 둔다. RN의 순서를 맞추려고 Server Component에 Hook을 추가하지 않는다.

## 작업 종료 시 확인

- 함수 간격 검사가 통과하는가? 생성 파일·문자열을 건드리지 않았는가?
- 이름만 읽어 역할을 알 수 있고 정상·실패 흐름을 따라갈 수 있는가?
- 중복 state·불필요한 Effect·중첩 조건·성급한 공통화가 추가되지 않았는가?
- 책임 분리로 코드가 쉬워졌는가, 아니면 파일을 오가며 이해해야 할 양만 늘었는가?
- 실제 수정한 동작을 관련 테스트로 검증했고 수동 확인·미검증을 구분했는가?

간격은 자동 검사한다. 위의 의미·책임·복잡도 판단은 작업자의 코드 리뷰로 확인한다. 기존 전체 코드가 이 문서의 의미적 기준에 맞게 리팩터링됐다고 간주하지 않는다.

## 참고한 기준

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html): 명확한 이름·선언·일관성을 참고한다. Google 내부 환경의 제약이나 export·함수 표현 방식 전체를 그대로 복제하지 않는다.
- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks): 일반 Hooks의 최상위 호출과 조건부 반환 전 배치.
- [React Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure): 렌더의 순수성·입력 불변성.
- [React You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect): 파생 값과 이벤트를 Effect로 우회하지 않기.
- [React Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks): 의미 있는 상태 로직의 추출.
- [Prettier Rationale — Empty lines](https://prettier.io/docs/rationale#empty-lines): 기존 빈 줄 보존과 연속 빈 줄 정리.

위 자료는 참고 기준이며, 함수 뒤 빈 줄과 컴포넌트 내부 권장 순서는 이 저장소에서 정한 규칙이다.
