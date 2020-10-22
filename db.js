const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
let isConnected;

module.exports = connectToDatabase = () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return Promise.resolve();
  }

  console.log('=> using new database connection');
  let DB_URL = process.env['DB_URL'];
  console.log('DB_URL:: ', DB_URL);
  return mongoose.connect(DB_URL)
    .then(db => { 
      isConnected = db.connections[0].readyState;
    });
};