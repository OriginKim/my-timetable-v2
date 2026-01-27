import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8080/api/courses')
      .then(res => {
        setCourses(res.data);
        setFilteredCourses(res.data);
      })
      .catch(err => console.error(err));
  }, []);

  // 학과 선택 시 필터링 로직
  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    if (dept === '') {
      setFilteredCourses(courses);
    } else {
      setFilteredCourses(courses.filter(c => c.dept.includes(dept)));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. 상단: 시간표 격자 (Grid) */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>📅 내 시간표</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          {['시간', '월', '화', '수', '목', '금'].map(day => (
            <div key={day} style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f0f0f0', borderRight: '1px solid #ddd', borderBottom: '2px solid #ddd', fontWeight: 'bold' }}>{day}</div>
          ))}
          {/* 시간표 칸 (8교시 예시) */}
          {[1,2,3,4,5,6,7,8].map(time => (
            <React.Fragment key={time}>
              <div style={{ padding: '20px 0', textAlign: 'center', backgroundColor: '#fafafa', borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', fontSize: '12px' }}>{time}교시</div>
              {[0,1,2,3,4].map(day => (
                <div key={`${day}-${time}`} style={{ borderRight: '1px solid #ddd', borderBottom: '1px solid #ddd', backgroundColor: '#fff' }}></div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 2. 중단: 필터링 옵션 */}
      <section style={{ margin: '30px 0', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '12px' }}>
        <h3 style={{ marginTop: 0 }}>🔍 과목 필터링</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label>학과 선택:</label>
          <select 
            value={selectedDept} 
            onChange={(e) => handleDeptChange(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '200px' }}
          >
            <option value="">전체 학과</option>
            <option value="컴퓨터과학전공">컴퓨터과학전공</option>
            <option value="역사콘텐츠전공">역사콘텐츠전공</option>
            <option value="지적재산권전공">지적재산권전공</option>
          </select>
          <span style={{ fontSize: '14px', color: '#666' }}>검색 결과: {filteredCourses.length}개</span>
        </div>
      </section>

      {/* 3. 하단: 강의 목록 테이블 */}
      <section>
        <h3>📋 검색된 강의 목록</h3>
        <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
              <tr style={{ backgroundColor: '#343a40', color: 'white' }}>
                <th style={{ padding: '12px' }}>과목명/코드</th>
                <th style={{ padding: '12px' }}>학과</th>
                <th style={{ padding: '12px' }}>교수</th>
                <th style={{ padding: '12px' }}>비고</th>
                <th style={{ padding: '12px' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}><strong>{course.name}</strong><br/><small style={{color: '#888'}}>{course.code}</small></td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{course.dept}</td>
                  <td style={{ padding: '12px' }}>{course.professor}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>{course.schedules}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>추가 +</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
