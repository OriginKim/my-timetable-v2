import json
import re

def parse_schedule(time_str):
    """ '화4(N205) 수5,6(N204)' -> [{'day': 1, 'slots': [4], 'room': 'N205'}, ...] """
    if not time_str or time_str.strip() == "":
        return []

    day_map = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
    pattern = r'([월화수목금토일])([\d,]+)\((.*?)\)'
    matches = re.findall(pattern, time_str)
    
    parsed = []
    for day_text, slots_text, room in matches:
        try:
            slots = [int(s) for s in slots_text.split(',')]
            parsed.append({
                "day": day_map[day_text],
                "slots": slots,
                "room": room.strip()
            })
        except (ValueError, KeyError):
            continue
    return parsed

# 💡 핵심: 파일 경로를 인자로 받아서 범용적으로 사용할 수 있게 수정함
def refine_process(input_path, output_path):
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            courses = json.load(f)
        
        refined_courses = []
        for item in courses:
            # 시간표 파싱 및 0교시 체크 로직 유지
            item["schedules"] = parse_schedule(item.get("time_location", ""))
            item["has_zero_slot"] = any(0 in s["slots"] for s in item["schedules"])
            refined_courses.append(item)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(refined_courses, f, ensure_ascii=False, indent=4)
        return len(refined_courses)
    except Exception as e:
        print(f"❌ 에러 발생 ({input_path}): {e}")
        return 0

if __name__ == "__main__":
    # 💡 1. 서울 데이터 정제 (parser.py가 만든 seoul_db.json 사용)
    s_count = refine_process("output/seoul_db.json", "output/seoul_courses.json")
    print(f"✨ 서울 정제 완료: {s_count}건 -> output/seoul_courses.json")

    # 💡 2. 천안 데이터 정제 (parser.py가 만든 cheonan_db.json 사용)
    c_count = refine_process("output/cheonan_db.json", "output/cheonan_courses.json")
    print(f"✨ 천안 정제 완료: {c_count}건 -> output/cheonan_courses.json")