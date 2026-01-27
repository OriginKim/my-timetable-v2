/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';

function App() {
  const [campus, setCampus] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [myTimetable, setMyTimetable] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState([]);

  const timetableRef = useRef(null);
  const pastelColors = useMemo(() => ['#FFD1DC', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#D4A5A5', '#97C1A9', '#A0E7E5', '#B28DFF'], []);
  const getCourseColor = (id) => pastelColors[(id || 0) % pastelColors.length];

  useEffect(() => {
    if (!campus) return;
    axios.get(`/${campus}_courses.json`).then(res => {
      setCourses(res.data);
      setFilteredCourses(res.data);
      setMyTimetable([]);
    }).catch(err => alert("데이터를 찾을 수 없습니다. public 폴더를 확인하세요."));
  }, [campus]);

  const saveUserCourses = () => {
    if (!studentId) return alert("학번을 입력해주세요!");
    localStorage.setItem(`timetable_${campus}_${studentId}`, JSON.stringify(myTimetable.map(c => c.id)));
    alert("현재 브라우저에 저장되었습니다!");
  };

  const loadUserCourses = () => {
    if (!studentId) return alert("학번을 입력해주세요.");
    const saved = localStorage.getItem(`timetable_${campus}_${studentId}`);
    if (saved) {
      const ids = JSON.parse(saved);
      setMyTimetable(courses.filter(c => ids.includes(c.id)));
      alert("시간표를 불러왔습니다.");
    } else { alert("저장된 내역이 없습니다."); }
  };

  const saveAsImage = async () => {
    if (!timetableRef.current) return;
    const canvas = await html2canvas(timetableRef.current, { backgroundColor: '#fff', scale: 2 });
    const link = document.createElement('a');
    link.download = `timetable.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  useEffect(() => {
    let result = courses;
    if (searchTerm) result = result.filter(c => c.name.includes(searchTerm) || c.professor.includes(searchTerm));
    if (selectedDept) result = result.filter(c => c.dept === selectedDept);
    if (selectedGrade) result = result.filter(c => String(c.grade) === selectedGrade);
    if (selectedCredit) result = result.filter(c => String(c.credit).includes(selectedCredit));
    if (selectedTimes.length > 0) {
      result = result.filter(c => selectedTimes.some(st => c.schedules.some(s => s.day === st.day && s.slots.includes(st.slot))));
    }
    setFilteredCourses(result);
  }, [searchTerm, selectedDept, selectedGrade, selectedCredit, selectedTimes, courses]);

  const addCourse = (c) => {
    if (myTimetable.find(m => m.id === c.id)) return;
    let conflict = false;
    myTimetable.forEach(ex => {
      c.schedules.forEach(ns => ex.schedules.forEach(es => {
        if (ns.day === es.day && ns.slots.some(s => es.slots.includes(s))) conflict = true;
      }));
    });
    if (conflict) return alert("시간표가 겹칩니다!");
    setMyTimetable([...myTimetable, c]);
  };

  const removeCourse = (id) => setMyTimetable(myTimetable.filter(c => c.id !== id));

  const formatSchedule = (schedules) => {
    const dayMap = ["월", "화", "수", "목", "금"];
    return schedules.map(s => `${dayMap[s.day]}${s.slots.join(',')}`).join(' / ');
  };

  if (!campus) {
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f9' }}>
          <h1 style={{ color: '#1a237e', fontSize: '3rem', fontWeight: '900' }}>📅 Timetable</h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
            <button onClick={() => setCampus('seoul')} style={{ padding: '20px 40px', fontSize: '1.2rem', background: '#3f51b5', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer' }}>서울 캠퍼스</button>
            <button onClick={() => setCampus('cheonan')} style={{ padding: '20px 40px', fontSize: '1.2rem', background: '#ff5722', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer' }}>천안 캠퍼스</button>
          </div>
        </div>
    );
  }

  return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button onClick={() => setCampus(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>← 캠퍼스 변경</button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="학번" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={loadUserCourses} style={{ padding: '10px 15px', background: '#3f51b5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>불러오기</button>
            <button onClick={saveUserCourses} style={{ padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>저장</button>
            <button onClick={saveAsImage} style={{ padding: '10px 15px', background: '#009688', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>이미지 저장</button>
          </div>
        </header>

        {/* 시간표 (가로 스크롤) */}
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '20px', padding: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
          <div ref={timetableRef} style={{ minWidth: '600px', display: 'grid', gridTemplateColumns: '50px repeat(5, 1fr)', backgroundColor: 'white' }}>
            {['', '월', '화', '수', '목', '금'].map(d => <div key={d} style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #eee' }}>{d}</div>)}
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(slot => (
                <React.Fragment key={slot}>
                  <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '11px', color: '#999', borderBottom: '1px solid #f0f0f0' }}>{slot}</div>
                  {[0,1,2,3,4].map(day => {
                    const course = myTimetable.find(c => c.schedules.some(s => s.day === day && s.slots.includes(slot)));
                    return <div key={`${day}-${slot}`} onClick={() => course && removeCourse(course.id)} style={{ borderBottom: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', backgroundColor: course ? getCourseColor(course.id) : 'transparent', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textAlign: 'center', cursor: course ? 'pointer' : 'default' }}>{course?.name}</div>
                  })}
                </React.Fragment>
            ))}
          </div>
        </div>

        {/* 필터 섹션 */}
        <section style={{ background: '#fff', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', flex: 1 }} />
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">학과 전체</option>
              {[...new Set(courses.map(c => c.dept))].sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">학년</option>
              {[1,2,3,4].map(g => <option key={g} value={g}>{g}학년</option>)}
            </select>
            <select value={selectedCredit} onChange={(e) => setSelectedCredit(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">학점</option>
              {[1,2,3].map(c => <option key={c} value={c}>{c}학점</option>)}
            </select>
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🕒 시간대 필터</button>
          </div>
        </section>

        {/* 강의 목록 (스크롤 가능한 테이블) */}
        <div style={{ maxHeight: '500px', overflowY: 'auto', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>강의정보</th>
              <th>시간</th>
              <th>액션</th>
            </tr>
            </thead>
            <tbody>
            {filteredCourses.map(c => {
              const added = myTimetable.find(m => m.id === c.id);
              return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{c.dept} | {c.professor} | {c.credit}학점</div>
                    </td>
                    <td style={{ fontSize: '12px', textAlign: 'center' }}>{formatSchedule(c.schedules)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => added ? removeCourse(c.id) : addCourse(c)} style={{ padding: '8px 15px', borderRadius: '8px', border: 'none', background: added ? '#fee2e2' : '#e0f2fe', color: added ? '#ef4444' : '#0284c7', cursor: 'pointer', fontWeight: 'bold' }}>{added ? '취소' : '추가'}</button>
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>

        {/* 시간대 필터 모달 (동일하게 유지) */}
        {isModalOpen && (
            <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000 }}>
              <div style={{ backgroundColor:'white', padding:'30px', borderRadius:'20px', width:'90%', maxWidth:'500px' }}>
                <h3>🕒 시간대 필터</h3>
                <div style={{ display:'grid', gridTemplateColumns:'40px repeat(5, 1fr)', gap:'5px', marginBottom:'20px' }}>
                  <div></div>{["월","화","수","목","금"].map(d => <div key={d} style={{textAlign:'center', fontWeight:'bold'}}>{d}</div>)}
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(slot => (
                      <React.Fragment key={slot}>
                        <div style={{textAlign:'center', fontSize:'12px'}}>{slot}</div>
                        {[0,1,2,3,4].map(day => {
                          const active = selectedTimes.find(t => t.day === day && t.slot === slot);
                          return <div key={`${day}-${slot}`} onClick={() => {
                            const exists = selectedTimes.find(t => t.day === day && t.slot === slot);
                            if(exists) setSelectedTimes(selectedTimes.filter(t => !(t.day === day && t.slot === slot)));
                            else setSelectedTimes([...selectedTimes, {day, slot}]);
                          }} style={{ background: active ? '#4f46e5' : '#f0f0f0', height: '25px', borderRadius: '4px', cursor: 'pointer' }}></div>
                        })}
                      </React.Fragment>
                  ))}
                </div>
                <button onClick={() => setIsModalOpen(false)} style={{ width: '100%', padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px' }}>닫기</button>
              </div>
            </div>
        )}
      </div>
  );
}

export default App;