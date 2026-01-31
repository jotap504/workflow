import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const PollsView = () => {
    const [polls, setPolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] });
    const { user } = useAuth();
    const [showCreate, setShowCreate] = useState(false);

    const fetchPolls = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/polls', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setPolls(await response.json());
            }
        } catch (error) {
            console.error(error);
            toast.error('Error cargando votaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolls();
    }, []);

    const handleCreatePoll = async (e) => {
        e.preventDefault();
        const validOptions = newPoll.options.filter(o => o.trim() !== '');
        if (validOptions.length < 2) return toast.warning('Se requieren al menos 2 opciones');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ question: newPoll.question, options: validOptions })
            });
            if (response.ok) {
                setNewPoll({ question: '', options: ['', ''] });
                setShowCreate(false);
                fetchPolls();
                toast.success('Encuesta creada');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al crear encuesta');
        }
    };

    const handleVote = async (pollId, optionId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/polls/${pollId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ option_id: optionId })
            });
            if (response.ok) {
                fetchPolls();
                toast.success('Voto registrado');
            } else {
                toast.error((await response.json()).error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al votar');
        }
    };

    const handleClosePoll = async (pollId) => {
        // Using confirm is still fine, or could use a custom modal. Sticking to confirm for speed.
        if (!confirm('¿Cerrar esta votación? Nadie más podrá votar.')) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/polls/${pollId}/close`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchPolls();
            toast.success('Votación cerrada');
        } catch (error) {
            console.error(error);
            toast.error('Error al cerrar votación');
        }
    };

    const addOption = () => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
    const updateOption = (idx, val) => {
        const newOptions = [...newPoll.options];
        newOptions[idx] = val;
        setNewPoll({ ...newPoll, options: newOptions });
    };

    if (loading) return <div>Cargando votaciones...</div>;

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Votaciones y Encuestas</h2>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
                    {showCreate ? 'Cancelar' : 'Nueva Votación'}
                </button>
            </div>

            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="glass-panel"
                        style={{ padding: '1.5rem', marginBottom: '2rem', overflow: 'hidden' }}
                    >
                        <h3>Crear Encuesta</h3>
                        <form onSubmit={handleCreatePoll} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Pregunta o Tema"
                                value={newPoll.question}
                                onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                                style={{ padding: '0.75rem', width: '100%' }}
                                required
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label>Opciones:</label>
                                {newPoll.options.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        placeholder={`Opción ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        style={{ padding: '0.5rem' }}
                                        required={idx < 2}
                                    />
                                ))}
                                <button type="button" onClick={addOption} style={{ width: 'fit-content', padding: '4px 8px', fontSize: '0.9em' }}>+ Agregar Opción</button>
                            </div>
                            <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Publicar Encuesta</button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                {polls.map(poll => {
                    const totalVotes = poll.total_votes || 0;
                    const isClosed = poll.status === 'closed';
                    const hasVoted = poll.user_has_voted > 0;
                    // Logic Update: Only show results if user HAS voted OR poll is closed. Creator must vote to see results.
                    const showResults = hasVoted || isClosed;

                    return (
                        <motion.div
                            key={poll.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass-panel"
                            style={{ padding: '1.5rem', position: 'relative', opacity: isClosed ? 0.8 : 1 }}
                        >
                            {isClosed && <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#e53e3e', color: 'white', fontSize: '0.7em', padding: '2px 6px', borderRadius: '4px' }}>CERRADA</div>}
                            <h4 style={{ marginBottom: '1rem', paddingRight: '2rem' }}>{poll.question}</h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {poll.options.map(opt => {
                                    const percent = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                                    return (
                                        <div key={opt.id} style={{ position: 'relative' }}>
                                            {showResults ? (
                                                // Result Bar
                                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', height: '30px', position: 'relative' }}>
                                                    <div style={{
                                                        width: `${percent}%`,
                                                        background: 'var(--primary-color)',
                                                        height: '100%',
                                                        opacity: 0.3,
                                                        transition: 'width 0.5s ease'
                                                    }}></div>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0, left: 0, width: '100%', height: '100%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '0 10px', fontSize: '0.9em'
                                                    }}>
                                                        <span>{opt.option_text}</span>
                                                        <span>{percent}% ({opt.vote_count})</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Voting Button
                                                <button
                                                    onClick={() => handleVote(poll.id, opt.id)}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'left',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        background: 'transparent',
                                                        border: '1px solid var(--card-border)',
                                                        cursor: 'pointer'
                                                    }}
                                                    className="hover-bg"
                                                >
                                                    {opt.option_text}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8em', opacity: 0.7 }}>
                                <span>Total votos: {totalVotes}</span>
                                <div>
                                    <span>Creado por: {poll.creator_name}</span>
                                    {poll.created_by === user?.id && !isClosed && (
                                        <button
                                            onClick={() => handleClosePoll(poll.id)}
                                            style={{ marginLeft: '10px', color: '#e53e3e', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Cerrar Votación
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
                {polls.length === 0 && <p>No hay votaciones activas.</p>}
            </div>
        </motion.div>
    );
};

export default PollsView;
