import pdfplumber
import pandas as pd
import json
import re
import os

def parse_timetable(pdf_path):
    all_courses = []
    
    # 💡 파일 존재 여부 확인
    if not os.path.exists(pdf_path):
        print(f"⚠️ 파일을 찾을 수 없습니다: {pdf_path}")
        return []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            # 1. 페이지 상단에서 학과명 추출
            text = page.extract_text() or ""
            lines = text.split('\n')
            dept_name = "전체학과"
            
            for line in lines[:10]:
                if "2026학년도" in line and "시간표" in line:
                    continue
                if any(k in line for k in ["대학", "학부", "전공", "학과", "마이크로전공"]):
                    dept_name = re.sub(r'\[.*?\]', '', line).strip()
                    break

            # 2. 표 데이터 추출
            table = page.extract_table()
            if not table or len(table) < 2:
                continue
                
            # 컬럼명 정제
            headers = [str(h).replace('\n', '').replace(' ', '') for h in table[0]]
            df = pd.DataFrame(table[1:], columns=headers)
            
            for _, row in df.iterrows():
                def clean(text):
                    if text is None: return ""
                    return re.sub(r'\s+', ' ', str(text)).strip()

                time_col = next((c for c in headers if '강의시간' in c), None)
                
                course = {
                    "dept": clean(dept_name),
                    "grade": clean(row.get("학년")),
                    "code": clean(row.get("학수번호")),
                    "name": clean(row.get("교과목명")),
                    "credit": clean(row.get("학점") or row.get("이론시간")), 
                    "category": clean(row.get("교양영역")),
                    "time_location": clean(row.get(time_col)) if time_col else "",
                    "professor": clean(row.get("담당교수")),
                    "note": clean(row.get("비고"))
                }
                
                note_str = f"{course['note']} {course['professor']} {course['time_location']}"
                course["is_blended"] = any(x in note_str for x in ["b-러닝", "B-러닝", "b러닝", "B러닝"])
                course["is_elearning"] = any(x in note_str for x in ["e-러닝", "E-러닝", "e러닝", "E러닝"])
                
                all_courses.append(course)
    
    return all_courses

# 💡 캠퍼스별로 데이터를 뽑아주는 실행부
def run_parsing():
    # 1. 서울 캠퍼스 처리
    print("--- 서울 캠퍼스 데이터 추출 시작 ---")
    seoul_data = parse_timetable("data/서울.pdf")
    # 리액트에서 쓸 고유 ID 부여 (1부터 시작)
    for i, item in enumerate(seoul_data): item["id"] = i + 1
    
    with open("output/seoul_db.json", "w", encoding="utf-8") as f:
        json.dump(seoul_data, f, ensure_ascii=False, indent=4)
    print(f"✅ 서울 완료: {len(seoul_data)}건")

    # 2. 천안 캠퍼스 처리
    print("\n--- 천안 캠퍼스 데이터 추출 시작 ---")
    cheonan_data = parse_timetable("data/천안.pdf")
    # 리액트에서 쓸 고유 ID 부여 (서울과 안 겹치게 10000부터 시작)
    for i, item in enumerate(cheonan_data): item["id"] = i + 10001
    
    with open("output/cheonan_db.json", "w", encoding="utf-8") as f:
        json.dump(cheonan_data, f, ensure_ascii=False, indent=4)
    print(f"✅ 천안 완료: {len(cheonan_data)}건")

if __name__ == "__main__":
    run_parsing()