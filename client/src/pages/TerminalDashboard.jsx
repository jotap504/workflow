import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Bell, Settings, Filter, Plus, ChevronRight, User, Loader2, Layout, BarChart3, Wifi, WifiOff } from 'lucide-react';
import { getClient, subscribeToDevice } from '../services/mqttService';
import './qRPay.css';

const TerminalDashboard = () => {
    const navigate = useNavigate();
    const [deviceUids, setDeviceUids] = useState(['48290012TX']); // Default example
    const [deviceStatuses, setDeviceStatuses] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribes = deviceUids.map(uid => {
            return subscribeToDevice(
                uid,
                (status) => {
                    setDeviceStatuses(prev => ({ ...prev, [uid]: { ...prev[uid], status } }));
                },
                (state) => {
                    setDeviceStatuses(prev => ({ ...prev, [uid]: { ...prev[uid], ...state, status: 'online' } }));
                }
            );
        });

        return () => unsubscribes.forEach(unsub => unsub());
    }, [deviceUids]);

    const stats = {
        total: deviceUids.length,
        live: Object.values(deviceStatuses).filter(s => s.status === 'online').length,
        off: deviceUids.length - Object.values(deviceStatuses).filter(s => s.status === 'online').length
    };

    return (
        <div className="qr-dashboard">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={20} color="#94a3b8" />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '1px', fontWeight: '600' }}>DASHBOARD</span>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Terminals</h2>
                </div>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Filter size={20} color="#94a3b8" />
                </div>
            </header>

            <div className="qr-stats-grid">
                <div className="qr-stat-card">
                    <span className="qr-stat-label">TOTAL</span>
                    <span className="qr-stat-value">{stats.total}</span>
                </div>
                <div className="qr-stat-card">
                    <span className="qr-stat-label"><span style={{ color: '#22c55e' }}>●</span> LIVE</span>
                    <span className="qr-stat-value">{stats.live}</span>
                </div>
                <div className="qr-stat-card">
                    <span className="qr-stat-label"><span style={{ color: '#ef4444' }}>●</span> OFF</span>
                    <span className="qr-stat-value">{stats.off}</span>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Devices</h3>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={16} color="#94a3b8" />
                </div>
            </div>

            <div className="qr-device-list">
                {deviceUids.map((uid) => {
                    const info = deviceStatuses[uid] || { status: 'offline' };
                    const isOnline = info.status === 'online';

                    return (
                        <div
                            key={uid}
                            className="qr-device-card"
                            onClick={() => navigate(`/terminals/${uid}/config`)}
                        >
                            <div className="qr-device-info">
                                <div className="qr-device-icon" style={{ background: isOnline ? 'rgba(34, 197, 94, 0.1)' : '#f1f5f9' }}>
                                    <QrCode size={24} color={isOnline ? '#22c55e' : '#94a3b8'} />
                                </div>
                                <div>
                                    <span className="qr-device-name">{info.name || 'Terminal Unit'}</span>
                                    <span className="qr-device-id">ID: {uid} {info.rssi && `• RSSI: ${info.rssi}`}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span className={`qr-status-badge status-${isOnline ? 'online' : 'offline'}`}>
                                    {isOnline ? 'Online' : 'Offline'}
                                </span>
                                <ChevronRight size={20} color="#cbd5e1" />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="qr-btn" style={{
                width: '100%',
                background: '#0f172a',
                color: 'white',
                marginTop: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px',
                fontSize: '0.75rem'
            }}>
                <Plus size={20} /> REGISTER DEVICE
            </button>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Managed via <span style={{ color: '#1a1a1a', fontWeight: '600' }}>MercadoPago Cloud</span>
                </p>
            </div>

            {/* Bottom Nav */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                right: '20px',
                background: 'white',
                borderRadius: '30px',
                padding: '8px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
            }}>
                <div style={{ background: '#0f172a', color: 'white', padding: '12px', borderRadius: '16px' }}><Layout size={20} fill="currentColor" /></div>
                <div style={{ padding: '12px', color: '#94a3b8' }}><QrCode size={20} /></div>
                <div style={{ padding: '12px', color: '#94a3b8' }}><BarChart3 size={20} /></div>
                <div style={{ padding: '12px', color: '#94a3b8' }}><Settings size={20} /></div>
            </div>
        </div>
    );
};

export default TerminalDashboard;
