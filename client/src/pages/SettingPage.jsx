import { Check, MessageCircle, Palette, ShieldCheck, Sparkles } from 'lucide-react'

const SettingPage = () => (
  <main className='content-page'>
    <div className='page-title'>
      <span className='eyebrow'>MAKE IT YOURS</span>
      <h1>Settings</h1>
      <p>A few details about your Bluechat experience.</p>
    </div>
    <section className='settings-card'>
      <div className='settings-section-heading'><div className='settings-icon'><Palette size={19} /></div><div><h2>Appearance</h2><p>Choose a look that feels like you.</p></div></div>
      <div className='theme-choice selected-theme'>
        <div className='theme-swatch'><span /><span /><span /></div>
        <div className='theme-copy'><strong>Midnight blue</strong><span>Deep navy with a calm blue glow</span></div>
        <div className='theme-check'><Check size={15} /></div>
      </div>
      <div className='theme-choice theme-disabled'>
        <div className='theme-swatch light-swatch'><span /><span /><span /></div>
        <div className='theme-copy'><strong>Cloud light</strong><span>A bright theme, coming soon</span></div>
        <span className='coming-soon'>SOON</span>
      </div>
    </section>
    <section className='settings-card'>
      <div className='settings-section-heading'><div className='settings-icon'><ShieldCheck size={19} /></div><div><h2>Your privacy</h2><p>Designed to keep your conversations personal.</p></div></div>
      <div className='privacy-row'><div><strong>Signed-in access</strong><span>Your account is required to access your message history.</span></div><span className='privacy-on'><Check size={14} /> ON</span></div>
      <div className='privacy-row'><div><strong>Session cookie</strong><span>Your sign-in uses an http-only cookie.</span></div><span className='privacy-on'><Check size={14} /> ON</span></div>
    </section>
    <div className='settings-note'><Sparkles size={16} /><span>We’re keeping Bluechat simple on purpose. More ways to make it yours are on the way.</span></div>
    <footer className='page-footer'><MessageCircle size={15} /> bluechat <span>·</span> A little more connected.</footer>
  </main>
)

export default SettingPage
