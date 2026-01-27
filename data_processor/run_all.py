import pdfplumber
import pandas as pd
import json
import re
import os

# 알파벳 교시 시간대 매핑 (기원님이 주신 이미지 기준)
ALPHABET_MAP = {
    'a': [0, 1], 'b': [2], 'c': [3, 4], 
    'd': [5],    'e': [6, 7], 'f': [8, 9], 'g': [10, 11]
}

def parse_schedule(time_str):
    if not time_str or time_str.strip() == "": return []
    day_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4}
    # 정규표현식 수정: 숫자와 알파벳 모두 감지
    pattern = r'([월화수목금토일])([a-g\d,]+)\((.*?)\)'
    matches = re.findall(pattern, time_str)
    
    parsed = []
    for day_text, slots_text, room in matches:
        all_slots = []
        for s in slots_text.split(','):
            s = s.lower()
            if s in ALPHABET_MAP:
                all_slots.extend(ALPHABET_MAP[s])
            elif s.isdigit():
                all_slots.append(int(s))
        
        parsed.append({
            "day": day_map.get(day_text, 0),
            "slots": sorted(list(set(all_slots))),
            "room": room.strip()
        })
    return parsed

def process_campus(pdf_name, output_name, start_id):
    pdf_path = f"data/{pdf_name}.pdf"
    if not os.path.exists(pdf_path):
        print(f"⚠️ {pdf_path} 파일이 없습니다.")
        return 0

    all_courses = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # 학과명 추출 로직 수정: 특정 키워드가 포함된 라인을 더 정교하게 찾음
            text = page.extract_text() or ""
            dept_name = "공통/기타"
            lines = text.split('\n')
            for line in lines[:15]: # 상단 15줄 탐색
                # '2026학년도' 문구가 포함된 라인은 학과명이 아니므로 건너뜀
                if "2026학년도" in line: continue
                if any(k in line for k in ["대학", "학부", "전공", "학과"]):
                    # 불필요한 공백이나 대괄호 제거
                    dept_name = re.sub(r'\[.*?\]', '', line).replace("(", "").replace(")", "").strip()
                    break

            table = page.extract_table()
            if not table or len(table) < 2: continue
            
            headers = [str(h).replace('\n', '').replace(' ', '') for h in table[0]]
            df = pd.DataFrame(table[1:], columns=headers)
            time_col = next((c for c in headers if '강의시간' in c), None)

            for _, row in df.iterrows():
                def clean(t): return re.sub(r'\s+', ' ', str(t)).strip() if t else ""
                
                # 교과목명이 비어있는 행은 무시
                if not row.get("교과목명"): continue

                course_data = {
                    "id": start_id + len(all_courses),
                    "dept": clean(dept_name),
                    "grade": clean(row.get("학년")),
                    "code": clean(row.get("학수번호")),
                    "name": clean(row.get("교과목명")),
                    "credit": clean(row.get("학점")),
                    "professor": clean(row.get("담당교수")),
                    "time_location": clean(row.get(time_col)) if time_col else "",
                    "note": clean(row.get("비고"))
                }
                course_data["schedules"] = parse_schedule(course_data["time_location"])
                all_courses.append(course_data)

    with open(f"output/{output_name}.json", "w", encoding="utf-8") as f:
        json.dump(all_courses, f, ensure_ascii=False, indent=4)
    return len(all_courses)

if __name__ == "__main__":
    if not os.path.exists("output"): os.makedirs("output")
    s_cnt = process_campus("서울", "seoul_courses", 1)
    c_cnt = process_campus("천안", "cheonan_courses", 10001)
    print(f"✨ 데이터 정제 완료! (서울: {s_cnt}, 천안: {c_cnt})")