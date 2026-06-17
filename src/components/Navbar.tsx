'use client'
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Rocket, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => { window.removeEventListener('scroll', onScroll); sub.subscription.unsubscribe() }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMobileOpen(false)
    navigate('/')
  }

  const navLinks = [
    { to: '/explore', label: 'Explore' },
    { to: '/create', label: 'Create' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          transition: 'background 0.3s, box-shadow 0.3s',
        }}
        className={scrolled ? 'navbar-glass' : ''}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="btn-gradient">
              <Rocket size={17} color="white" />
            </div>
            <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 19, color: '#1e1b4b', letterSpacing: '-0.5px' }}>
              Laun<span className="gradient-text">chio</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hide-mobile" style={{ display: 'flex', gap: 4, flex: 1 }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} style={{
                padding: '7px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                color: location.pathname === link.to ? '#8b5cf6' : '#4c4879',
                background: location.pathname === link.to ? '#f5f3ff' : 'transparent',
                transition: 'all 0.2s',
              }}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user ? (
              <>
                <Link to="/dashboard" style={{ padding: '7px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#8b5cf6', background: '#f5f3ff', transition: 'all 0.2s' }}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} style={{ padding: '7px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#4c4879', transition: 'all 0.2s' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ padding: '7px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#4c4879' }}>
                  Login
                </Link>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/signup" style={{ padding: '9px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700 }} className="btn-gradient">
                    Get Started
                  </Link>
                </motion.div>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="hide-desktop" onClick={() => setMobileOpen(v => !v)}
            style={{ padding: 8, borderRadius: 10, color: '#4c4879', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)',
              borderBottom: '1px solid rgba(139,92,246,0.12)',
              padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#4c4879', transition: 'all 0.2s' }}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#8b5cf6', background: '#f5f3ff' }}>
                  Dashboard
                </Link>
                <button onClick={handleLogout} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#4c4879', textAlign: 'left' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} style={{ padding: '12px 16px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#4c4879' }}>Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} style={{ padding: '14px 16px', borderRadius: 12, fontSize: 15, fontWeight: 700, textAlign: 'center' }} className="btn-gradient">Get Started Free</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
