import sqlite3
import json

def init_db():
    conn = sqlite3.connect('timetable.db')
    cursor = conn.cursor()

    # 테이블 생성 (필터링에 필요한 컬럼 위주)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dept TEXT,           -- 학과
            grade TEXT,          -- 학년
            code TEXT,           -- 학수번호
            name TEXT,           -- 과목명
            credit TEXT,         -- 학점
            category TEXT,       -- 교양영역
            professor TEXT,      -- 교수명
            time_location TEXT,  -- 원본 시간/장소
            schedules JSON,      -- 정제된 시간 데이터 (JSON 형태 저장)
            is_blended BOOLEAN,
            is_elearning BOOLEAN
        )
    ''')

    # 데이터 삽입
    with open('output/refined_timetable.json', 'r', encoding='utf-8') as f:
        courses = json.load(f)

    for c in courses:
        cursor.execute('''
            INSERT INTO courses (dept, grade, code, name, credit, category, professor, time_location, schedules, is_blended, is_elearning)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            c.get('dept'), c.get('grade'), c.get('code'), c.get('name'),
            c.get('credit'), c.get('category'), c.get('professor'),
            c.get('time_location'), json.dumps(c.get('schedules')),
            c.get('is_blended'), c.get('is_elearning')
        ))

    conn.commit()
    conn.close()
    print("DB 구축 완료!")

if __name__ == "__main__":
    init_db()