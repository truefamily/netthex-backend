import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { GroupProvider } from './context/GroupContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationToast from './components/NotificationToast'
import './App.css'

// Pages
import Auth from './pages/auth'
import Home from './pages/home'
import GroupDetail from './pages/group-detail'
import InvitePage from './pages/invite'
import MyGroupsPage from './pages/my-groups'
import Profile from './pages/user/profile'
import ProfilePhotoSetup from './pages/user/profile-photo'
import Inbox from './pages/direct/inbox'
import InvitationsPage from './pages/notifications/invitations'
import { isProfilePhotoSetupPending } from './utils/profilePhotoSetup'

const shouldRedirectToProfilePhotoSetup = (currentUser, userData) =>
  Boolean(currentUser) && isProfilePhotoSetupPending() && !userData?.avatar

// Composant pour les routes protégées
const ProtectedRoute = ({ children, allowPendingProfilePhoto = false }) => {
  const { currentUser, userData } = useAuth()
  const location = useLocation()
  const needsProfilePhoto = shouldRedirectToProfilePhotoSetup(currentUser, userData)
  const redirectTarget = location.state?.from || location

  if (currentUser && needsProfilePhoto && !allowPendingProfilePhoto && location.pathname !== '/user/profile/photo') {
    return <Navigate to="/user/profile/photo" replace state={{ from: redirectTarget }} />
  }

  return currentUser ? children : <Navigate to="/auth" replace state={{ from: location }} />
}

function AppRoutes() {
  const { currentUser, userData } = useAuth()
  const needsProfilePhoto = shouldRedirectToProfilePhotoSetup(currentUser, userData)

  return (
    <Routes>
      <Route
        path="/auth"
        element={!currentUser ? <Auth /> : <Navigate to={needsProfilePhoto ? '/user/profile/photo' : '/'} replace />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/group/:slug"
        element={
          <ProtectedRoute>
            <GroupDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invite/:code"
        element={
          <ProtectedRoute>
            <InvitePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mes-groupes"
        element={
          <ProtectedRoute>
            <MyGroupsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/profile/photo"
        element={
          <ProtectedRoute allowPendingProfilePhoto>
            <ProfilePhotoSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/direct/inbox"
        element={
          <ProtectedRoute>
            <Inbox />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/invitations"
        element={
          <ProtectedRoute>
            <InvitationsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/messages" element={<Navigate to="/direct/inbox" replace />} />
      <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
      <Route path="*" element={<Navigate to={needsProfilePhoto ? '/user/profile/photo' : '/'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <GroupProvider>
            <AppRoutes />
          </GroupProvider>
          <NotificationToast />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
