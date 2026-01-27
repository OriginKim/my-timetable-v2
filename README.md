# 📅 상명대학교 시간표 시뮬레이터 (SMU Timetable Builder)

## 🌐 서비스 바로가기

**신규 주소**: [https://smu-timetable.vercel.app/](https://smu-timetable.vercel.app/)

**기존 주소**: [https://my-timetable-v2.vercel.app/](https://my-timetable-v2.vercel.app/) (접속 시 자동 리다이렉트)

---

## 1. 프로젝트 배경 및 목적 (Overview)

### 배경
매 학기 학교 공지사항으로 올라오는 강의 시간표 PDF가 에브리타임 등 외부 서비스에 등록되기까지 약 3~4일의 시간이 소요됩니다.

### 문제 의식
학생들은 수강 신청 전 가장 먼저 시간표를 확인하고 싶어 하지만, PDF 파일은 검색과 필터링이 불편하여 조합을 짜는 데 한계가 있습니다.

### 해결 방안
공지 직후 PDF를 즉시 파싱하여 JSON 데이터로 변환, 에타보다 3일 빠르게 학우들이 시간표 초안을 구성하고 필터링해 볼 수 있는 **"Zero-Day" 시뮬레이터**를 개발했습니다.

---

## 2. 주요 기능 (Key Features)

### 🔍 스마트 필터링
- **통합 검색**: 과목명/교수명 통합 검색 지원
- **다중 필터링**: 이수구분(전선, 전심, 교필 등), 학과, 학년, 학점별 필터링
- **시간대 필터**: 특정 요일/교시로 필터링하여 원하는 시간대의 강의만 확인 가능

### 🕒 알파벳 교시 완벽 대응
상명대 고유의 알파벳 교시(a-g)를 15분 단위의 디지털 슬롯으로 매핑하여 시간표 그리드에 정확하게 렌더링합니다.

- **알파벳 교시 매핑**:
  - `a`: 슬롯 0-1 (2슬롯)
  - `b`: 슬롯 2-3 (2슬롯)
  - `c`: 슬롯 4-5 (2슬롯)
  - `d`: 슬롯 6-7 (2슬롯)
  - `e`: 슬롯 8-9 (2슬롯)
  - `f`: 슬롯 10-11 (2슬롯)
  - `g`: 슬롯 12-13 (2슬롯)

### 💾 학번별 시간표 저장
- **localStorage 활용**: 서버 없이도 브라우저에 학번별 시간표를 안전하게 저장
- **자동 불러오기**: 저장된 학번으로 시간표 즉시 복원
- **캠퍼스별 분리 저장**: 서울/천안 캠퍼스별로 독립적으로 저장

### 📸 이미지 저장
- **html2canvas 활용**: 완성된 시간표를 PNG 이미지 파일로 즉시 저장
- **고해상도 출력**: 2배 스케일로 선명한 이미지 생성
- **공유 및 활용**: 친구와 공유하거나 배경화면으로 활용 가능

### ⚠️ 충돌 감지
- **자동 중복 감지**: 강의 추가 시 기존 시간표와의 중복 시간대 자동 감지
- **시각적 경고**: 충돌하는 강의는 색상으로 구분하여 표시

### 📱 모바일 반응형 UI
- **반응형 레이아웃**: 13교시 이상의 긴 시간표도 한눈에 볼 수 있도록 최적화
- **모바일 최적화**: 스마트폰에서도 편리하게 사용 가능한 UI/UX

---

## 3. 기술 스택 및 구현 상세 (Tech Stack)

### Data Processing (Python)

#### 주요 라이브러리
- **pdfplumber**: PDF 파일에서 테이블 구조를 유지하며 비정형 텍스트 추출
- **pandas**: 데이터프레임을 활용한 구조화된 데이터 처리
- **정규표현식(re)**: 복잡한 강의 시간/장소 문자열을 JSON 데이터로 정규화

#### 핵심 구현 로직

**1. PDF 파싱**
```python
# pdfplumber를 이용해 테이블 구조 유지하며 텍스트 추출
with pdfplumber.open(pdf_path) as pdf:
    for page in pdf.pages:
        table = page.extract_table()
        # 테이블 데이터를 pandas DataFrame으로 변환
```

**2. 정규표현식을 활용한 데이터 정제**
- 과목명 내 줄바꿈 공백 제거
- `'화B(E206)'` 형태의 시간표 문자열을 구조화된 JSON으로 변환
- 알파벳 교시(a-g)를 숫자 슬롯으로 매핑

**3. 동적 컬럼 매핑**
- PDF 구조 변경에 대응하는 유연한 컬럼 인식
- 강의시간, 이수구분 등 필수 필드 자동 탐지

### Frontend (React)

#### 주요 라이브러리
- **React 19.2.4**: 최신 React 기능 활용
- **Axios 1.13.3**: 비동기 데이터 로드
- **html2canvas 1.4.1**: 시간표 이미지 변환

#### 핵심 구현 로직

**1. 비동기 데이터 로드**
```javascript
useEffect(() => {
  if (!campus) return;
  axios.get(`/${campus}_courses.json`).then(res => {
    // 데이터 로드 및 정제
    setCourses(cleanedData);
  });
}, [campus]);
```

**2. 실시간 필터링**
- `useEffect` 기반의 실시간 필터링 로직
- 다중 필터 조건 조합 지원
- 검색어, 학과, 학년, 학점, 이수구분, 시간대 필터 동시 적용

**3. 충돌 감지 알고리즘**
```javascript
const hasConflict = (newCourse) => {
  return myTimetable.some(existing => {
    return existing.schedules.some(es => 
      newCourse.schedules.some(ns => 
        es.day === ns.day && 
        es.slots.some(slot => ns.slots.includes(slot))
      )
    );
  });
};
```

**4. localStorage 기반 저장/불러오기**
- 학번별 키로 데이터 저장: `timetable_{학번}`
- JSON 직렬화/역직렬화를 통한 데이터 관리
- 캠퍼스별 데이터 분리 저장

### Deployment

#### Vercel CI/CD
- **자동 배포**: GitHub 푸시 시 자동으로 빌드 및 배포
- **도메인 리다이렉션**: 기존 도메인에서 신규 도메인으로 자동 리다이렉트 설정
- **빌드 최적화**: React 앱의 프로덕션 빌드 자동 최적화

---

## 4. 프로젝트 폴더 구조 (Project Structure)

```
my_timetable/
├── data_processor/             # 파이썬 데이터 정제 모듈
│   ├── data/                   # 원본 PDF 파일
│   │   ├── 서울.pdf
│   │   └── 천안.pdf
│   ├── output/                 # 변환된 JSON 파일
│   │   ├── seoul_courses.json
│   │   └── cheonan_courses.json
│   ├── run_all.py              # PDF -> JSON 변환 스크립트
│   ├── parser.py               # PDF 파싱 로직
│   ├── refiner.py              # 데이터 정제 로직
│   ├── to_sql.py               # SQL 변환 스크립트
│   ├── database_setup.py       # DB 설정 스크립트
│   └── requirements.txt        # Python 의존성
│
├── frontend/                   # 리액트 웹 어플리케이션
│   ├── public/
│   │   ├── index.html
│   │   ├── seoul_courses.json  # 프론트에서 사용할 서울 데이터
│   │   └── cheonan_courses.json # 프론트에서 사용할 천안 데이터
│   ├── src/
│   │   ├── App.js              # 시간표 핵심 로직
│   │   ├── App.css
│   │   └── index.js            # 리액트 엔트리 포인트
│   └── package.json
│
└── backend/                    # Spring Boot 백엔드
    └── demo/
        ├── build.gradle
        └── src/main/java/com/example/demo/
            ├── DemoApplication.java
            ├── controller/     # REST API
            │   ├── CourseController.java
            │   └── UserCourseController.java
            └── domain/         # 엔티티 및 리포지토리
                ├── Course.java
                ├── CourseRepository.java
                ├── UserCourse.java
                └── UserCourseRepository.java
```

### 데이터 흐름

1. **원본 데이터**: `data_processor/data/` 폴더에 PDF 파일 저장
2. **데이터 변환**: `data_processor/run_all.py` 실행 → `data_processor/output/`에 JSON 생성
3. **프론트엔드 배포**: `output/`의 JSON을 `frontend/public/`에 복사
4. **자동 배포**: GitHub 푸시 → Vercel 자동 빌드 및 배포

---

## 5. 데이터 업데이트 가이드 (Maintenance)

새 학기 시간표 공지 직후 아래 단계를 수행하여 **1분 내에 업데이트**가 가능합니다.

### 단계별 가이드

#### 1단계: 최신 PDF 다운로드 및 저장
```
1. 학교 홈페이지에서 최신 시간표 PDF 다운로드
2. data_processor/data/ 폴더에 저장
   - 서울 캠퍼스: "서울.pdf"
   - 천안 캠퍼스: "천안.pdf"
```

#### 2단계: 데이터 변환 실행
```bash
# data_processor 폴더로 이동
cd data_processor

# Python 가상환경 활성화 (Windows)
venv\Scripts\activate

# 또는 (Linux/Mac)
source venv/bin/activate

# 의존성 설치 (최초 1회)
pip install -r requirements.txt

# 데이터 변환 스크립트 실행
python run_all.py
```

**실행 결과 예시**:
```
🚀 이수구분 포함 데이터 정제 시작...
✨ 완료! 서울: 1234건, 천안: 567건
```

#### 3단계: JSON 파일 복사
```bash
# 변환된 JSON 파일을 frontend/public/ 폴더로 복사
# Windows (PowerShell)
Copy-Item data_processor\output\seoul_courses.json frontend\public\
Copy-Item data_processor\output\cheonan_courses.json frontend\public\

# 또는 (Linux/Mac)
cp data_processor/output/seoul_courses.json frontend/public/
cp data_processor/output/cheonan_courses.json frontend/public/
```

#### 4단계: GitHub 푸시 및 자동 배포
```bash
# 변경사항 커밋
git add .
git commit -m "Update timetable data for [학기명]"

# GitHub에 푸시 (Vercel이 자동으로 배포)
git push origin main
```

**배포 확인**:
- Vercel 대시보드에서 배포 상태 확인
- 약 1-2분 후 새 시간표가 반영됨
- [https://smu-timetable.vercel.app/](https://smu-timetable.vercel.app/)에서 확인

### 트러블슈팅

#### 문제: PDF 파싱 오류
- **원인**: PDF 구조 변경 또는 인코딩 문제
- **해결**: `run_all.py`의 정규표현식 패턴 확인 및 수정

#### 문제: JSON 파일이 생성되지 않음
- **원인**: PDF 파일 경로 오류 또는 파일명 불일치
- **해결**: `data_processor/data/` 폴더에 정확한 파일명으로 저장되었는지 확인

#### 문제: 프론트엔드에서 데이터가 로드되지 않음
- **원인**: JSON 파일이 `frontend/public/`에 복사되지 않음
- **해결**: 파일 복사 단계 재확인 및 브라우저 캐시 삭제

---

## 6. 로컬 개발 환경 설정 (Development)

### Frontend 개발 환경

```bash
# frontend 폴더로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm start

# 브라우저에서 http://localhost:3000 접속
```

### Data Processor 개발 환경

```bash
# data_processor 폴더로 이동
cd data_processor

# Python 가상환경 생성 (최초 1회)
python -m venv venv

# 가상환경 활성화
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 데이터 변환 테스트
python run_all.py
```

---

## 7. 주요 기능 상세 설명

### 시간표 그리드 렌더링
- **요일별 컬럼**: 월요일부터 금요일까지 5개 컬럼
- **교시별 행**: 0교시부터 13교시까지 (알파벳 교시 포함)
- **15분 단위 슬롯**: 각 교시를 2개의 슬롯으로 분할하여 정확한 시간 표현

### 필터링 시스템
1. **검색 필터**: 과목명 또는 교수명에 검색어 포함 여부
2. **학과 필터**: 드롭다운에서 학과 선택
3. **학년 필터**: 1학년부터 4학년까지 선택
4. **학점 필터**: 1학점부터 4학점까지 선택
5. **이수구분 필터**: 전선, 전심, 교필, 교선 등
6. **시간대 필터**: 특정 요일/교시 클릭으로 해당 시간대 강의만 표시

### 저장/불러오기 시스템
- **저장 형식**: `{ campus: "seoul" | "cheonan", courseIds: [1, 2, 3, ...] }`
- **저장 위치**: 브라우저 localStorage
- **키 형식**: `timetable_{학번}`
- **데이터 보존**: 브라우저 캐시 삭제 전까지 유지

### 이미지 저장 기능
- **라이브러리**: html2canvas
- **해상도**: 2배 스케일 (고해상도)
- **파일명**: `timetable_{학번}.png` 또는 `timetable_result.png`
- **용도**: 공유, 배경화면, 인쇄 등

---

## 8. 기술적 특징 및 최적화

### 성능 최적화
- **useMemo 활용**: 색상 배열, 총 학점 등 불필요한 재계산 방지
- **useEffect 의존성 최적화**: 필요한 경우에만 필터링 재실행
- **정적 데이터 로드**: JSON 파일을 public 폴더에 배치하여 빠른 로드

### 사용자 경험 (UX)
- **즉시 피드백**: 필터 적용 시 실시간 결과 표시
- **시각적 구분**: 각 강의마다 고유 색상 할당
- **충돌 경고**: 시간 겹침 시 명확한 시각적 표시
- **반응형 디자인**: 모바일/태블릿/데스크톱 모든 환경 지원

### 데이터 정확성
- **정규표현식 검증**: 시간표 문자열 파싱 시 엄격한 패턴 매칭
- **중복 제거**: 동일한 슬롯 중복 추가 방지
- **데이터 정제**: PDF 추출 시 공백, 줄바꿈 등 불필요한 문자 제거

---

## 9. 향후 개선 계획 (Future Improvements)

- [ ] 다크 모드 지원
- [ ] 시간표 템플릿 저장 및 불러오기
- [ ] 강의 평가 및 리뷰 기능
- [ ] 수강 신청 링크 통합
- [ ] 알림 기능 (수강 신청 시작 알림 등)
- [ ] 통계 기능 (학점 분포, 시간대 분포 등)

---

## 10. 라이선스 및 기여 (License & Contributing)

이 프로젝트는 상명대학교 학생들을 위한 오픈소스 프로젝트입니다.

### 기여 방법
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 11. 문의 및 지원 (Contact & Support)

프로젝트 관련 문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

---

**Made with ❤️ for 상명대학교 학생들**
