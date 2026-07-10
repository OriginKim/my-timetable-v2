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

  const pastelColors = useMemo(
      () => ['#FFD1DC', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#D4A5A5', '#97C1A9', '#A0E7E5', '#B28DFF'],
      []
  );
  const getCourseColor = (id) => pastelColors[(id || 0) % pastelColors.length];

  const totalCredits = useMemo(() => {
    return myTimetable.reduce((sum, c) => sum + (Number(c.credit) || 0), 0);
  }, [myTimetable]);

  // --- 데이터 로드 + 정제 ---
  useEffect(() => {
    if (!campus) return;

    axios
        .get(`/${campus}_courses.json`)
        .then((res) => {
          const cleanedData = res.data.map((c) => {
            let cleanName = (c.name || '').trim();
            // 한글 사이 공백 제거 (예: 캡스톤디 자인 -> 캡스톤디자인)
            cleanName = cleanName.replace(/([가-힣])\s([가-힣])/g, '$1$2');

            return {
              ...c,
              name: cleanName,
              dept: (c.dept || '').trim(),
              schedules: c.schedules || [], // 안정성
            };
          });

          setCourses(cleanedData);
          setFilteredCourses(cleanedData);
          setMyTimetable([]);
        })
        .catch((err) => {
          console.error(err);
          alert('데이터 로드 실패');
        });
  }, [campus]);

  // --- 필터링 로직 ---
  useEffect(() => {
    let result = courses;

    // 검색어 필터 (공백 제거 + 소문자)
    if (searchTerm) {
      const target = searchTerm.replace(/\s+/g, '').toLowerCase();
      result = result.filter(
          (c) =>
              (c.name || '').replace(/\s+/g, '').toLowerCase().includes(target) ||
              (c.professor || '').toLowerCase().includes(target)
      );
    }

    // 학과
    if (selectedDept) result = result.filter((c) => c.dept === selectedDept);

    // 학년: 해당 학년 + 공통(전체)
    if (selectedGrade) {
      result = result.filter((c) => String(c.grade) === selectedGrade || c.grade === '전체');
    }

    // 학점: 숫자 비교 (3.0 vs 3)
    if (selectedCredit) {
      result = result.filter((c) => Number(c.credit) === Number(selectedCredit));
    }

    // 이수구분
    if (selectedClassification) result = result.filter((c) => c.classification === selectedClassification);

    // 시간대 선택
    if (selectedTimes.length > 0) {
      result = result.filter((c) =>
          selectedTimes.some((st) =>
              (c.schedules || []).some((s) => s.day === st.day && (s.slots || []).includes(st.slot))
          )
      );
    }

    setFilteredCourses(result);
  }, [searchTerm, selectedDept, selectedGrade, selectedCredit, selectedClassification, selectedTimes, courses]);

  // --- 기능 핸들러 ---
  const saveUserCourses = () => {
    if (!studentId) return alert('학번을 입력해주세요!');
    if (myTimetable.length === 0) return alert('저장할 시간표가 비어있습니다.');
    const savedData = { campus, courseIds: myTimetable.map((c) => c.id) };
    localStorage.setItem(`timetable_${studentId}`, JSON.stringify(savedData));
    alert(`${studentId} 학번 저장 완료!`);
  };

  const loadUserCourses = () => {
    if (!studentId) return alert('학번을 입력해주세요.');
    const saved = localStorage.getItem(`timetable_${studentId}`);

    if (saved) {
      const { campus: savedCampus, courseIds } = JSON.parse(saved);
      if (savedCampus !== campus) return alert('캠퍼스 설정이 다릅니다.');
      setMyTimetable(courses.filter((c) => courseIds.includes(c.id)));
      alert('시간표를 불러왔습니다!');
    } else {
      alert('저장 내역이 없습니다.');
    }
  };

  const saveAsImage = async () => {
    if (!timetableRef.current) return;
    const canvas = await html2canvas(timetableRef.current, { backgroundColor: '#fff', scale: 2 });
    const link = document.createElement('a');
    link.download = `smu_timetable_${studentId || 'guest'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const addCourse = (c) => {
    if (myTimetable.find((m) => m.id === c.id)) return;

    // 시간 정보 없는 과목 방지
    if (!c.schedules || c.schedules.length === 0) return alert('시간 정보가 없는 과목입니다.');

    let conflict = false;
    myTimetable.forEach((ex) => {
      (c.schedules || []).forEach((ns) => {
        (ex.schedules || []).forEach((es) => {
          const nsSlots = ns?.slots || [];
          const esSlots = es?.slots || [];
          if (ns.day === es.day && nsSlots.some((s) => esSlots.includes(s))) conflict = true;
        });
      });
    });

    if (conflict) return alert('이미 담은 강의와 시간이 겹칩니다!');
    setMyTimetable([...myTimetable, c]);
  };

  const removeCourse = (id) => setMyTimetable(myTimetable.filter((c) => c.id !== id));

  // --- UI ---
  if (!campus) {
    return (
        <div
            style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f4f7f9',
            }}
        >
          <h1 style={{ color: '#1a237e', fontSize: '2.5rem', fontWeight: '900' }}>📅 상명대 시간표 초안기</h1>
          <p style={{ color: '#666', marginTop: '10px' }}>에브리타임 업데이트 전, 미리 짜보세요!</p>
          <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
            <button
                onClick={() => setCampus('seoul')}
                style={{
                  padding: '15px 30px',
                  background: '#3f51b5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
            >
              서울 캠퍼스
            </button>
            <button
                onClick={() => setCampus('cheonan')}
                style={{
                  padding: '15px 30px',
                  background: '#ff5722',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
            >
              천안 캠퍼스
            </button>
          </div>
        </div>
    );
  }

  return (
      <div style={{ padding: isMobile ? '10px' : '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Pretendard, sans-serif' }}>
        <header style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
              onClick={() => setCampus(null)}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← 캠퍼스 변경
          </button>

          <div style={{ marginTop: '10px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            현재 담은 학점: <span style={{ color: '#3f51b5' }}>{totalCredits}</span> / 21
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
            <input
                type="text"
                placeholder="학번 입력"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  width: isMobile ? '100px' : '130px',
                }}
            />
            <button
                onClick={loadUserCourses}
                style={{ padding: '10px 12px', background: '#3f51b5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              불러오기
            </button>
            <button
                onClick={saveUserCourses}
                style={{ padding: '10px 12px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              저장
            </button>
            <button
                onClick={saveAsImage}
                style={{ padding: '10px 12px', background: '#000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
            >
              이미지 추출
            </button>
          </div>
        </header>

        {/* 시간표 (모바일 가로 스크롤 문제 해결: minWidth 제거/축소) */}
        <div
            style={{
              overflowX: 'auto',
              background: 'white',
              borderRadius: '15px',
              padding: '10px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              marginBottom: '20px',
            }}
        >
          <div
              ref={timetableRef}
              style={{
                width: '100%',
                minWidth: isMobile ? 'auto' : '600px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '30px repeat(5, 1fr)' : '50px repeat(5, 1fr)',
                backgroundColor: 'white',
              }}
          >
            {['', '월', '화', '수', '목', '금'].map((d) => (
                <div
                    key={d}
                    style={{
                      padding: '10px 0',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: isMobile ? '12px' : '13px',
                      background: '#f1f5f9',
                      borderBottom: '1px solid #ddd',
                    }}
                >
                  {d}
                </div>
            ))}

            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((slot) => (
                <React.Fragment key={slot}>
                  <div
                      style={{
                        padding: '12px 0',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#999',
                        borderBottom: '1px solid #eee',
                      }}
                  >
                    {slot}
                  </div>

                  {[0, 1, 2, 3, 4].map((day) => {
                    const course = myTimetable.find((c) =>
                        (c.schedules || []).some((s) => s.day === day && (s.slots || []).includes(slot))
                    );

                    return (
                        <div
                            key={`${day}-${slot}`}
                            onClick={() => course && removeCourse(course.id)}
                            style={{
                              borderBottom: '1px solid #eee',
                              borderLeft: '1px solid #eee',
                              backgroundColor: course ? getCourseColor(course.id) : 'transparent',
                              minHeight: isMobile ? '42px' : '45px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: isMobile ? '8px' : '9px',
                              textAlign: 'center',
                              cursor: course ? 'pointer' : 'default',
                              padding: '2px',
                              lineHeight: 1.15,
                              wordBreak: 'keep-all',
                            }}
                        >
                          {course && <strong>{course.name}</strong>}
                        </div>
                    );
                  })}
                </React.Fragment>
            ))}
          </div>
        </div>

        {/* 필터 섹션 */}
        <section style={{ background: '#fff', padding: '15px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
            <input
                type="text"
                placeholder="과목/교수 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}
            />

            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
              <option value="">학과 전체</option>
              {[...new Set(courses.map((c) => c.dept))]
                  .filter((d) => d && d !== '공통/기타')
                  .sort()
                  .map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                  ))}
            </select>

            <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}
            >
              <option value="">이수구분 전체</option>
              {[...new Set(courses.map((c) => c.classification))]
                  .filter(Boolean)
                  .sort()
                  .map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                  ))}
            </select>

            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
              <option value="">학년 전체</option>
              {[1, 2, 3, 4].map((g) => (
                  <option key={g} value={String(g)}>
                    {g}학년
                  </option>
              ))}
              <option value="전체">공통</option>
            </select>

            <select value={selectedCredit} onChange={(e) => setSelectedCredit(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
              <option value="">학점 전체</option>
              {[1, 2, 3, 4].map((val) => (
                  <option key={val} value={String(val)}>
                    {val}학점
                  </option>
              ))}
            </select>

            <button
                onClick={() => setIsModalOpen(true)}
                style={{ padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              시간 필터
            </button>
          </div>
        </section>

        {/* 강의 목록 */}
        <div style={{ maxHeight: '500px', overflowY: 'auto', background: 'white', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
            <tr style={{ fontSize: '13px', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '15px', textAlign: 'left' }}>강의 정보 ({filteredCourses.length}건)</th>
              <th style={{ width: '100px' }}>시간</th>
              <th style={{ width: '70px' }}>추가</th>
            </tr>
            </thead>

            <tbody>
            {filteredCourses.map((c) => {
              const added = myTimetable.find((m) => m.id === c.id);

              return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 15px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <span style={{ color: '#ef4444', fontWeight: 'bold', marginRight: '6px' }}>[{c.classification}]</span>
                        {c.dept} • {c.professor} • {Number(c.credit).toFixed(1)}학점
                        {c.grade !== undefined && c.grade !== null ? ` • ${c.grade !== '전체' ? `${c.grade}학년` : '공통'}` : ''}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', fontSize: '10px', color: '#3b82f6', fontWeight: '600' }}>{c.time_location}</td>

                    <td style={{ textAlign: 'center', padding: '10px' }}>
                      <button
                          onClick={() => (added ? removeCourse(c.id) : addCourse(c))}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: added ? '#fee2e2' : '#eff6ff',
                            color: added ? '#ef4444' : '#2563eb',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                      >
                        {added ? '취소' : '추가'}
                      </button>
                    </td>
                  </tr>
              );
            })}
            </tbody>
          </table>
        </div>

        {/* 시간 필터 모달 */}
        {isModalOpen && (
            <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1000,
                }}
            >
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', width: '95%', maxWidth: '420px' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>🕒 시간대 선택</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '30px repeat(5, 1fr)', gap: '5px', marginBottom: '25px' }}>
                  <div></div>
                  {['월', '화', '수', '목', '금'].map((d) => (
                      <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: '#475569' }}>
                        {d}
                      </div>
                  ))}

                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((slot) => (
                      <React.Fragment key={slot}>
                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>{slot}</div>

                        {[0, 1, 2, 3, 4].map((day) => {
                          const active = selectedTimes.find((t) => t.day === day && t.slot === slot);

                          return (
                              <div
                                  key={`${day}-${slot}`}
                                  onClick={() => {
                                    const exists = selectedTimes.find((t) => t.day === day && t.slot === slot);
                                    if (exists) setSelectedTimes(selectedTimes.filter((t) => !(t.day === day && t.slot === slot)));
                                    else setSelectedTimes([...selectedTimes, { day, slot }]);
                                  }}
                                  style={{
                                    background: active ? '#4f46e5' : '#f1f5f9',
                                    height: '22px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: '1px solid #eee',
                                  }}
                              ></div>
                          );
                        })}
                      </React.Fragment>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                      onClick={() => setSelectedTimes([])}
                      style={{ flex: 1, padding: '14px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    전체 지우기
                  </button>
                  <button
                      onClick={() => setIsModalOpen(false)}
                      style={{ flex: 2, padding: '14px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    필터 적용 완료
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

export default App;
