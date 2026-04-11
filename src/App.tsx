import Navbar from './components/Navbar'
import ChatBox from './components/ChatBox'

function App() {
  return (
    <div className="min-h-screen w-full bg-deep-obsidian relative overflow-hidden selection:bg-electric-cyan selection:text-deep-obsidian">
      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 bg-grid-hashgraph pointer-events-none z-0 opacity-40"></div>
      
      {/* Decorative Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-electric-cyan/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-hedara-purple/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-screen">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          <ChatBox />
        </main>
      </div>
    </div>
  )
}

export default App
