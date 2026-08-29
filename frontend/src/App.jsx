import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'

import { AuthBootstrap } from '@/components/AuthBootstrap'
import CcLayout from '@/components/layout/CcLayout'
import CgLayout from '@/components/layout/CgLayout'
import JeuneLayout from '@/components/layout/JeuneLayout'
import { GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute'
import { TooltipProvider } from '@/components/ui/tooltip'
import { env } from '@/config/env'
import { AuthProvider } from '@/context/AuthContext'
import Accueil from '@/pages/Accueil'
import Contact from '@/pages/Contact'
import Login from '@/pages/auth/Login'
import OAuthCallback from '@/pages/auth/OAuthCallback'
import PendingValidation from '@/pages/auth/PendingValidation'
import Register from '@/pages/auth/Register'
import CcDashboard from '@/pages/cc/Dashboard'
import CcEvaluations from '@/pages/cc/Evaluations'
import CcFormation from '@/pages/cc/Formation'
import CcGenieRoute from '@/pages/cc/GenieRoute'
import CcJeunes from '@/pages/cc/Jeunes'
import CcPresences from '@/pages/cc/Presences'
import CgChefs from '@/pages/cg/Chefs'
import CgContenus from '@/pages/cg/Contenus'
import CgDashboard from '@/pages/cg/Dashboard'
import CgFormations from '@/pages/cg/Formations'
import CgJeunes from '@/pages/cg/Jeunes'
import CgJournal from '@/pages/cg/Journal'
import JeuneBrevets from '@/pages/jeune/Brevets'
import JeuneCompte from '@/pages/jeune/Compte'
import JeuneEvaluation from '@/pages/jeune/Evaluation'
import JeuneFormation from '@/pages/jeune/Formation'
import JeuneGenieRoute from '@/pages/jeune/GenieRoute'
import JeuneHome from '@/pages/jeune/Home'
import JeunePlacement from '@/pages/jeune/Placement'
import JeuneQuiz from '@/pages/jeune/Quiz'

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/attente-validation" element={<PendingValidation />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route element={<GuestRoute />}>
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute roles={['JEUNE']} />}>
          <Route path="/jeune/placement" element={<JeunePlacement />} />
          <Route path="/jeune" element={<JeuneLayout />}>
            <Route index element={<JeuneHome />} />
            <Route path="formation" element={<JeuneFormation />} />
            <Route path="quiz" element={<JeuneQuiz />} />
            <Route path="genie-route" element={<JeuneGenieRoute />} />
            <Route path="evaluation" element={<JeuneEvaluation />} />
            <Route path="brevets" element={<JeuneBrevets />} />
            <Route path="compte" element={<JeuneCompte />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['CC']} />}>
          <Route path="/cc" element={<CcLayout />}>
            <Route index element={<CcDashboard />} />
            <Route path="jeunes" element={<CcJeunes />} />
            <Route path="formation" element={<CcFormation />} />
            <Route path="evaluations" element={<CcEvaluations />} />
            <Route path="genie-route" element={<CcGenieRoute />} />
            <Route path="presences" element={<CcPresences />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['CG']} />}>
          <Route path="/cg" element={<CgLayout />}>
            <Route index element={<CgDashboard />} />
            <Route path="chefs" element={<CgChefs />} />
            <Route path="formations" element={<CgFormations />} />
            <Route path="jeunes" element={<CgJeunes />} />
            <Route path="contenus" element={<CgContenus />} />
            <Route path="journal" element={<CgJournal />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  const tree = (
    <AuthProvider>
      <AuthBootstrap>
        <TooltipProvider>
          <AppRoutes />
        </TooltipProvider>
      </AuthBootstrap>
    </AuthProvider>
  )

  if (env.googleClientId) {
    return (
      <GoogleOAuthProvider clientId={env.googleClientId}>{tree}</GoogleOAuthProvider>
    )
  }

  return tree
}
