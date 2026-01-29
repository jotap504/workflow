import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20%' }}>Loading...</div>;
    }

    return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
