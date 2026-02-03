import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Zap, Shield, BarChart3, ChevronRight, Cpu, Layout, Wifi } from 'lucide-react';
import './qRPay.css';

const QRPayLanding = () => {
    const navigate = useNavigate();

    return (
        <div className="qr-landing">
            {/* Header */}
            <nav style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--qr-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--qr-primary)' }}>QRPay</span>
                </div>
                <button onClick={() => navigate('/login')} className="qr-btn" style={{ background: '#1a1a1a', color: 'white', padding: '6px 16px', fontSize: '0.8rem' }}>
                    Client Login
                </button>
            </nav>

            {/* Hero Section */}
            <section className="qr-hero">
                <span className="qr-badge">Next Generation Payment</span>
                <h1>
                    <span>Redefining</span>
                    QR Transactions
                </h1>
                <p>
                    Elegant hardware designed for seamless integration and effortless payments.
                </p>

                <div className="qr-mockup">
                    <img src="/C:/Users/user/.gemini/antigravity/brain/ab391284-63e1-41b0-af1e-e1d9ebe2b524/qr_device_mockup_1770122525172.png" alt="QR Pay Terminal" />
                </div>

                <div style={{ marginTop: '40px' }}>
                    <button onClick={() => navigate('/store')} className="qr-btn qr-btn-primary">
                        Get Your Device
                    </button>
                    <br />
                    <button className="qr-btn qr-btn-outline">
                        Explore Features
                    </button>
                </div>
            </section>

            {/* Features Section */}
            <section className="qr-section">
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h2 className="qr-section-title">Ecosystem Integration</h2>
                    <p style={{ color: '#888', marginTop: '-30px' }}>Built for the modern financial landscape</p>
                </div>

                <div className="qr-features">
                    <div className="qr-feature-card">
                        <div className="qr-feature-icon">
                            <Zap size={24} fill="currentColor" />
                        </div>
                        <h3>Instant Settlement</h3>
                        <p>Access your funds immediately. Seamless flow from customer scan to your account.</p>
                    </div>

                    <div className="qr-feature-card">
                        <div className="qr-feature-icon">
                            <Shield size={24} />
                        </div>
                        <h3>Bank-Grade Security</h3>
                        <p>Encryption processing with advanced anti-fraud protection powered by industry leaders.</p>
                    </div>

                    <div className="qr-feature-card">
                        <div className="qr-feature-icon">
                            <BarChart3 size={24} />
                        </div>
                        <h3>Real-time Analytics</h3>
                        <p>Track your sales performance with our minimalist management dashboards.</p>
                    </div>
                </div>
            </section>

            {/* Advanced Engineering Section */}
            <section className="qr-section" style={{ background: 'rgba(0, 163, 224, 0.02)' }}>
                <h2 className="qr-section-title">Advanced Engineering</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    {[
                        { icon: <Wifi size={20} />, label: 'CONNECTIVITY', value: 'Wi-Fi + 4G LTE' },
                        { icon: <Smartphone size={20} />, label: 'ENDURANCE', value: '12h Battery Life' },
                        { icon: <Layout size={20} />, label: 'DISPLAY', value: '2.4" High Res' },
                        { icon: <Cpu size={20} />, label: 'BIOMETRICS', value: 'Ultra Fast Scan' }
                    ].map((item, i) => (
                        <div key={i} style={{ padding: '30px', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <div style={{ color: '#94a3b8', marginBottom: '16px' }}>{item.icon}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '1px' }}>{item.label}</div>
                            <div style={{ fontWeight: '600', marginTop: '4px' }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer CTA */}
            <section className="qr-section" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '15px' }}>Begin Your Integration.</h2>
                <p style={{ color: '#666', marginBottom: '30px', fontSize: '0.85rem' }}>Join forward-thinking businesses upgrading their payment experience.</p>
                <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                    <input type="email" placeholder="Your work email" className="qr-input" />
                    <button className="qr-btn qr-btn-primary" style={{ width: '100%', background: '#1a1a1a' }}>
                        Request Consultation
                    </button>
                </div>
            </section>

            <footer style={{ padding: '40px 24px', borderTop: '1px solid #f1f5f9', marginTop: '60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={16} /> <span style={{ fontWeight: '700' }}>QRPay</span>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                        © 2024 Integrator Solutions. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default QRPayLanding;
