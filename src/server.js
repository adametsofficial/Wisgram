const http = require('http');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const bluebird = require('bluebird');
const helmet = require('helmet');
const lusca = require('lusca');
const mongoose = require('mongoose');
const config = require('config');
const cluster = require('cluster');

const { cpus } = require('os');
const { luscaConfig, corsOptions } = './utils/functions/config';

// routes
const authRouter = require('./routes/api/v1/auth');
const userRouter = require('./router/api/v1/user');

// providers
const ioProvider = require('./providers/io.provider');

// add bluebird like Promise
mongoose.Promise = bluebird;

const PORT = config.get('PORT') || 4001;
const numCPUs = cpus().length;

// initialize express and http
const app = express();
const httpServer = http.Server(app);
const _io = io(httpServer);

// load modules
app.use(compression());
app.use(helmet());
app.use(lusca(luscaConfig));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// add static path
app.use(express.static(path.join(__dirname, 'static')));

// APIs routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);

// function work with multithreads
function startServer() {
  if (cluster.isMaster) {
    fnMaster();
  } else if (cluster.isWorker) {
    childProcess();
  }
}

function fnMaster() {
  console.log(`Master ${process.pid} is running`);

  for (let i = 0; i < numCPUs; i++) {
    console.log(`Forking process number ${i}...`);

    cluster.fork();
  }

  cluster.on('exit', worker => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Forking a new process...');

    cluster.fork();
  });
}

async function childProcess() {
  // TODO: connect to database's
  console.log(`Worker ${process.pid} started...`);

  ioProvider(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Server has been started on port: ${PORT} `);
  });
}

startServer();
