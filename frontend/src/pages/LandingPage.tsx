import { Link } from 'react-router-dom';
import { PrismHero } from '../components/ui/PrismHero';
import { HoverFooter } from '../components/ui/hover-footer';
import { Brain, Code, Users, BookOpen, MessageSquare, ArrowRight, BarChart } from 'lucide-react';

const FEATURES = [
  {
    icon: <Code className="w-6 h-6 text-brand-400" />,
    title: "Technical Interview",
    description: "Practice coding, algorithms, and system design questions with an AI that understands technical nuance."
  },
  {
    icon: <Users className="w-6 h-6 text-brand-400" />,
    title: "HR Interview",
    description: "Prepare for behavioral and situational questions to show your best professional self."
  },
  {
    icon: <BookOpen className="w-6 h-6 text-brand-400" />,
    title: "Learning Mentor",
    description: "Explore new concepts interactively through Socratic dialogue and guided learning."
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-brand-400" />,
    title: "Communication Coach",
    description: "Improve your clarity, fluency, and structure for any professional speaking engagement."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-card mx-4 mt-4 px-6 py-4 flex items-center justify-between border-surface-border">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="VoxMentor" className="w-8 h-8 rounded-lg object-contain" />
          <span className="text-xl font-bold tracking-tight text-white">VoxMentor</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-surface-muted">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#practice-modes" className="hover:text-white transition-colors">Practice Modes</a>
          <a href="#about" className="hover:text-white transition-colors">About</a>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-surface-muted hover:text-white transition-colors">Sign In</Link>
          <Link to="/session/new" className="btn-primary text-sm py-2 px-4 shadow-md shadow-brand-500/20 hidden md:block">Start Practicing</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="pt-24 md:pt-32">
        <PrismHero />

        {/* Section 1: Why VoxMentor? */}
        <section id="features" className="py-24 px-4 container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why VoxMentor?</h2>
            <p className="text-surface-muted">Experience the future of interview preparation and career coaching with our adaptive AI technology.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card p-6 border-surface-border/50 hover:border-brand-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-time voice</h3>
              <p className="text-surface-muted text-sm">Natural, ultra-low latency voice conversations that feel like talking to a real human.</p>
            </div>
            <div className="glass-card p-6 border-surface-border/50 hover:border-brand-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Adaptive AI mentor</h3>
              <p className="text-surface-muted text-sm">The AI adapts its difficulty and follow-up questions based on your real-time responses.</p>
            </div>
            <div className="glass-card p-6 border-surface-border/50 hover:border-brand-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Personalized evaluation</h3>
              <p className="text-surface-muted text-sm">Get detailed score breakdowns, strengths, and actionable feedback after every session.</p>
            </div>
            <div className="glass-card p-6 border-surface-border/50 hover:border-brand-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Progress tracking</h3>
              <p className="text-surface-muted text-sm">Monitor your improvement over time across different interview modes and difficulties.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Practice Modes */}
        <section id="practice-modes" className="py-24 px-4 bg-surface-card border-y border-surface-border">
          <div className="container mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Practice Modes</h2>
              <p className="text-surface-muted">Tailor your practice session to your specific career goals.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {FEATURES.map((feature, i) => (
                <div key={i} className="group relative glass-card p-8 border-surface-border hover:border-brand-500/50 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="mt-1 p-3 rounded-xl bg-brand-500/10 ring-1 ring-brand-500/20">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-surface-muted">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: How It Works */}
        <section id="how-it-works" className="py-24 px-4 container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-surface-muted">Four simple steps to mastering your communication skills.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative max-w-5xl mx-auto">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            {[
              { title: "Choose your goal", desc: "Select a mode, topic, and difficulty to match your career stage." },
              { title: "Talk with VoxMentor", desc: "Have a natural, real-time voice conversation with our AI." },
              { title: "Receive AI feedback", desc: "Get an immediate, structured evaluation of your actual performance." },
              { title: "Track your progress", desc: "Review past sessions and watch your scores improve over time." }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-surface-card border-2 border-brand-500 flex items-center justify-center text-xl font-bold text-brand-400 mb-6 shadow-lg shadow-brand-500/20">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-surface-muted text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 & 5: AI Assessment & Progress Tracking */}
        <section className="py-24 px-4 bg-gradient-to-b from-surface-card to-surface overflow-hidden">
          <div className="container mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-xs font-semibold uppercase tracking-wide">
                <span>AI Assessment</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Real feedback on your actual performance.</h2>
              <p className="text-surface-muted text-lg mb-8 leading-relaxed">
                VoxMentor doesn't just listen—it evaluates. After your conversation, the AI analyzes your actual responses to generate a structured assessment, highlighting your strengths and pinpointing exactly where you need to improve.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-surface-muted"><CheckCircle className="w-5 h-5 text-green-400" /> Mode-specific scoring metrics</li>
                <li className="flex items-center gap-3 text-surface-muted"><CheckCircle className="w-5 h-5 text-green-400" /> Actionable improvement recommendations</li>
                <li className="flex items-center gap-3 text-surface-muted"><CheckCircle className="w-5 h-5 text-green-400" /> Full conversation transcript review</li>
              </ul>
            </div>
            <div className="relative">
              {/* Illustrative UI Preview */}
              <div className="absolute -inset-4 bg-gradient-to-br from-brand-500/20 to-transparent blur-2xl rounded-[3rem]" />
              <div className="relative glass-card border-surface-border p-6 shadow-2xl overflow-hidden rounded-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  Illustrative Example
                </div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-white font-bold mb-1">Session Report</h4>
                    <p className="text-surface-muted text-xs">Technical Interview · Senior Backend</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-brand-400">88<span className="text-base text-surface-muted font-normal">/100</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-surface-muted">Technical Knowledge</span><span className="text-brand-400">92</span></div>
                    <div className="h-1.5 bg-surface-border rounded-full"><div className="h-full bg-brand-400 rounded-full w-[92%]" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-surface-muted">Communication</span><span className="text-brand-400">85</span></div>
                    <div className="h-1.5 bg-surface-border rounded-full"><div className="h-full bg-brand-400 rounded-full w-[85%]" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1"><span className="text-surface-muted">Answer Relevance</span><span className="text-brand-400">89</span></div>
                    <div className="h-1.5 bg-surface-border rounded-full"><div className="h-full bg-brand-400 rounded-full w-[89%]" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-4 relative text-center">
          <div className="absolute inset-0 bg-brand-900/20 blur-3xl rounded-full max-w-4xl mx-auto -z-10" />
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Ready to practice?</h2>
          <p className="text-xl text-surface-muted mb-10 max-w-2xl mx-auto">Start your next conversation with VoxMentor and build the confidence you need to succeed.</p>
          <Link to="/session/new" className="btn-primary text-xl px-12 py-5 shadow-xl shadow-brand-500/20">
            Start Practicing <ArrowRight className="inline ml-2 w-5 h-5" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <HoverFooter />
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
