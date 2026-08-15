import React from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users, Award, Globe, Target, Heart } from "lucide-react";
import { useNotification } from "../contexts/NotificationContext";
import "./About.css";

const About = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const handleProtectedNavigation = (e, path) => {
    e.preventDefault();
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      addNotification('Authentication Required', 'Please sign in first', 'error');
    } else {
      navigate(path);
    }
  };
  const features = [
    {
      icon: <TrendingUp size={48} />,
      title: "Advanced Analytics",
      description:
        "Sophisticated algorithms analyze market trends and provide actionable insights for your investment decisions.",
    },
    {
      icon: <Users size={48} />,
      title: "Expert Team",
      description:
        "Our team of financial experts and data scientists work around the clock to deliver accurate market intelligence.",
    },
    {
      icon: <Award size={48} />,
      title: "Proven Results",
      description:
        "Track record of helping investors make informed decisions with data-driven recommendations.",
    },
    {
      icon: <Globe size={48} />,
      title: "Global Markets",
      description:
        "Access to major stock exchanges worldwide, providing comprehensive market coverage.",
    },
    {
      icon: <Target size={48} />,
      title: "Precision Focus",
      description:
        "Laser-focused analysis that cuts through market noise to identify real opportunities.",
    },
    {
      icon: <Heart size={48} />,
      title: "User-Centric",
      description:
        "Built with investors in mind, our platform prioritizes usability and actionable insights.",
    },
  ];

  const teamMembers = [
    {
      name: "Purusharth Mittal",
      role: "Developer",
    },
    {
      name: "Vibhor Dhiman",
      role: "Developer",
    },
    {
      name: "Vansh Vashisth",
      role: "Developer",
    },
    {
      name: "Pranav Goyal",
      role: "Developer",
    },
  ];

  return (
    <div className="about-page">
      <div className="container">
        {/* Hero Section */}
        <section className="about-hero">
          <h1>About MarketLens</h1>
          <p className="hero-subtitle">
            Empowering investors with intelligent stock analysis and data-driven
            insights to make confident financial decisions in today's complex
            markets.
          </p>
        </section>

        {/* Mission Section */}
        <section className="mission-section">
          <div className="mission-content">
            <div className="mission-text">
              <h2>Our Mission</h2>
              <p>
                At MarketLens, we believe that everyone deserves access to
                professional-grade investment tools and insights. Our mission is
                to democratize financial analysis by providing sophisticated yet
                user-friendly tools that help both novice and experienced
                investors make informed decisions.
              </p>
              <p>
                We combine cutting-edge technology with deep financial expertise
                to deliver real-time market intelligence, comprehensive stock
                analysis, and portfolio management tools that give you a
                competitive edge in the markets.
              </p>
            </div>
            <div className="mission-stats">
              <div className="stat-item">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">1M+</span>
                <span className="stat-label">Analyses Generated</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <h2>What Sets Us Apart</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team Section */}
        <section className="team-section">
          <h2>Meet Our Team</h2>
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div
                key={index}
                className="team-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="member-avatar">
                  <span>
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <h3>{member.name}</h3>
                <h4>{member.role}</h4>
              </div>
            ))}
          </div>
        </section>

        {/* Values Section */}
        <section className="values-section">
          <h2>Our Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <h3>Transparency</h3>
              <p>
                We believe in complete transparency in our methodologies, data
                sources, and analysis processes. No black boxes, just clear,
                understandable insights.
              </p>
            </div>
            <div className="value-card">
              <h3>Accuracy</h3>
              <p>
                Our commitment to accuracy drives everything we do. We
                continuously validate our models and update our algorithms to
                ensure reliable results.
              </p>
            </div>
            <div className="value-card">
              <h3>Innovation</h3>
              <p>
                We're constantly pushing the boundaries of financial technology,
                incorporating the latest advances in AI and machine learning.
              </p>
            </div>
            <div className="value-card">
              <h3>Accessibility</h3>
              <p>
                Complex financial analysis shouldn't be limited to Wall Street.
                We make sophisticated tools accessible to all investors.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Transform Your Investment Strategy?</h2>
            <p>
              Join thousands of investors who trust MarketLens for their
              today.
            </p>
            <div className="cta-buttons">
              <a href="/analyzer" className="btn btn-primary" onClick={(e) => handleProtectedNavigation(e, '/analyzer')}>
                Start Analyzing
              </a>
              <a href="/portfolio" className="btn btn-secondary" onClick={(e) => handleProtectedNavigation(e, '/portfolio')}>
                View Portfolio Tools
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
