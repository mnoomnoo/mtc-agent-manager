import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import EditorPage from './pages/EditorPage'
import SettingsPage from './pages/SettingsPage'
import { Toaster } from './toaster'

export default function App() {
  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Navbar />
      <Box as="main" maxW="1200px" mx="auto" px={4} py={6}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/config-sets/:name" element={<EditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Box>
      <Toaster />
    </Box>
  )
}
