import json
import os

def generate_sql():
    # 경로 설정
    input_path = os.path.join('output', 'refined_timetable.json')
    output_path = os.path.join('output', 'insert_courses.sql')

    with open(input_path, 'r', encoding='utf-8') as f:
        courses = json.load(f)

    with open(output_path, 'w', encoding='utf-8') as f:
        for c in courses:
            # 특수 문자(') 처리
            name = c['name'].replace("'", "''")
            professor = c['professor'].replace("'", "''")
            dept = c['dept'].replace("'", "''")

            # SQL 문 생성
            sql = f"INSERT INTO courses (code, name, dept, grade, credit, professor, schedules, is_blended, is_elearning) " \
                  f"VALUES ('{c['code']}', '{name}', '{dept}', '{c['grade']}', " \
                  f"'{c['credit']}', '{professor}', '{json.dumps(c['schedules'])}', " \
                  f"{str(c['is_blended']).lower()}, {str(c['is_elearning']).lower()});\n"
            f.write(sql)

if __name__ == "__main__":
    generate_sql()
    print(f"✅ SQL 파일 생성 완료: output/insert_courses.sql")