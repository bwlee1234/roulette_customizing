# 운명의 수레바퀴

Marble Roulette를 커스텀한 웹 룰렛입니다. 명단을 입력하고 당첨 인원을 정하면 1등부터 지정한 등수까지 winner로 선정합니다.

## 기능

- 단일 맵: 운명의 수레바퀴
- 명단 입력: 쉼표 또는 줄바꿈 구분
- 중복/가중치 입력: `이름*3`, `이름/2`, `이름/2*3`
- 당첨 인원 지정: 예를 들어 `5` 입력 시 1~5등이 winner
- 섞기, 시작하기, 선택 녹화
- 결과 순위표 더블클릭 시 TSV 복사

## 요구 사항

- Node.js 22 권장
- Yarn Classic 1.22.x

## 개발

```shell
npx yarn@1.22.22 install --frozen-lockfile
npx yarn@1.22.22 dev
```

개발 서버 기본 주소는 `http://localhost:1235`입니다.

## 검증

```shell
npx yarn@1.22.22 typecheck
npx yarn@1.22.22 lint
npx yarn@1.22.22 build
```

## 배포

`yarn build`는 상대 경로(`--public-url ./`)로 빌드하므로 GitHub Pages의 프로젝트 경로, 루트 경로, 커스텀 도메인에서 모두 동작하기 쉽습니다. GitHub Actions는 `main` 브랜치 push 시 `dist` 폴더를 공식 GitHub Pages 배포 아티팩트로 업로드하고 배포합니다.

처음 배포할 때 GitHub 저장소의 `Settings > Pages`에서 Source가 `GitHub Actions`로 설정되어 있어야 합니다.

## 녹화

녹화는 브라우저의 `HTMLCanvasElement.captureStream()`과 `MediaRecorder`를 사용합니다. 지원하지 않는 브라우저에서는 녹화 토글이 비활성화되며 룰렛 자체는 계속 사용할 수 있습니다. 저장 확장자는 브라우저가 실제로 생성한 MIME 타입에 따라 `.mp4` 또는 `.webm`으로 결정됩니다.

## 라이선스

MIT License. Based on [lazygyu/roulette](https://github.com/lazygyu/roulette).
