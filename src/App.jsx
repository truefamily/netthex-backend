import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { GroupProvider } from './context/GroupContext'
import { NotificationProvider } from './context/NotificationContext'
import NotificationToast from './components/NotificationToast'
import MainLayout from './layouts/MainLayout'
import './App.css'
import { auth } from './services/firebaseConfig'

// Pages
import Auth from './pages/auth'
import VerifyEmail from './pages/verify-email'
import Home from './pages/home'
import GroupDetail from './pages/group-detail'
import InvitePage from './pages/invite'
import MyGroupsPage from './pages/my-groups'
import Profile from './pages/user/profile'
import ProfilePhotoSetup from './pages/user/profile-photo'
import Inbox from './pages/direct/inbox'
import InvitationsPage from './pages/notifications/invitations'
import { isProfilePhotoSetupPending } from './utils/profilePhotoSetup'
import { buildProfilePath } from './utils/profileRoute'

const shouldRedirectToProfilePhotoSetup = (currentUser, userData) =>
  Boolean(currentUser?.emailVerified) && isProfilePhotoSetupPending() && !userData?.avatar

const needsEmailVerification = (currentUser) => Boolean(currentUser) && !currentUser.emailVerified

// Composant pour les routes protégées
const ProtectedRoute = ({ children, allowPendingProfilePhoto = false, layout = true }) => {
  const { currentUser, userData } = useAuth()
  const location = useLocation()
  const sessionUser = currentUser || auth.currentUser
  const emailVerificationPending = needsEmailVerification(sessionUser)
  const needsProfilePhoto = shouldRedirectToProfilePhotoSetup(sessionUser, userData)
  const redirectTarget = location.state?.from || location

  if (sessionUser && emailVerificationPending && location.pathname !== '/auth/verify-email') {
    return <Navigate to="/auth/verify-email" replace state={{ from: redirectTarget }} />
  }

  if (sessionUser && needsProfilePhoto && !allowPendingProfilePhoto && location.pathname !== '/user/profile/photo') {
    return <Navigate to="/user/profile/photo" replace state={{ from: redirectTarget }} />
  }

  if (!sessionUser) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  // Utiliser MainLayout pour les pages protégées
  if (layout) {
    return <MainLayout>{children}</MainLayout>
  }

  return children
}

function AppRoutes() {
  const { currentUser, userData } = useAuth()
  const sessionUser = currentUser || auth.currentUser
  const emailVerificationPending = needsEmailVerification(sessionUser)
  const needsProfilePhoto = shouldRedirectToProfilePhotoSetup(sessionUser, userData)

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          !sessionUser ? (
            <Auth />
          ) : (
            <Navigate to={emailVerificationPending ? '/auth/verify-email' : needsProfilePhoto ? '/user/profile/photo' : '/'} replace />
          )
        }
      />
      <Route
        path="/auth/verify-email"
        element={
          !sessionUser ? (
            <Navigate to="/auth" replace />
          ) : emailVerificationPending ? (
            <VerifyEmail />
          ) : (
            <Navigate to={needsProfilePhoto ? '/user/profile/photo' : '/'} replace />
          )
        }
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
          <ProtectedRoute layout={false}>
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
        path="/direct/t/message"
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
      <Route path="/profile" element={<Navigate to={buildProfilePath(sessionUser?.uid || userData?.uid)} replace />} />
      <Route
        path="*"
        element={<Navigate to={emailVerificationPending ? '/auth/verify-email' : needsProfilePhoto ? '/user/profile/photo' : '/'} replace />}
      />
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
