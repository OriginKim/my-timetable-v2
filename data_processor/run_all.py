import pdfplumber
import pandas as pd
import json
import re
import os

# 💡 알파벳 교시 매핑 (상명대 천안 캠퍼스 특성 반영)
ALPHABET_MAP = {
    'a': [0, 1], 'b': [2, 3], 'c': [4, 5], 
    'd': [6, 7], 'e': [8, 9], 'f': [10, 11], 'g': [12, 13]
}

def parse_schedule(time_str):
    """ '화B(E206)' 또는 '월7,8,9(N205)' 형태의 문자열을 숫자 슬롯으로 변환 """
    if not time_str or time_str.strip() == "": return []
    day_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
    
    # PDF 파싱 노이즈 제거 ($ | + 등 특수문자 및 공백 제거)
    time_str = re.sub(r'[\$\|\+\s]', '', time_str)
    
    pattern = r'([월화수목금토일])([a-gA-G\d,]+)\((.*?)\)'
    matches = re.findall(pattern, time_str)
    
    parsed = []
    for day_text, slots_text, room in matches:
        all_slots = []
        # 콤마로 구분된 교시 처리 (예: '3,4' 또는 'B,C')
        for s in slots_text.split(','):
            s_lower = s.lower()
            if s_lower in ALPHABET_MAP:
                all_slots.extend(ALPHABET_MAP[s_lower])
            elif s.isdigit():
                # 시간표 그리드 인덱스에 맞춰 변환 (필요시 기원님의 그리드 로직에 따라 + 또는 - 조정)
                all_slots.append(int(s))
        
        if all_slots:
            parsed.append({
                "day": day_map.get(day_text, 0),
                "slots": sorted(list(set(all_slots))),
                "room": room.strip()
            })
    return parsed

def normalize_classification(combined_text):
    """ '1전선', '기초교양' 등의 키워드를 앱 표준 카테고리로 정규화 """
    # 숫자와 공백 제거
    val = re.sub(r'[\s\d]', '', combined_text)
    
    if '전선' in val: return '전선'
    if '전심' in val: return '전심'
    if '교필' in val or '기초교양' in val or '핵심' in val: return '교필'
    if '교선' in val or '균형' in val or '일반' in val: return '교선'
    if '일선' in val: return '일선'
    if '교직' in val: return '교직'
    return '기타'

def process_campus(pdf_name, output_name, start_id):
    pdf_path = f"data/{pdf_name}.pdf"
    if not os.path.exists(pdf_path):
        print(f"⚠️ {pdf_path} 파일이 없습니다.")
        return 0

    all_courses = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # --- 1. 학과명 추출 (제목 제외 로직 보강) ---
            text = page.extract_text() or ""
            dept_name = "공통/기타"
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            for line in lines[:15]:
                # 제목 관련 키워드 포함 시 건너뜀
                if any(k in line for k in ["2026학년도", "공지용", "학과별시간표", "캠퍼스"]):
                    continue
                # '대학', '학부', '전공', '학과' 키워드 추출
                if any(k in line for k in ["대학", "학부", "전공", "학과"]):
                    clean_dept = re.sub(r'\[.*?\]', '', line).strip()
                    if "시간표" not in clean_dept:
                        dept_name = clean_dept
                        break

            # --- 2. 테이블 데이터 추출 ---
            table = page.extract_table()
            if not table or len(table) < 2: continue
            
            headers = [str(h).replace('\n', '').replace(' ', '') for h in table[0]]
            
            # 동적 인덱스 찾기 (데이터 밀림 대응)
            name_idx = next((i for i, h in enumerate(headers) if '교과목' in h), 2)
            type_idx = next((i for i, h in enumerate(headers) if any(k in h for k in ['이수', '구분'])), 1)
            code_idx = next((i for i, h in enumerate(headers) if '학수' in h), 3)
            time_idx = next((i for i, h in enumerate(headers) if '강의시간' in h), -3)

            for row in table[1:]:
                def clean(t): return re.sub(r'\s+', ' ', str(t)).strip() if t else ""
                
                # 데이터 밀림 대응을 위해 관련 셀 병합 후 재분석
                raw_type = clean(row[type_idx])
                raw_name = clean(row[name_idx])
                raw_code = clean(row[code_idx])
                
                combined = f"{raw_type} {raw_code} {raw_name}"
                
                # 학수번호 패턴(알파벳+숫자4자리)으로 정확한 코드 추출
                code_match = re.search(r'([A-Z]{2,4}\d{4})', combined)
                course_code = code_match.group(1) if code_match else raw_code
                
                # 이수구분 정규화
                classification = normalize_classification(combined)
                
                # 과목명 추출 (학수번호 이후 텍스트 사용)
                if code_match:
                    course_name = combined.split(course_code)[-1].strip()
                else:
                    course_name = raw_name

                # 유효하지 않은 데이터 건너뜀
                if not course_name or len(course_name) < 2: 
                    continue

                # 학점 추출 (숫자만 발라내기)
                try:
                    credit_val = float(re.findall(r'\d+\.?\d*', str(row[headers.index('학점')] if '학점' in headers else '0'))[0])
                except:
                    credit_val = 0

                course_data = {
                    "id": start_id + len(all_courses),
                    "dept": clean(dept_name),
                    "classification": classification,
                    "grade": clean(row[headers.index('학년')] if '학년' in headers else ""),
                    "code": course_code,
                    "name": course_name,
                    "credit": credit_val,
                    "professor": clean(row[-2]), # 담당교수는 보통 뒤에서 두 번째
                    "time_location": clean(row[time_idx]),
                }
                
                # 시간 데이터 파싱
                course_data["schedules"] = parse_schedule(course_data["time_location"])
                all_courses.append(course_data)

    # --- 3. JSON 출력 ---
    output_path = f"output/{output_name}.json"
    os.makedirs("output", exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_courses, f, ensure_ascii=False, indent=4)
    return len(all_courses)

if __name__ == "__main__":
    print("🚀 상명대 시간표 데이터 정제 파이프라인 가동 (v2.1)...")
    s_cnt = process_campus("서울", "seoul_courses", 1)
    c_cnt = process_campus("천안", "cheonan_courses", 10001)
    
    print("-" * 30)
    print(f"✨ 정제 완료!")
    print(f"📍 서울 캠퍼스: {s_cnt}건 추출")
    print(f"📍 천안 캠퍼스: {c_cnt}건 추출")
    print(f"📂 저장 위치: output/ 폴더를 확인하세요.")
    print("-" * 30)