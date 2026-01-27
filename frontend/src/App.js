/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useRef } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';

function App() {
  // --- 상태 관리 ---
  const [campus, setCampus] = useState(null);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [myTimetable, setMyTimetable] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedCredit, setSelectedCredit] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState([]);

  const timetableRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pastelColors = useMemo(() => ['#FFD1DC', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#D4A5A5', '#97C1A9', '#A0E7E5', '#B28DFF'], []);
  const getCourseColor = (id) => pastelColors[(id || 0) % pastelColors.length];

  const totalCredits = useMemo(() => {
    return myTimetable.reduce((sum, c) => sum + (Number(c.credit) || 0), 0);
  }, [myTimetable]);

  useEffect(() => {
    if (!campus) return;
    axios.get(`/${campus}_courses.json`).then(res => {
      // 💡 과목명 공백 제거 로직 포함
      const cleanedData = res.data.map(c => ({
        ...c,
        name: (c.name || '').replace(/\s+/g, '')
      }));
      setCourses(cleanedData);
      setFilteredCourses(cleanedData);
      setMyTimetable([]);
    }).catch(err => alert("데이터 로드 실패"));
  }, [campus]);

  // --- 필터링 로직 ---
  useEffect(() => {
    let result = courses;
    if (searchTerm) result = result.filter(c => c.name.includes(searchTerm) || c.professor.includes(searchTerm));
    if (selectedDept) result = result.filter(c => c.dept === selectedDept);
    if (selectedGrade) result = result.filter(c => String(c.grade) === selectedGrade);
    if (selectedCredit) result = result.filter(c => String(c.credit).includes(selectedCredit));
    if (selectedClassification) result = result.filter(c => c.classification === selectedClassification);

    if (selectedTimes.length > 0) {
      result = result.filter(c => selectedTimes.some(st => c.schedules.some(s => s.day === st.day && s.slots.includes(st.slot))));
    }
    setFilteredCourses(result);
  }, [searchTerm, selectedDept, selectedGrade, selectedCredit, selectedClassification, selectedTimes, courses]);

  // --- 💡 기능 핸들러: 저장 및 불러오기 ---
  const saveUserCourses = () => {
    if (!studentId) return alert("학번을 입력해주세요! 학번별로 저장됩니다.");
    if (myTimetable.length === 0) return alert("저장할 시간표가 비어있습니다.");

    const savedData = {
      campus: campus,
      courseIds: myTimetable.map(c => c.id)
    };
    localStorage.setItem(`timetable_${studentId}`, JSON.stringify(savedData));
    alert(`${studentId} 학번의 시간표가 브라우저에 저장되었습니다!`);
  };

  const loadUserCourses = () => {
    if (!studentId) return alert("불러올 시간표의 학번을 입력해주세요.");
    const saved = localStorage.getItem(`timetable_${studentId}`);

    if (saved) {
      const { campus: savedCampus, courseIds } = JSON.parse(saved);
      if (savedCampus !== campus) {
        return alert(`저장된 시간표는 ${savedCampus === 'seoul' ? '서울' : '천안'} 캠퍼스 데이터입니다. 캠퍼스를 변경해 주세요.`);
      }
      const restored = courses.filter(c => courseIds.includes(c.id));
      setMyTimetable(restored);
      alert("성공적으로 불러왔습니다!");
    } else {
      alert("해당 학번으로 저장된 내역이 없습니다.");
    }
  };

  const saveAsImage = async () => {
    if (!timetableRef.current) return;
    const canvas = await html2canvas(timetableRef.current, { backgroundColor: '#fff', scale: 2 });
    const link = document.createElement('a');
    link.download = `timetable_${studentId || 'result'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const formatScheduleDisplay = (course) => {
    if (!course.time_location) return "미정";
    const timeMatches = course.time_location.match(/[월화수목금토일][A-Ga-g\d,]+/g);
    return timeMatches ? timeMatches.join(' / ') : course.time_location.split('(')[0].trim();
  };

  const addCourse = (c) => {
    if (myTimetable.find(m => m.id === c.id)) return;
    if (!c.schedules || c.schedules.length === 0) return alert("시간 정보가 없습니다.");
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

  // --- UI 구성 ---
  if (!campus) {
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7f9' }}>
          <h1 style={{ color: '#1a237e', fontSize: '3rem', fontWeight: '900' }}>📅 Timetable</h1>
          <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
            <button onClick={() => setCampus('seoul')} style={{ padding: '20px 40px', background: '#3f51b5', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}>서울 캠퍼스</button>
            <button onClick={() => setCampus('cheonan')} style={{ padding: '20px 40px', background: '#ff5722', color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold' }}>천안 캠퍼스</button>
          </div>
        </div>
    );
  }

  return (
      <div style={{ padding: isMobile ? '10px' : '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <header style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button onClick={() => setCampus(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}>← 캠퍼스 변경</button>
          <div style={{ marginTop: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>
            현재 담은 학점: <span style={{ color: '#3f51b5' }}>{totalCredits}</span> / 21
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="학번 입력" value={studentId} onChange={(e) => setStudentId(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', width: isMobile ? '100%' : '150px' }} />
            <button onClick={loadUserCourses} style={{ padding: '10px 15px', background: '#3f51b5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>시간표 불러오기</button>
            <button onClick={saveUserCourses} style={{ padding: '10px 15px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>현재 시간표 저장</button>
            <button onClick={saveAsImage} style={{ padding: '10px 15px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>이미지로 저장</button>
          </div>
        </header>

        {/* 시간표 (13교시 포함) */}
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '20px', padding: '5px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '25px' }}>
          <div ref={timetableRef} style={{ width: '100%', minWidth: isMobile ? 'auto' : '700px', display: 'grid', gridTemplateColumns: isMobile ? '30px repeat(5, 1fr)' : '60px repeat(5, 1fr)', backgroundColor: 'white' }}>
            {['', '월', '화', '수', '목', '금'].map(d => <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold', fontSize: isMobile ? '10px' : '14px', borderBottom: '2px solid #eee' }}>{d}</div>)}
            {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(slot => (
                <React.Fragment key={slot}>
                  <div style={{ padding: '15px 0', textAlign: 'center', fontSize: '10px', color: '#999', borderBottom: '1px solid #f0f0f0' }}>{slot}</div>
                  {[0,1,2,3,4].map(day => {
                    const course = myTimetable.find(c => c.schedules.some(s => s.day === day && s.slots.includes(slot)));
                    return <div key={`${day}-${slot}`} onClick={() => course && removeCourse(course.id)} style={{ borderBottom: '1px solid #f0f0f0', borderLeft: '1px solid #f0f0f0', backgroundColor: course ? getCourseColor(course.id) : 'transparent', minHeight: isMobile ? '40px' : '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '8px' : '10px', textAlign: 'center', cursor: course ? 'pointer' : 'default', padding: '2px', lineHeight: '1.2' }}>
                      {course && <strong>{course.name}</strong>}
                    </div>
                  })}
                </React.Fragment>
            ))}
          </div>
        </div>

        {/* 필터 섹션 */}
        <section style={{ background: '#fff', padding: '15px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            <input type="text" placeholder="과목명/교수명" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">학과 전체</option>
              {[...new Set(courses.map(c => c.dept))].sort().map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={selectedClassification} onChange={(e) => setSelectedClassification(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">이수구분 전체</option>
              {[...new Set(courses.map(c => c.classification))].sort().map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <option value="">학년 전체</option>
              {[1,2,3,4].map(g => <option key={g} value={String(g)}>{g}학년</option>)}
            </select>
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>시간대 필터</button>
          </div>
        </section>

        {/* 강의 목록 (디자인 개선) */}
        <div style={{ maxHeight: '450px', overflowY: 'auto', background: 'white', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
            <tr style={{ fontSize: '13px' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>강의정보</th>
              <th style={{ width: '85px' }}>강의시간</th>
              <th style={{ width: '60px' }}>추가</th>
            </tr>
            </thead>
            <tbody>
            {filteredCourses.slice(0, 100).map(c => {
              const added = myTimetable.find(m => m.id === c.id);
              return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                        <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '5px' }}>[{c.classification}]</span>
                        {c.dept} | {c.professor} | {c.credit}학점
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '11px', color: '#3b82f6', fontWeight: 'bold' }}>
                      {formatScheduleDisplay(c)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px' }}>
                      <button onClick={() => added ? removeCourse(c.id) : addCourse(c)} style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: added ? '#fee2e2' : '#eff6ff', color: added ? '#ef4444' : '#2563eb', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>{added ? '취소' : '추가'}</button>
                    </td>
                  </tr>
              )
            })}
            </tbody>
          </table>
        </div>

        {/* 시간대 필터 모달 */}
        {isModalOpen && (
            <div style={{ position: 'fixed', top:0, left:0, width:'100%', height:'100%', backgroundColor:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex: 1000 }}>
              <div style={{ backgroundColor:'white', padding:'20px', borderRadius:'20px', width:'95%', maxWidth:'400px' }}>
                <h3 style={{ marginTop: 0 }}>🕒 시간대 직접 선택</h3>
                <div style={{ display:'grid', gridTemplateColumns:'30px repeat(5, 1fr)', gap:'4px', marginBottom:'20px' }}>
                  <div></div>{["월","화","수","목","금"].map(d => <div key={d} style={{textAlign:'center', fontWeight:'bold', fontSize: '12px'}}>{d}</div>)}
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(slot => (
                      <React.Fragment key={slot}>
                        <div style={{textAlign:'center', fontSize:'10px', color: '#999'}}>{slot}</div>
                        {[0,1,2,3,4].map(day => {
                          const active = selectedTimes.find(t => t.day === day && t.slot === slot);
                          return <div key={`${day}-${slot}`} onClick={() => {
                            const exists = selectedTimes.find(t => t.day === day && t.slot === slot);
                            if(exists) setSelectedTimes(selectedTimes.filter(t => !(t.day === day && t.slot === slot)));
                            else setSelectedTimes([...selectedTimes, {day, slot}]);
                          }} style={{ background: active ? '#4f46e5' : '#f0f0f0', height: '20px', borderRadius: '4px', cursor: 'pointer' }}></div>
                        })}
                      </React.Fragment>
                  ))}
                </div>
                <button onClick={() => setIsModalOpen(false)} style={{ width: '100%', padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>필터 적용 후 닫기</button>
              </div>
            </div>
        )}
      </div>
  );
}

export default App;