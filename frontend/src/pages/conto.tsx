import { useState } from 'react';
import '../styles/Dashboard.css';
import {
  LayoutGrid,
  CreditCard,
  Building2,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  MoreHorizontal,
} from 'lucide-react';

const Dashboard = () => {
  const [user] = useState({
    name: 'Nome Cognome',
    role: 'Responsabile territoriale',
    company: 'RGM s.r.l.',
  });

  const [activeMenuItem, setActiveMenuItem] = useState('Dashboard');

  const menuItems = [
    { name: 'Dashboard', icon: LayoutGrid },
    { name: 'Pagamenti', icon: CreditCard },
    { name: 'Aziende', icon: Building2, submenu: ['Anagrafiche', '+ Aggiungi'] },
    { name: 'Consulenti', icon: Users, submenu: ['Anagrafiche', '+ Aggiungi'] },
    { name: 'Servizi', icon: Settings },
    { name: 'Ticket', icon: HelpCircle },
    { name: 'Log Out', icon: LogOut },
  ];

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">F.I.A.COM</div>
        <nav className="menu">
          {menuItems.map((item, index) => (
            <div key={index}>
              <div
                className={`menu-item ${activeMenuItem === item.name ? 'active' : ''}`}
                onClick={() => setActiveMenuItem(item.name)}
              >
                <item.icon size={18} className="menu-icon" />
                {item.name}
              </div>
              {item.submenu && (
                <div className="submenu">
                  {item.submenu.map((subItem, subIndex) => (
                    <div key={subIndex} className="submenu-item">
                      {subItem}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1 className="welcome-title">Bentornato, {user.name}</h1>
            <p className="welcome-subtitle">
              Dai un'occhiata alla tua situazione provviggionale di oggi
            </p>
          </div>
          <div className="user-info">
            <div className="user-header">
              <span className="user-company">{user.company}</span>
              <div className="user-icon">
                <Users size={20} />
              </div>
            </div>
            <span className="user-role">{user.role}</span>
          </div>
        </header>

        {/* Dashboard Cards */}
        <section className="cards-grid">
          {[
            {
              title: 'Aziende acquisite',
              amount: '€ 2407,02',
              cedolini: '770',
              countLabel: 'n° Aziende',
              count: '35',
              items: ['Azienda 1', 'Azienda 2', 'Azienda 3'],
              buttonLabel: 'Anagrafiche aziende',
              icon: <Building2 size={16} />,
            },
            {
              title: 'Sportello lavoro',
              amount: '€ 5.626,80',
              cedolini: '3600',
              countLabel: 'n° consulenti',
              count: '60',
              extraCountLabel: 'n° Aziende',
              extraCount: '103',
              items: ['Consulente 1', 'Consulente 2', 'Consulente 3'],
              buttonLabel: 'Anagrafiche consulenti',
              icon: <Users size={16} />,
            },
            {
              title: 'Competenze totali',
              amount: '€ 8033,82',
              cedolini: '4370',
              countLabel: 'Totale aziende',
              count: '138',
              items: ['Consulente 1', 'Consulente 2', 'Consulente 3'],
              buttonLabel: 'Estratto conto',
              icon: <CreditCard size={16} />,
            },
          ].map((card, idx) => (
            <div className="card" key={idx}>
              <div className="card-header">
                <h3 className="card-title">{card.title}</h3>
                <MoreHorizontal size={20} color="#6c757d" />
              </div>
              <div className="card-highlight">
                <div className="highlight-section">
                  <div className="highlight-label">Competenze maturate</div>
                  <div className="highlight-value">{card.amount}</div>
                </div>
                <div className="highlight-section">
                  <div className="highlight-label">Numero cedolini</div>
                  <div className="highlight-value">{card.cedolini}</div>
                </div>
              </div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">{card.countLabel}</span>
                  <span className="card-count">{card.count}</span>
                </div>
                {card.extraCountLabel && (
                  <div className="card-row">
                    <span className="card-label">{card.extraCountLabel}</span>
                    <span className="card-count">{card.extraCount}</span>
                  </div>
                )}
                <div className="card-items">
                  {card.items.map((item, i) => (
                    <div key={i} className="card-item-link">
                      {item}
                    </div>
                  ))}
                </div>
                <button className="card-button">
                  {card.icon}
                  {card.buttonLabel}
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
