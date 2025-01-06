import React, { useState } from 'react';
import './App.css';
import ComponentMounter from './components/ComponentMounter';

function App() {
  const [currentModulo, setCurrentModulo] = useState(0);
  const [gainVector, setGainVector] = useState([]);
  const [proccessedImages, setProccesedImages] = useState([]);

  const modulos = [
    {
      title: "Módulo Antena",
      content: "Patrón de ganancia de antena para la obtención de las perdidas por apuntamiento",//"Explicación del modelo de antenas utilizado y gráficos visuales.",
      componentName: "AntenaCalculator"
    },
    {
      title: "Módulo Parámetros Entrada",
      content: "Visualización y extracción de la información geográfica del área de cobertura con mapas interactivo y configuración de parámetro de la red.",
      componentName: "NetworkSimultionForm"
    },
    {
      title: "Módulo Análisis de Cobertura",
      content: "Resultados generales y simulación de cobertura con mapa de calor.",
      componentName: "GISMap"
    }
  ];

  const features = [
    {
      title: "Modelos de Propagación",
      description: (
        <>
          Implementación estándar de los modelos {' '}
          <a
            href="https://www.etsi.org/deliver/etsi_tr/138900_138999/138901/16.01.00_60/tr_138901v160100p.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            3GPP TR 38.901
          </a>
          {' '}para el escenario UMi (Urban micro) y UMa (Urban macro) de propagación en redes 5G en la banda RF2.
        </>
      )
    },
    {
      title: "Mapeo GIS",
      description: "Integración de la información geográfica para una cobertura precisa."
    },
    {
      title: "Análisis de Cobertura",
      description: "Analiza la efectividad y rendimiento de la red 5G en la banda RF2 en diversas condiciones."
    }
  ];

  const team = [
    {
      name: "Ana Daniela Ramírez-Hernández",
      role: "Creadora",
      email: "aramirezh1606@alumno.ipn.mx",
      description: "En proceso de obtener el título de Ingeniera en Telemática por la UPIITA-IPN, México, en 2024. Entre sus intereses está la evaluación del desempeño y la planeación de redes celulares, antenas, procesamiento de imágenes y programación.",
      image: require("./images/ana.jpg")
    },
    {
      name: "Noé Torres-Cruz",
      role: "Asesor",
      email: "ntorresc@ipn.mx",
      description: "Obtuvo su título de Ingeniero Electrónico en el Instituto Tecnológico de Oaxaca, México, en 2002. Posteriormente, obtuvo el grado de Maestro en Ciencias en Ingeniería Eléctrica por el CINVESTAV-IPN, México, en 2006 y el de Doctor en Ciencias de la Computación por el CIC, IPN, México, en 2019. Actualmente, es profesor en la Unidad Profesional Interdisciplinaria en Ingeniería y Tecnologías Avanzadas del IPN (UPIITA-IPN, México). Sus intereses de investigación incluyen el análisis de servicios de Video bajo Demanda (VoD) y la gestión de recursos en redes de Quinta Generación (5G).",
      image: require("./images/noe.png")
    }
  ];

  const socialLinks = [
    { name: 'Twitter', url: 'https://twitter.com' },
    { name: 'LinkedIn', url: 'https://linkedin.com' },
    { name: 'GitHub', url: 'https://github.com' }
  ];

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Modelos', href: '#modelos' },
    { name: 'About Us', href: '#about' },
    { name: 'Contacto', href: '#contacto' }
  ];

  const cambiarModulo = (increment) => {
    setCurrentModulo((prevModulo) => {
      let newModulo = prevModulo + increment;
      if (newModulo < 0) {
        newModulo = modulos.length - 1;
      } else if (newModulo >= modulos.length) {
        newModulo = 0;
      }
      return newModulo;
    });
  };

  return (
    <div className="App">
      <header className="header">
        <div className="logo">SCSC5MPFR2</div>
        <nav className="nav">
          <ul>
            {navLinks.map((link, index) => (
              <li key={index}>
                <a href={link.href}>{link.name}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section id="home" className="hero">
        <div className="hero-content">
          <h1>Simulador de Cobertura de Sistemas Celulares 5G</h1>
          <p>Explora la cobertura y el rendimiento de redes 5G para la banda RF2 mediante los modelos de propagación Umi y Uma.</p>
          <a href="#modelos" className="btn-cta">Empezar Simulación</a>
        </div>
      </section>

      <section className="features">
        {features.map((feature, index) => (
          <div key={index} className="feature">
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </section>

      <section id="modelos" className="modelos">
        <div className="modelos-nav">
          <div></div>
          {/* <button onClick={() => cambiarModulo(-1)}>◀</button> */}
          <div className="modulo-content">
            <div className="modulo">
              <h2>{modulos[currentModulo].title}</h2>
              <p>{modulos[currentModulo].content}</p>
              {
                modulos[currentModulo] ?
                  modulos[currentModulo].componentName ?
                    <ComponentMounter setGainVector={setGainVector} gainVector={gainVector} name={modulos[currentModulo].componentName} setProccesedImages={setProccesedImages} proccessedImages={proccessedImages} />
                    : null
                  : null
              }
            </div>
          </div>
          <button onClick={() => cambiarModulo(1)}>▶</button>
        </div>
      </section>

      <section id="about" className="about-us">
        <h2>About Us</h2>
        <div className="equipo">
          {team.map((member, index) => (
            <div key={index} className="miembro">
              <img src={member.image} alt={member.name} />
              <h3>{member.name}</h3>
              <p className="rol"><strong>{member.role}</strong></p>
              <p className="email">{member.email}</p>
              <p>{member.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            {navLinks.map((link, index) => (
              <a key={index} href={link.href}>{link.name}</a>
            ))}
          </div>
          <div className="social">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.name}
              </a>
            ))}
          </div>
          <p>© 2024 SCSC5MPFR2. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;