const parse = require('pg-connection-string').parse;

module.exports = ({ env }) => {

  if(env('NODE_ENV') === 'production'){
    const config = parse(process.env.DATABASE_URL);
    const config_chainsaw = parse(process.env.DATABASE_URL_CHAINSAW);
    return {
      defaultConnection: 'default',
      connections: {
        default: {
          connector: 'bookshelf',
          settings: {
            client: 'postgres',
            host: config.host,
            port: config.port,
            database: config.database,
            username: config.user,
            password: config.password,
            ssl: {
              rejectUnauthorized: false
            }
          },
          options: {
            ssl: true,
            rejectUnauthorized: false
          },
        },
        chainsaw: {
          connector: 'bookshelf',
          settings: {
            client: 'postgres',
            host: config_chainsaw.host,
            port: config_chainsaw.port,
            database: config_chainsaw.database,
            username: config_chainsaw.user,
            password: config_chainsaw.password,
            ssl: {
              rejectUnauthorized: false
            }
          },
          options: {
            ssl: true,
            rejectUnauthorized: false
          },
        },
      },
    }
  }
  
  return {
    defaultConnection: 'default',
    connections: {
      default: {
        connector: 'bookshelf',
        settings: {
          client: 'sqlite',
          filename: env('DATABASE_FILENAME', '.tmp/data.db'),
        },
        options: {
          useNullAsDefault: true,
        },
      },
      chainsaw: {
        connector: 'bookshelf',
        settings: {
          client: 'sqlite',
          filename: env('DATABASE_FILENAME', '.tmp/chainsaw_data.db'),
        },
        options: {
          useNullAsDefault: true,
        },
      }
    },
  }
};
