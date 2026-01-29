import { useState, useEffect } from 'react';

const CalendarView = () => {
    const [tasks, setTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('/api/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) setTasks(await response.json());
            } catch (error) {
                console.error(error);
            }
        };
        fetchTasks();
    }, []);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday

    const days = [];
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const getTasksForDay = (day) => {
        if (!day) return [];
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
    };

    const changeMonth = (offset) => {
        setCurrentDate(new Date(year, month + offset, 1));
    };

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    return (
        <div>
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => changeMonth(-1)}>◀ Prev</button>
                <h3>{monthNames[month]} {year}</h3>
                <button onClick={() => changeMonth(1)}>Next ▶</button>
            </div>

            <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--card-border)', padding: '1px' }}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} style={{ background: 'var(--card-bg)', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                        {day}
                    </div>
                ))}
                {days.map((day, index) => (
                    <div key={index} style={{
                        background: 'var(--bg-color)',
                        minHeight: '100px',
                        padding: '0.5rem',
                        opacity: day ? 1 : 0.5
                    }}>
                        {day && (
                            <>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{day}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {getTasksForDay(day).map(task => (
                                        <div key={task.id} style={{
                                            fontSize: '0.7em',
                                            background: task.category_color || '#ccc',
                                            color: 'white',
                                            padding: '2px 4px',
                                            borderRadius: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }} title={task.title}>
                                            {task.title}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarView;
