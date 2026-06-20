const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('../../config');
const Logger = require('../utils/logger');

const app = express();

function init(client) {
  // Expose Discord Client to request handlers
  app.locals.client = client;

  // Configure Templating Engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware Setup
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Session configuration
  app.use(session({
    secret: config.dashboard.secret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
  }));

  // Add global variables to templates
  app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.config = config;
    next();
  });

  // Mount Dashboard Routes
  const dashboardRoutes = require('./routes/index');
  app.use('/', dashboardRoutes);

  // Start Listener
  const PORT = config.dashboard.port || 3000;
  app.listen(PORT, () => {
    Logger.system(`Web dashboard server started listening on port ${PORT}`);
  });
}

module.exports = { init };
