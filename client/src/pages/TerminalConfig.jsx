import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Save, RotateCcw, Microscope, Loader2, Send } from 'lucide-react';
import { publishSettings, subscribeToDevice, sendCommand } from '../services/mqttService';
import { toast } from 'sonner';
import './qRPay.css';

const TerminalConfig = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('offline');

    const [settings, setSettings] = useState({
        devName: 'Terminal X1',
        vol: 70,
        bright: 85,
        autoUpdate: true,
        user: 'admin',
        pass: '',
        mpToken: '••••••••••••••••',
        wifiSsid: 'Your_WiFi',
        wifiPass: '**********',
        mode: 0,
        price: 1500,
        pulseDur: 500,
        storeId: 'ST-99201',
        posId: 'POS-01',
        sandboxMode: false
    });

    useEffect(() => {
        if (!id) return;

        // Subscribe to state updates to populate current settings if device is online
        const unsubscribe = subscribeToDevice(
            id,
            (newStatus) => setStatus(newStatus),
            (state) => {
                setStatus('online');
                if (state.mode !== undefined) setSettings(prev => ({ ...prev, mode: state.mode }));
            }
        );

        return () => unsubscribe();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            publishSettings(id, settings);
            toast.success("Configuration published to device via MQTT");
        } catch (error) {
            toast.error("Failed to send MQTT command");
        } finally {
            setTimeout(() => setSaving(false), 1000);
        }
    };

    const handleAction = (cmd, val = "") => {
        sendCommand(id, cmd, val);
        toast.info(`Command ${cmd} sent`);
    };

    return (
        <div className="qr-dashboard">
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                padding: '0 10px'
            }}>
                <button
                    onClick={() => navigate('/terminals')}
                    style={{ background: 'transparent', display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '500' }}
                >
                    <ChevronLeft size={20} /> Settings
                </button>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Configuration</h2>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    style={{ background: 'transparent', color: '#3b82f6', fontWeight: '600', opacity: (saving || loading) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save'}
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px' }}>
                    <Loader2 className="animate-spin" size={48} color="var(--qr-primary)" />
                    <p style={{ marginTop: '16px', color: '#94a3b8' }}>Loading settings...</p>
                </div>
            ) : (
                <>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#00796b', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/C:/Users/user/.gemini/antigravity/brain/ab391284-63e1-41b0-af1e-e1d9ebe2b524/qr_device_mockup_1770122525172.png" style={{ width: '40px', borderRadius: '4px' }} alt="" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{settings.devName}</h3>
                            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {id} • {status === 'online' ? 'Online' : 'Offline'}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                <div style={{ width: '12px', height: '6px', background: '#22c55e', borderRadius: '2px' }}></div>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>92% Charged</span>
                            </div>
                        </div>
                    </div>

                    <div className="qr-config-group">
                        <h4>DEVICE</h4>
                        <div style={{ background: 'white', borderRadius: '20px', padding: '4px 20px' }}>
                            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div className="qr-control-row">
                                    <span className="qr-control-label">Alert Volume</span>
                                    <span className="qr-control-value">{settings.vol}%</span>
                                </div>
                                <input
                                    type="range"
                                    className="qr-slider"
                                    value={settings.vol}
                                    onChange={e => setSettings({ ...settings, vol: e.target.value })}
                                />
                            </div>
                            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div className="qr-control-row">
                                    <span className="qr-control-label">Screen Brightness</span>
                                    <span className="qr-control-value">{settings.bright}%</span>
                                </div>
                                <input
                                    type="range"
                                    className="qr-slider"
                                    value={settings.bright}
                                    onChange={e => setSettings({ ...settings, bright: e.target.value })}
                                />
                            </div>
                            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <div className="qr-control-row">
                                    <span className="qr-control-label">Price Per Unit</span>
                                    <input
                                        type="number"
                                        className="qr-input"
                                        style={{ width: '100px', margin: 0, textAlign: 'right' }}
                                        value={settings.price}
                                        onChange={e => setSettings({ ...settings, price: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="qr-config-group">
                        <h4>CREDENTIALS</h4>
                        <div style={{ background: 'white', borderRadius: '20px', padding: '4px 20px' }}>
                            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span className="qr-control-label" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>MercadoPago Token</span>
                                <input
                                    type="password"
                                    className="qr-input"
                                    value={settings.mpToken}
                                    onChange={e => setSettings({ ...settings, mpToken: e.target.value })}
                                />
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <span className="qr-control-label" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Admin Password (will be hashed)</span>
                                <input
                                    type="password"
                                    className="qr-input"
                                    placeholder="Enter new password"
                                    value={settings.pass}
                                    onChange={e => setSettings({ ...settings, pass: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="qr-config-group">
                        <h4>WIFI SETUP</h4>
                        <div style={{ background: 'white', borderRadius: '20px', padding: '4px 20px' }}>
                            <div style={{ padding: '20px 0', borderBottom: '1px solid #f1f5f9' }}>
                                <span className="qr-control-label" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>SSID</span>
                                <input
                                    type="text"
                                    className="qr-input"
                                    value={settings.wifiSsid}
                                    onChange={e => setSettings({ ...settings, wifiSsid: e.target.value })}
                                />
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <span className="qr-control-label" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Password</span>
                                <input
                                    type="password"
                                    className="qr-input"
                                    value={settings.wifiPass}
                                    onChange={e => setSettings({ ...settings, wifiPass: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="qr-config-group">
                        <h4>PAYMENT PROVIDER</h4>
                        <div style={{ background: 'white', borderRadius: '20px', padding: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Store ID</span>
                                    <input
                                        type="text"
                                        className="qr-input"
                                        style={{ margin: 0 }}
                                        value={settings.storeId}
                                        onChange={e => setSettings({ ...settings, storeId: e.target.value })}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>POS ID</span>
                                    <input
                                        type="text"
                                        className="qr-input"
                                        style={{ margin: 0 }}
                                        value={settings.posId}
                                        onChange={e => setSettings({ ...settings, posId: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="qr-control-row">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Microscope size={18} color="#3b82f6" />
                                    <span className="qr-control-label">Sandbox Mode</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.sandboxMode}
                                    onChange={e => setSettings({ ...settings, sandboxMode: e.target.checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        className="qr-btn"
                        onClick={() => handleAction('reset')}
                        style={{ background: 'white', color: '#3b82f6', width: '100%', marginBottom: '12px', border: '1px solid #f1f5f9' }}
                    >
                        Restart Device
                    </button>

                    <button
                        className="qr-btn"
                        onClick={() => handleAction('check_update')}
                        style={{ background: 'white', color: '#3b82f6', width: '100%', marginBottom: '48px', border: '1px solid #f1f5f9' }}
                    >
                        Check for Updates
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <button style={{ color: '#ef4444', background: 'transparent', fontWeight: '600' }}>Factory Reset Device</button>
                        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '16px' }}>Firmware Version: 2.4.1-build-88</p>
                        <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>© 2024 Integrator Solutions</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default TerminalConfig;
