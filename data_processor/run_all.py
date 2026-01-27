import pdfplumber
import pandas as pd
import json
import re
import os

# 💡 알파벳 교시 매핑 (이미지 기준: 한 교시당 2슬롯 차지)
ALPHABET_MAP = {
    'a': [0, 1], 'b': [2, 3], 'c': [4, 5], 
    'd': [6, 7], 'e': [8, 9], 'f': [10, 11], 'g': [12, 13]
}

def parse_schedule(time_str):
    """ '화B(E206)' 형태의 문자열을 숫자 배열 슬롯으로 변환 """
    if not time_str or time_str.strip() == "": return []
    day_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4}
    
    pattern = r'([월화수목금토일])([a-gA-G\d,]+)\((.*?)\)'
    matches = re.findall(pattern, time_str)
    
    parsed = []
    for day_text, slots_text, room in matches:
        all_slots = []
        for s in slots_text.split(','):
            s_lower = s.lower()
            if s_lower in ALPHABET_MAP:
                all_slots.extend(ALPHABET_MAP[s_lower])
            elif s.isdigit():
                all_slots.append(int(s))
        
        if all_slots:
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
            text = page.extract_text() or ""
            dept_name = "공통/기타"
            lines = text.split('\n')
            for line in lines[:15]:
                if "2026학년도" in line or "공지용" in line: continue
                if any(k in line for k in ["대학", "학부", "전공", "학과"]):
                    dept_name = re.sub(r'\[.*?\]', '', line).strip()
                    break

            table = page.extract_table()
            if not table or len(table) < 2: continue
            
            # 헤더 정제
            headers = [str(h).replace('\n', '').replace(' ', '') for h in table[0]]
            df = pd.DataFrame(table[1:], columns=headers)
            
            # 💡 동적 컬럼 매핑: 강의시간과 이수구분 열 찾기
            time_col = next((c for c in headers if '강의시간' in c), None)
            type_col = next((c for c in headers if any(k in c for k in ['이수구분', '구분', '이수'])), None)

            for _, row in df.iterrows():
                def clean(t): return re.sub(r'\s+', ' ', str(t)).strip() if t else ""
                if not row.get("교과목명"): continue

                raw_credit = clean(row.get("학점"))
                try:
                    credit_num = float(raw_credit) if raw_credit else 0
                except:
                    credit_num = 0

                course_data = {
                    "id": start_id + len(all_courses),
                    "dept": clean(dept_name),
                    "classification": clean(row.get(type_col)) if type_col else "기타", # 💡 이수구분 추가
                    "grade": clean(row.get("학년")),
                    "code": clean(row.get("학수번호")),
                    "name": clean(row.get("교과목명")),
                    "credit": credit_num,
                    "professor": clean(row.get("담당교수")),
                    "time_location": clean(row.get(time_col)),
                }
                course_data["schedules"] = parse_schedule(course_data["time_location"])
                all_courses.append(course_data)

    output_path = f"output/{output_name}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_courses, f, ensure_ascii=False, indent=4)
    return len(all_courses)

if __name__ == "__main__":
    if not os.path.exists("output"): os.makedirs("output")
    print("🚀 이수구분 포함 데이터 정제 시작...")
    s_cnt = process_campus("서울", "seoul_courses", 1)
    c_cnt = process_campus("천안", "cheonan_courses", 10001)
    print(f"✨ 완료! 서울: {s_cnt}건, 천안: {c_cnt}건")