# 설치 및 배포 가이드

## 사전 요구사항

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Google 계정 + Firebase 프로젝트

---

## 1단계: Firebase 프로젝트 생성

```bash
# Firebase 로그인
firebase login

# 프로젝트 생성 (Firebase Console에서 직접 생성 권장)
# https://console.firebase.google.com

# 로컬 프로젝트와 연결
firebase use --add
```

`.firebaserc`에서 `YOUR_FIREBASE_PROJECT_ID`를 실제 프로젝트 ID로 교체하세요.

---

## 2단계: Firestore 활성화

Firebase Console → Firestore Database → "데이터베이스 만들기"
모드: **프로덕션 모드** 선택, 리전: `asia-northeast3` (서울)

---

## 3단계: Gemini API 키 등록 (Secret Manager)

```bash
# Google AI Studio에서 키 발급: https://aistudio.google.com/app/apikey
# GEMINI_API_KEY를 Firebase Secret Manager에 저장
firebase functions:secrets:set GEMINI_API_KEY
# 프롬프트에 API 키 입력
```

---

## 4단계: Cloud Functions 로컬 에뮬레이터 테스트

```bash
cd functions
npm install
npm run build

# 에뮬레이터 실행
cd ..
firebase emulators:start --only functions,firestore

# 다른 터미널에서 테스트
curl "http://127.0.0.1:5001/YOUR_PROJECT_ID/asia-northeast3/manualCrawl?date=20260324"
curl -X POST "http://127.0.0.1:5001/YOUR_PROJECT_ID/asia-northeast3/manualSummarize"
```

---

## 5단계: 프론트엔드 환경변수 설정

```bash
cd frontend
cp .env.local.example .env.local
# .env.local에 Firebase 웹 앱 설정값 입력
# Firebase Console → 프로젝트 설정 → 일반 → 내 앱
```

필요한 경우 Tailwind Typography 플러그인 설치:
```bash
npm install
npm install @tailwindcss/typography
```

---

## 6단계: 프론트엔드 로컬 개발

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000 에서 확인
```

---

## 7단계: 전체 배포

```bash
# 프론트엔드 빌드 (정적 파일 생성 → frontend/out/)
cd frontend && npm run build && cd ..

# Firestore 규칙 + 인덱스 배포
firebase deploy --only firestore

# Cloud Functions 배포
firebase deploy --only functions

# Hosting 배포
firebase deploy --only hosting

# 또는 한 번에 전체 배포
firebase deploy
```

---

## 8단계: Cloud Scheduler cron 설정

Cloud Functions에 이미 스케줄이 내장되어 있습니다:

| 함수 | cron | 실행 시각 (KST) | 역할 |
|------|------|----------------|------|
| `scheduledCrawl` | `0 0 * * *` | 매일 오전 9:00 | arXiv 어제 논문 크롤링 |
| `scheduledSummarize` | `30 0 * * *` | 매일 오전 9:30 | Claude API 요약 |

배포 후 Google Cloud Console → Cloud Scheduler에서 자동으로 생성됩니다.

**즉시 실행(테스트):**
```bash
# HTTP 트리거로 수동 실행
curl "https://asia-northeast3-YOUR_PROJECT_ID.cloudfunctions.net/manualCrawl"
curl -X POST "https://asia-northeast3-YOUR_PROJECT_ID.cloudfunctions.net/manualSummarize"
```

---

## 프로젝트 구조

```
.
├── firebase.json          # Firebase 호스팅/함수 설정
├── firestore.rules        # Firestore 보안 규칙
├── firestore.indexes.json # Firestore 복합 인덱스
├── functions/
│   └── src/
│       ├── index.ts       # 함수 진입점 + 스케줄러
│       ├── admin.ts       # Firebase Admin 초기화
│       ├── crawl.ts       # arXiv 크롤러 (cs.GR, cs.SD)
│       ├── summarize.ts   # Claude API 요약기
│       └── types.ts       # 공유 타입
└── frontend/
    ├── app/
    │   ├── layout.tsx     # 레이아웃
    │   └── page.tsx       # 메인 페이지 (실시간 Firestore 구독)
    ├── components/
    │   ├── PaperCard.tsx  # 논문 카드 컴포넌트
    │   └── CategoryFilter.tsx
    └── lib/
        ├── firebase.ts    # Firebase 클라이언트 초기화
        └── types.ts       # 프론트엔드 타입
```

## Firestore 스키마

```
papers/{paperId}
  ├── id: string              # arxivId에서 '/'→'_'
  ├── arxivId: string         # "2403.12345"
  ├── title: string
  ├── abstract: string
  ├── authors: string[]
  ├── category: "cs.GR"|"cs.SD"
  ├── publishedDate: string   # ISO 8601
  ├── arxivUrl: string
  ├── pdfUrl: string
  ├── summary: string         # Claude 한국어 요약 (optional)
  ├── applicationSample: string # 적용 사례 + 샘플 코드 (optional)
  ├── status: "raw"|"summarized"|"failed"
  ├── createdAt: Timestamp
  └── updatedAt: Timestamp
```
