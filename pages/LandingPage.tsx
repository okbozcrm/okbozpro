
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Users, DollarSign, MapPin, Shield, Zap, 
  ArrowRight, Menu, X, Hexagon, BarChart3, PieChart, Activity, Globe,
  Play, Layers, ChevronRight, Layout, BrainCircuit, Rocket
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = [
    {
      name: 'Starter',
      price: billingCycle === 'monthly' ? '0' : '0',
      description: 'Perfect for small teams getting started.',
      features: ['Up to 5 Employees', 'Basic Attendance Tracking', '1 Branch Location', '30 Days Data Retention'],
      buttonText: 'Start Free',
      highlight: false
    },
    {
      name: 'Professional',
      price: billingCycle === 'monthly' ? '2,999' : '2,499',
      description: 'For growing businesses needing efficiency.',
      features: ['Up to 50 Employees', 'Automated Payroll', '5 Branch Locations', 'Unlimited History', 'Email & SMS Alerts', 'AI Assistant'],
      buttonText: 'Start Trial',
      highlight: true
    },
    {
      name: 'Business',
      price: billingCycle === 'monthly' ? '12,999' : '9,999',
      description: 'Scale your operations without limits.',
      features: ['Unlimited Employees', 'Dedicated Account Manager', 'Unlimited Branches', 'API Access', 'Custom Reports', 'Priority Support'],
      buttonText: 'Contact Sales',
      highlight: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-purple-200 selection:text-purple-900 overflow-x-hidden">
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-fuchsia-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[100px] mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      {/* Navbar */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-purple-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Hexagon className="w-6 h-6 fill-white/20 stroke-white" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-fuchsia-600 tracking-tight">OK BOZ</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#analysis" className="text-sm font-semibold text-slate-600 hover:text-violet-600 transition-colors">Analysis</a>
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-violet-600 transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-violet-600 transition-colors">Pricing</a>
              <button 
                onClick={() => navigate('/login')}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all hover:scale-105 hover:bg-slate-800 shadow-md"
              >
                Login
              </button>
            </div>

            <button 
              className="md:hidden p-2 text-slate-600 hover:text-violet-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-purple-100 absolute w-full px-4 py-6 shadow-xl flex flex-col gap-4">
             <a href="#analysis" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600">Analysis</a>
             <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600">Features</a>
             <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600">Pricing</a>
             <button 
                onClick={() => navigate('/login')}
                className="bg-violet-600 text-white px-5 py-3 rounded-lg font-bold w-full shadow-lg shadow-violet-200"
              >
                Login to Dashboard
              </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-sm font-bold mb-8 animate-in fade-in slide-in-from-top-4 duration-700 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></span>
              AI-Powered Workforce OS
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              Transform Your Business <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
                with Intelligent Analysis.
              </span>
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              OK BOZ doesn't just manage staff; it analyzes performance, optimizes payroll, and predicts growth. The only CRM built for the modern franchise.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <button 
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-bold text-lg shadow-xl shadow-violet-500/30 transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-sm">
                 <Play className="w-5 h-5 fill-slate-700" /> Watch Demo
              </button>
            </div>

            {/* Hero Image Mockup */}
            <div className="mt-20 relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 group">
               <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 h-32 bottom-0"></div>
               <div className="relative rounded-3xl border-8 border-white bg-slate-900 shadow-2xl shadow-purple-900/10 max-w-5xl mx-auto overflow-hidden transform group-hover:scale-[1.01] transition-transform duration-700">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2400&q=80" 
                    alt="OK BOZ Dashboard Analytics" 
                    className="w-full h-auto object-cover opacity-90"
                  />
                  
                  {/* Floating Analytics Card 1 */}
                  <div className="absolute -right-6 top-10 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 hidden lg:block animate-bounce delay-700 max-w-xs">
                      <div className="flex items-center gap-3 mb-2">
                          <div className="bg-green-100 p-2 rounded-xl">
                              <DollarSign className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Revenue Analysis</p>
                              <p className="text-slate-900 font-bold text-lg">₹ 12,45,000</p>
                          </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-green-500 h-full w-[75%] rounded-full"></div>
                      </div>
                      <p className="text-xs text-green-600 mt-1 font-bold">+15% vs last month</p>
                  </div>

                  {/* Floating Analytics Card 2 */}
                  <div className="absolute -left-6 bottom-20 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 hidden lg:block animate-bounce delay-1000 max-w-xs">
                      <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-xl">
                              <BrainCircuit className="w-6 h-6 text-purple-600" />
                          </div>
                          <div>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Insights</p>
                              <p className="text-slate-900 font-bold text-sm">Staff Efficiency: <span className="text-purple-600">High</span></p>
                          </div>
                      </div>
                  </div>
               </div>
            </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-10 border-y border-slate-200 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">Trusted by modern enterprises</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Simple Text Logos for Demo */}
             <h3 className="text-2xl font-black text-slate-800">AcmeCorp</h3>
             <h3 className="text-2xl font-black text-slate-800">GlobalTech</h3>
             <h3 className="text-2xl font-black text-slate-800">Nebula</h3>
             <h3 className="text-2xl font-black text-slate-800">FoxRun</h3>
             <h3 className="text-2xl font-black text-slate-800">Circle</h3>
          </div>
        </div>
      </section>

      {/* ANALYSIS SECTION (New Request) */}
      <section id="analysis" className="py-24 relative z-10 bg-slate-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
               <span className="text-violet-600 font-bold tracking-wider uppercase text-sm bg-violet-100 px-3 py-1 rounded-full">System Intelligence</span>
               <h2 className="text-4xl font-extrabold text-slate-900 mt-4 mb-4">What We Analyze</h2>
               <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                 OK BOZ goes beyond simple data entry. Our platform continuously analyzes three core pillars of your business to drive growth.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {/* Card 1 */}
               <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 relative z-10">
                     <BarChart3 className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Operational Efficiency</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">
                     We track staff attendance patterns, task completion rates, and field movement heatmaps to identify bottlenecks and optimize workforce allocation.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500"/> Real-time Location Heatmaps</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500"/> Productivity Scoring</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-500"/> Shift Utilization Rates</li>
                  </ul>
               </div>

               {/* Card 2 */}
               <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 mb-6 relative z-10">
                     <PieChart className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Financial Health</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">
                     Our engine audits every expense, payroll disbursement, and revenue stream. We analyze profit margins per franchise and forecast future cash flow.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-violet-500"/> Automated P&L Reports</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-violet-500"/> Expense Anomaly Detection</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-violet-500"/> Revenue Forecasting</li>
                  </ul>
               </div>

               {/* Card 3 */}
               <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-50 rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-fuchsia-100 rounded-2xl flex items-center justify-center text-fuchsia-600 mb-6 relative z-10">
                     <Activity className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Client Retention</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">
                     Using CRM data, we analyze lead conversion rates and customer interaction history to help you retain high-value clients and recover lost leads.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-600">
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-fuchsia-500"/> Lead Conversion Funnels</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-fuchsia-500"/> Churn Prediction</li>
                     <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-fuchsia-500"/> Engagement Metrics</li>
                  </ul>
               </div>
            </div>
         </div>
      </section>

      {/* Feature Section 1: Dashboard */}
      <section id="features" className="py-24 relative z-10 overflow-hidden">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-20">
               <div className="lg:w-1/2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider mb-6">
                     <Layout className="w-4 h-4" /> Central Command
                  </div>
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-6">One Dashboard to Rule Them All.</h2>
                  <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                     Navigate your entire business from a single, intuitive interface. Whether you manage one branch or fifty, get a bird's-eye view of attendance, tasks, and finances instantly.
                  </p>
                  <button className="text-violet-600 font-bold flex items-center gap-2 hover:text-violet-800 transition-colors group text-lg">
                     View Interactive Demo <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
               <div className="lg:w-1/2 relative group">
                  <div className="absolute inset-0 bg-violet-500/20 blur-[80px] rounded-full group-hover:bg-violet-500/30 transition-colors duration-500"></div>
                  <img 
                     src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1600&q=80" 
                     alt="Admin Dashboard" 
                     className="relative rounded-3xl shadow-2xl border-4 border-white/50 z-10 hover:scale-[1.02] transition-transform duration-500"
                  />
               </div>
            </div>
         </div>
      </section>

      {/* Feature Section 2: Mobile */}
      <section className="py-24 relative z-10 bg-white">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-20">
               <div className="lg:w-1/2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-fuchsia-100 text-fuchsia-700 text-xs font-bold uppercase tracking-wider mb-6">
                     <MapPin className="w-4 h-4" /> GPS Tracking
                  </div>
                  <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Field Force Tracking in Your Pocket.</h2>
                  <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                     Empower your on-ground team with our mobile-friendly interface. Geofenced attendance ensures staff are where they need to be, when they need to be there.
                  </p>
                  <button className="text-fuchsia-600 font-bold flex items-center gap-2 hover:text-fuchsia-800 transition-colors group text-lg">
                     Explore Mobile Features <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
               </div>
               <div className="lg:w-1/2 relative group">
                  <div className="absolute inset-0 bg-fuchsia-500/20 blur-[80px] rounded-full group-hover:bg-fuchsia-500/30 transition-colors duration-500"></div>
                  <img 
                     src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1600&q=80" 
                     alt="Mobile Tracking" 
                     className="relative rounded-3xl shadow-2xl border-4 border-white/50 z-10 hover:scale-[1.02] transition-transform duration-500"
                  />
               </div>
            </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 relative z-10 bg-slate-50">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Simple, Transparent Pricing</h2>
               <p className="text-slate-500 text-lg">Choose the plan that fits your growth stage. No hidden fees.</p>
               
               <div className="flex justify-center items-center gap-4 mt-8">
                  <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
                  <button 
                     onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                     className="w-14 h-8 bg-slate-200 rounded-full relative transition-colors"
                  >
                     <div className={`absolute top-1 w-6 h-6 bg-violet-600 rounded-full transition-transform shadow-sm ${billingCycle === 'yearly' ? 'left-7' : 'left-1'}`}></div>
                  </button>
                  <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                     Yearly <span className="text-emerald-500 text-xs ml-1 font-extrabold">(SAVE 20%)</span>
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
               {plans.map((plan, idx) => (
                  <div key={idx} className={`relative p-8 flex flex-col rounded-3xl transition-all duration-300 ${
                      plan.highlight 
                      ? 'bg-white border-2 border-violet-500 shadow-2xl shadow-violet-200 scale-105 z-10' 
                      : 'bg-white border border-slate-200 hover:shadow-xl'
                  }`}>
                     {plan.highlight && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-violet-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-md tracking-wide uppercase">
                           Most Popular
                        </div>
                     )}
                     
                     <div className="mb-6">
                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                        <p className="text-slate-500 text-sm mt-2 min-h-[40px]">{plan.description}</p>
                     </div>

                     <div className="flex items-baseline gap-1 mb-8">
                        <span className="text-4xl font-extrabold text-slate-900">₹{plan.price}</span>
                        <span className="text-slate-400 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                     </div>

                     <div className="space-y-4 flex-1 mb-8">
                        {plan.features.map((feat, i) => (
                           <div key={i} className="flex items-start gap-3 text-sm text-slate-600">
                              <div className={`mt-0.5 p-0.5 rounded-full ${plan.highlight ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                                  <CheckCircle className="w-4 h-4" />
                              </div>
                              <span>{feat}</span>
                           </div>
                        ))}
                     </div>

                     <button 
                        onClick={() => navigate('/login')}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-md ${
                           plan.highlight 
                              ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                     >
                        {plan.buttonText}
                     </button>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
         <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-violet-700 to-fuchsia-700 rounded-[3rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-violet-900/30">
               {/* Decorative Circles */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
               
               <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Ready to scale your franchise?</h2>
                  <p className="text-violet-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-medium">Join thousands of forward-thinking businesses optimizing their operations with OK BOZ.</p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-white text-violet-800 hover:bg-slate-50 px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 flex items-center gap-2 mx-auto"
                  >
                    Start Your Free Trial <Rocket className="w-5 h-5" />
                  </button>
                  <p className="mt-6 text-sm text-violet-200 opacity-90">No credit card required • 14-day free trial</p>
               </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-20 pb-10 relative z-10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
               <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">
                        <Hexagon className="w-5 h-5" />
                     </div>
                     <span className="text-xl font-bold text-slate-900">OK BOZ</span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    Empowering businesses with intelligent staff management and automated operations.
                  </p>
               </div>
               
               <div>
                  <h4 className="text-slate-900 font-bold mb-6">Product</h4>
                  <ul className="space-y-4 text-sm text-slate-500">
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Features</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Pricing</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Integrations</a></li>
                  </ul>
               </div>
               
               <div>
                  <h4 className="text-slate-900 font-bold mb-6">Company</h4>
                  <ul className="space-y-4 text-sm text-slate-500">
                     <li><a href="#" className="hover:text-violet-600 transition-colors">About Us</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Careers</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Contact</a></li>
                  </ul>
               </div>
               
               <div>
                  <h4 className="text-slate-900 font-bold mb-6">Legal</h4>
                  <ul className="space-y-4 text-sm text-slate-500">
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Privacy Policy</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Terms of Service</a></li>
                     <li><a href="#" className="hover:text-violet-600 transition-colors">Security</a></li>
                  </ul>
               </div>
            </div>
            
            <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
               <p>&copy; 2025 OK BOZ Inc. All rights reserved.</p>
               <div className="flex gap-6">
                  <a href="#" className="hover:text-violet-600 transition-colors">Twitter</a>
                  <a href="#" className="hover:text-violet-600 transition-colors">LinkedIn</a>
                  <a href="#" className="hover:text-violet-600 transition-colors">Instagram</a>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
